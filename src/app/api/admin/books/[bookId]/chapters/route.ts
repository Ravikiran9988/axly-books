import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, or, and, asc, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { chapterCreateSchema } from '@/lib/validations';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { bookId } = await params;

    if (isDatabaseConfigured() && db) {
      const bookRecords = await db
        .select()
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (bookRecords.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const book = bookRecords[0];
      const chaptersList = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, book.id))
        .orderBy(asc(schema.chapters.chapterNumber));

      return NextResponse.json({
        success: true,
        book,
        chapters: chaptersList,
      });
    }

    return NextResponse.json({ error: 'Database required.' }, { status: 503 });
  } catch (err: unknown) {
    console.error('Admin get chapters error:', err);
    return NextResponse.json({ error: 'Failed to retrieve chapters.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { bookId } = await params;

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = chapterCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid chapter data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parseResult.data;
    const now = new Date();
    const chapterId = `ch_${crypto.randomUUID()}`;

    if (isDatabaseConfigured() && db) {
      const bookRecords = await db
        .select()
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (bookRecords.length === 0) {
        return NextResponse.json({ error: 'Parent book not found.' }, { status: 404 });
      }

      const realBookId = bookRecords[0].id;

      // Validate chapterNumber uniqueness within this book
      const numCollision = await db
        .select({ id: schema.chapters.id })
        .from(schema.chapters)
        .where(
          and(
            eq(schema.chapters.bookId, realBookId),
            eq(schema.chapters.chapterNumber, data.chapterNumber)
          )
        )
        .limit(1);

      if (numCollision.length > 0) {
        return NextResponse.json(
          { error: `Chapter number ${data.chapterNumber} already exists in this book.` },
          { status: 409 }
        );
      }

      // Validate slug uniqueness within this book
      const slugCollision = await db
        .select({ id: schema.chapters.id })
        .from(schema.chapters)
        .where(
          and(
            eq(schema.chapters.bookId, realBookId),
            eq(schema.chapters.slug, data.slug)
          )
        )
        .limit(1);

      if (slugCollision.length > 0) {
        return NextResponse.json(
          { error: `Chapter slug "${data.slug}" already exists in this book.` },
          { status: 409 }
        );
      }

      // Insert chapter
      await db.insert(schema.chapters).values({
        id: chapterId,
        bookId: realBookId,
        chapterNumber: data.chapterNumber,
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        content: data.content,
        estimatedReadingTimeMinutes: data.estimatedReadingTimeMinutes,
        isPublished: data.isPublished,
        createdAt: now,
        updatedAt: now,
      });

      // Update book's totalChapters and total estimated time
      const stats = await db
        .select({
          totalChapters: sql<number>`count(*)`,
          totalTime: sql<number>`coalesce(sum(${schema.chapters.estimatedReadingTimeMinutes}), 0)`,
        })
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, realBookId));

      await db
        .update(schema.books)
        .set({
          totalChapters: Number(stats[0]?.totalChapters || 1),
          estimatedReadingTimeMinutes: Number(stats[0]?.totalTime || data.estimatedReadingTimeMinutes),
          updatedAt: now,
        })
        .where(eq(schema.books.id, realBookId));

      return NextResponse.json(
        {
          success: true,
          chapter: {
            id: chapterId,
            bookId: realBookId,
            ...data,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ success: true, message: 'Created chapter.' }, { status: 201 });
  } catch (err: unknown) {
    console.error('Admin create chapter error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the chapter.' },
      { status: 500 }
    );
  }
}
