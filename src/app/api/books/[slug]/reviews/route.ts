import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser, requireAuth } from '@/lib/auth';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'Reviews are temporarily unavailable.' }, { status: 503 });
  }

  try {
    const { slug } = await params;
    const [book] = await db.select({ id: schema.books.id, isPublished: schema.books.isPublished })
      .from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book?.isPublished) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const url = new URL(request.url);
    const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '10', 10) || 10));
    const currentUser = await getCurrentUser(request);

    const [summaryRows, rows, ownRows] = await Promise.all([
      db.select({
        averageRating: sql<number>`coalesce(round(avg(rating)::numeric, 1), 0)::float`,
        reviewCount: sql<number>`count(*)::int`,
        fiveStar: sql<number>`count(*) filter (where rating = 5)::int`,
        fourStar: sql<number>`count(*) filter (where rating = 4)::int`,
        threeStar: sql<number>`count(*) filter (where rating = 3)::int`,
        twoStar: sql<number>`count(*) filter (where rating = 2)::int`,
        oneStar: sql<number>`count(*) filter (where rating = 1)::int`,
      }).from(schema.bookReviews).where(and(eq(schema.bookReviews.bookId, book.id), eq(schema.bookReviews.status, 'published'))),
      db.select({
        id: schema.bookReviews.id,
        rating: schema.bookReviews.rating,
        title: schema.bookReviews.title,
        content: schema.bookReviews.content,
        createdAt: schema.bookReviews.createdAt,
        updatedAt: schema.bookReviews.updatedAt,
        userId: schema.users.id,
        displayName: schema.users.displayName,
        role: schema.users.role,
      }).from(schema.bookReviews)
        .innerJoin(schema.users, eq(schema.bookReviews.userId, schema.users.id))
        .where(and(eq(schema.bookReviews.bookId, book.id), eq(schema.bookReviews.status, 'published')))
        .orderBy(desc(schema.bookReviews.createdAt))
        .limit(limit + 1).offset(offset),
      currentUser
        ? db.select({
            id: schema.bookReviews.id,
            rating: schema.bookReviews.rating,
            title: schema.bookReviews.title,
            content: schema.bookReviews.content,
            updatedAt: schema.bookReviews.updatedAt,
          }).from(schema.bookReviews)
            .where(and(eq(schema.bookReviews.bookId, book.id), eq(schema.bookReviews.userId, currentUser.id)))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const page = rows.slice(0, limit);
    return NextResponse.json({
      summary: {
        averageRating: Number(summaryRows[0]?.averageRating ?? 0),
        reviewCount: Number(summaryRows[0]?.reviewCount ?? 0),
        distribution: {
          1: Number(summaryRows[0]?.oneStar ?? 0),
          2: Number(summaryRows[0]?.twoStar ?? 0),
          3: Number(summaryRows[0]?.threeStar ?? 0),
          4: Number(summaryRows[0]?.fourStar ?? 0),
          5: Number(summaryRows[0]?.fiveStar ?? 0),
        },
      },
      reviews: page.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        user: { id: row.userId, displayName: row.role === 'admin' ? 'Slayer' : row.displayName, isAuthor: row.role === 'admin' },
        canEdit: currentUser?.id === row.userId,
      })),
      myReview: ownRows[0] ? {
        id: ownRows[0].id,
        rating: ownRows[0].rating,
        title: ownRows[0].title,
        content: ownRows[0].content,
        updatedAt: ownRows[0].updatedAt.toISOString(),
      } : null,
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  } catch (error) {
    console.error('List book reviews failed:', error);
    return NextResponse.json({ error: 'Could not load book reviews.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Reviews are temporarily unavailable.' }, { status: 503 });

  try {
    const { slug } = await params;
    const body = await request.json().catch(() => null) as { rating?: unknown; title?: unknown; content?: unknown } | null;
    const rating = Number(body?.rating);
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Choose a rating from 1 to 5 stars.' }, { status: 400 });
    }
    if (title.length > 120) return NextResponse.json({ error: 'Review title must be 120 characters or fewer.' }, { status: 400 });
    if (content.length < 10 || content.length > 2000) {
      return NextResponse.json({ error: 'Review must be between 10 and 2,000 characters.' }, { status: 400 });
    }

    const [book] = await db.select({ id: schema.books.id, isPublished: schema.books.isPublished })
      .from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book?.isPublished) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const [existing] = await db.select({ id: schema.bookReviews.id, status: schema.bookReviews.status })
      .from(schema.bookReviews)
      .where(and(eq(schema.bookReviews.bookId, book.id), eq(schema.bookReviews.userId, auth.user.id)))
      .limit(1);
    const now = new Date();
    if (existing?.status === 'hidden') {
      return NextResponse.json({ error: 'Your review is hidden by a moderator. Please contact the site administrator before editing it.' }, { status: 403 });
    }
    if (existing) {
      await db.update(schema.bookReviews).set({ rating, title: title || null, content, status: 'published', updatedAt: now })
        .where(eq(schema.bookReviews.id, existing.id));
      return NextResponse.json({ success: true, updated: true, reviewId: existing.id });
    }

    const id = `rev_${crypto.randomUUID()}`;
    await db.insert(schema.bookReviews).values({
      id, bookId: book.id, userId: auth.user.id, rating, title: title || null,
      content, status: 'published', createdAt: now, updatedAt: now,
    });
    return NextResponse.json({ success: true, updated: false, reviewId: id }, { status: 201 });
  } catch (error) {
    console.error('Save book review failed:', error);
    return NextResponse.json({ error: 'Could not save your review. Please try again.' }, { status: 500 });
  }
}
