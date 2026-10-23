import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Moderation requires the persistent database.' }, { status: 503 });
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const conditions = status === 'hidden' || status === 'published' ? [eq(schema.comments.status, status)] : [];
    const rows = await db.select({
      id: schema.comments.id,
      content: schema.comments.content,
      status: schema.comments.status,
      createdAt: schema.comments.createdAt,
      author: schema.users.displayName,
      authorRole: schema.users.role,
      bookTitle: schema.books.title,
      bookSlug: schema.books.slug,
      chapterTitle: schema.chapters.title,
      chapterSlug: schema.chapters.slug,
      reportCount: sql<number>`(select count(*)::int from comment_reports where comment_id = ${schema.comments.id} and status = 'open')`,
      reports: sql<Array<{reason:string; details:string|null; status:string}>>`coalesce((select json_agg(json_build_object('reason', cr.reason, 'details', cr.details, 'status', cr.status)) from comment_reports cr where cr.comment_id = ${schema.comments.id}), '[]'::json)`,
    }).from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .innerJoin(schema.books, eq(schema.comments.bookId, schema.books.id))
      .innerJoin(schema.chapters, eq(schema.comments.chapterId, schema.chapters.id))
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(schema.comments.createdAt)).limit(100);
    return NextResponse.json({ comments: rows.map((row) => ({ ...row, author: row.authorRole === 'admin' ? 'Slayer' : row.author, authorIsAdmin: row.authorRole === 'admin', createdAt: row.createdAt.toISOString(), reportCount: Number(row.reportCount) })) });
  } catch (error) {
    console.error('Admin comment moderation list failed:', error);
    return NextResponse.json({ error: 'Could not load moderation queue.' }, { status: 500 });
  }
}
