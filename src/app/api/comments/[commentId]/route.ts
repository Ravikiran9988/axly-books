import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser, requireAuth } from '@/lib/auth';

type Context = { params: Promise<{ commentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Comments are temporarily unavailable.' }, { status: 503 });
  const { commentId } = await params;
  const body = await request.json().catch(() => null) as { content?: unknown; status?: unknown } | null;
  const [comment] = await db.select().from(schema.comments).where(eq(schema.comments.id, commentId)).limit(1);
  if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });

  if (body?.status === 'hidden' || body?.status === 'published') {
    if (auth.user.role !== 'admin') return NextResponse.json({ error: 'Administrator access is required to moderate comments.' }, { status: 403 });
    await db.update(schema.comments).set({ status: body.status, updatedAt: new Date() }).where(eq(schema.comments.id, commentId));
    if (body.status === 'hidden') {
      await db.update(schema.commentReports).set({ status: 'reviewed' }).where(and(eq(schema.commentReports.commentId, commentId), eq(schema.commentReports.status, 'open')));
    }
    return NextResponse.json({ success: true, status: body.status });
  }

  if (comment.userId !== auth.user.id && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'You can edit only your own comments.' }, { status: 403 });
  }
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (content.length < 2 || content.length > 2000) {
    return NextResponse.json({ error: 'Comment must be between 2 and 2,000 characters.' }, { status: 400 });
  }
  await db.update(schema.comments).set({ content, updatedAt: new Date() }).where(eq(schema.comments.id, commentId));
  return NextResponse.json({ success: true, content });
}

export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Comments are temporarily unavailable.' }, { status: 503 });
  const { commentId } = await params;
  const [comment] = await db.select({ id: schema.comments.id, userId: schema.comments.userId })
    .from(schema.comments).where(eq(schema.comments.id, commentId)).limit(1);
  if (!comment) return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
  if (comment.userId !== auth.user.id && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'You can delete only your own comments.' }, { status: 403 });
  }
  await db.delete(schema.comments).where(eq(schema.comments.id, commentId));
  return NextResponse.json({ success: true });
}
