import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';

type Context = { params: Promise<{ commentId: string }> };

export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Voting is temporarily unavailable.' }, { status: 503 });
  const { commentId } = await params;
  const [comment] = await db.select({ id: schema.comments.id, status: schema.comments.status }).from(schema.comments).where(eq(schema.comments.id, commentId)).limit(1);
  if (!comment || comment.status !== 'published') return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
  const [existing] = await db.select({ id: schema.commentVotes.id }).from(schema.commentVotes)
    .where(and(eq(schema.commentVotes.commentId, commentId), eq(schema.commentVotes.userId, auth.user.id))).limit(1);
  if (existing) {
    await db.delete(schema.commentVotes).where(eq(schema.commentVotes.id, existing.id));
    return NextResponse.json({ success: true, hasVoted: false });
  }
  await db.insert(schema.commentVotes).values({ id: `vote_${crypto.randomUUID()}`, commentId, userId: auth.user.id });
  return NextResponse.json({ success: true, hasVoted: true });
}
