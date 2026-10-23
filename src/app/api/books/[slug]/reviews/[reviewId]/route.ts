import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';

type RouteContext = { params: Promise<{ slug: string; reviewId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Reviews are temporarily unavailable.' }, { status: 503 });

  try {
    const { slug, reviewId } = await params;
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    if (auth.user.role !== 'admin' || !['published', 'hidden'].includes(String(body?.status))) {
      return NextResponse.json({ error: 'Only administrators can moderate review visibility.' }, { status: 403 });
    }

    const [book] = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    const result = await db.update(schema.bookReviews)
      .set({ status: body?.status as 'published' | 'hidden', updatedAt: new Date() })
      .where(and(eq(schema.bookReviews.id, reviewId), eq(schema.bookReviews.bookId, book.id)))
      .returning({ id: schema.bookReviews.id });
    if (!result.length) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    return NextResponse.json({ success: true, status: body?.status });
  } catch (error) {
    console.error('Moderate book review failed:', error);
    return NextResponse.json({ error: 'Could not moderate review.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Reviews are temporarily unavailable.' }, { status: 503 });

  try {
    const { slug, reviewId } = await params;
    const [book] = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const condition = and(
      eq(schema.bookReviews.id, reviewId),
      eq(schema.bookReviews.bookId, book.id),
      ...(auth.user.role === 'admin' ? [] : [eq(schema.bookReviews.userId, auth.user.id)])
    );
    const result = await db.delete(schema.bookReviews).where(condition).returning({ id: schema.bookReviews.id });
    if (!result.length) return NextResponse.json({ error: 'Review not found or you do not have permission to delete it.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete book review failed:', error);
    return NextResponse.json({ error: 'Could not delete review.' }, { status: 500 });
  }
}
