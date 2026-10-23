import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';

type Context = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Reporting is temporarily unavailable.' }, { status: 503 });
  const { commentId } = await params;
  const body = await request.json().catch(() => null) as { reason?: unknown; details?: unknown } | null;
  const allowed = ['spam', 'harassment', 'hate', 'misinformation', 'other'];
  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const details = typeof body?.details === 'string' ? body.details.trim().slice(0, 500) : null;
  if (!allowed.includes(reason)) return NextResponse.json({ error: 'Choose a valid report reason.' }, { status: 400 });
  const [comment] = await db.select({ id: schema.comments.id, userId: schema.comments.userId, status: schema.comments.status })
    .from(schema.comments).where(eq(schema.comments.id, commentId)).limit(1);
  if (!comment || comment.status !== 'published') return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
  if (comment.userId === auth.user.id) return NextResponse.json({ error: 'You cannot report your own comment.' }, { status: 400 });
  const [existing] = await db.select({ id: schema.commentReports.id }).from(schema.commentReports)
    .where(and(eq(schema.commentReports.commentId, commentId), eq(schema.commentReports.userId, auth.user.id))).limit(1);
  if (existing) return NextResponse.json({ error: 'You have already reported this comment.' }, { status: 409 });
  await db.insert(schema.commentReports).values({
    id: `report_${crypto.randomUUID()}`, commentId, userId: auth.user.id, reason, details, status: 'open',
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
