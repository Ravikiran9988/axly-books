import { NextResponse } from 'next/server';
import { eq, or, asc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { bookUpdateSchema } from '@/lib/validations';
import { PUBLISHED_BOOKS } from '@/data/booksData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin(request);
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

    if (isDatabaseConfigured() && db) {
      const records = await db
        .select()
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (records.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const book = records[0];
      const chapters = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, book.id))
        .orderBy(asc(schema.chapters.chapterNumber));

      return NextResponse.json({
        success: true,
        book: {
          ...book,
          chapters,
        },
      });
    }

    const fallbackBook = PUBLISHED_BOOKS.find((b) => b.id === bookId || b.slug === bookId);
    if (!fallbackBook) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      book: fallbackBook,
    });
  } catch (err: unknown) {
    console.error('Admin get book error:', err);
    return NextResponse.json({ error: 'Failed to retrieve book.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin(request);
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
    const parseResult = bookUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid book updates.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const updates = parseResult.data;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select()
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const targetBook = existing[0];

      // If slug changed, verify no collisions
      if (updates.slug && updates.slug !== targetBook.slug) {
        const slugCollision = await db
          .select({ id: schema.books.id })
          .from(schema.books)
          .where(eq(schema.books.slug, updates.slug))
          .limit(1);

        if (slugCollision.length > 0) {
          return NextResponse.json(
            { error: `Slug "${updates.slug}" is already taken by another book.` },
            { status: 409 }
          );
        }
      }

      await db
        .update(schema.books)
        .set({
          ...updates,
          updatedAt: now,
        })
        .where(eq(schema.books.id, targetBook.id));

      const updated = await db
        .select()
        .from(schema.books)
        .where(eq(schema.books.id, targetBook.id))
        .limit(1);

      return NextResponse.json({
        success: true,
        book: updated[0],
      });
    }

    return NextResponse.json({ success: true, message: 'Updated in development.' });
  } catch (err: unknown) {
    console.error('Admin update book error:', err);
    return NextResponse.json({ error: 'Failed to update book.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin(request);
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

    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select({ id: schema.books.id, title: schema.books.title })
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const realId = existing[0].id;

      // Cascading deletion is configured in PostgreSQL foreign keys,
      // but we explicitly clean up reading_progress, bookmarks, and chapters for safety.
      await db.delete(schema.readingProgress).where(eq(schema.readingProgress.bookId, realId));
      await db.delete(schema.bookmarks).where(eq(schema.bookmarks.bookId, realId));
      await db.delete(schema.chapters).where(eq(schema.chapters.bookId, realId));
      await db.delete(schema.books).where(eq(schema.books.id, realId));

      return NextResponse.json({
        success: true,
        message: `Book "${existing[0].title}" and all its chapters were successfully deleted.`,
      });
    }

    return NextResponse.json({ success: true, message: 'Deleted in development.' });
  } catch (err: unknown) {
    console.error('Admin delete book error:', err);
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 });
  }
}
