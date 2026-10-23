import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Review moderation requires the persistent database.' }, { status: 503 });

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const rows = await db.select({
      id: schema.bookReviews.id,
      rating: schema.bookReviews.rating,
      title: schema.bookReviews.title,
      content: schema.bookReviews.content,
      status: schema.bookReviews.status,
      createdAt: schema.bookReviews.createdAt,
      updatedAt: schema.bookReviews.updatedAt,
      author: schema.users.displayName,
      authorRole: schema.users.role,
      bookTitle: schema.books.title,
      bookSlug: schema.books.slug,
    }).from(schema.bookReviews)
      .innerJoin(schema.users, eq(schema.bookReviews.userId, schema.users.id))
      .innerJoin(schema.books, eq(schema.bookReviews.bookId, schema.books.id))
      .where(status === 'published' || status === 'hidden' ? eq(schema.bookReviews.status, status) : undefined)
      .orderBy(desc(schema.bookReviews.createdAt))
      .limit(100);
    return NextResponse.json({
      reviews: rows.map((row) => ({
        ...row,
        author: row.authorRole === 'admin' ? 'Slayer' : row.author,
        authorIsAdmin: row.authorRole === 'admin',
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Admin review moderation list failed:', error);
    return NextResponse.json({ error: 'Could not load review moderation queue.' }, { status: 500 });
  }
}
