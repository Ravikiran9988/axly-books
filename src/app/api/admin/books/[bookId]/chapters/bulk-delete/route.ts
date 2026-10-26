import { NextResponse } from 'next/server';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

/**
 * Delete a set of chapters with a small, fixed number of database round trips.
 * The chapter manager previously sent one DELETE request per chapter, which
 * made large imports (for example, 88 chapters) extremely slow.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const { bookId } = await params;
    const body = await request.json().catch(() => null);
    const rawIds: unknown = body && typeof body === 'object' ? (body as { chapterIds?: unknown }).chapterIds : null;
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 500) {
      return NextResponse.json(
        { error: 'Select between 1 and 500 chapters to delete.' },
        { status: 400 }
      );
    }

    const chapterIds = [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))];
    if (chapterIds.length !== rawIds.length) {
      return NextResponse.json({ error: 'One or more selected chapter IDs are invalid.' }, { status: 400 });
    }

    const books = await db
      .select({
        id: schema.books.id,
        isPublished: schema.books.isPublished,
        allowOnlineReading: schema.books.allowOnlineReading,
      })
      .from(schema.books)
      .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
      .limit(1);

    const book = books[0];
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const selectedChapters = await db
      .select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
      .from(schema.chapters)
      .where(and(eq(schema.chapters.bookId, book.id), inArray(schema.chapters.id, chapterIds)));

    if (selectedChapters.length !== chapterIds.length) {
      return NextResponse.json(
        { error: 'Some selected chapters no longer exist. Refresh the page and try again.' },
        { status: 409 }
      );
    }

    // If online reading is enabled, keep at least one published chapter for a
    // published book. Admins can disable online reading first to clear/reimport
    // chapter content while leaving the public book/PDF page available.
    if (book.isPublished && book.allowOnlineReading) {
      const publishedChapters = await db
        .select({ id: schema.chapters.id })
        .from(schema.chapters)
        .where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.isPublished, true)));
      const selectedIds = new Set(chapterIds);
      if (
        publishedChapters.length > 0 &&
        publishedChapters.every((chapter) => selectedIds.has(chapter.id))
      ) {
        return NextResponse.json(
          { error: 'This would remove every published chapter from a book with online reading enabled. Turn off “Allow online reading” or unpublish the book first, then retry.' },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    await db.delete(schema.readingProgress)
      .where(and(eq(schema.readingProgress.bookId, book.id), inArray(schema.readingProgress.chapterId, chapterIds)));
    await db.delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.bookId, book.id), inArray(schema.bookmarks.chapterId, chapterIds)));
    await db.delete(schema.chapters)
      .where(and(eq(schema.chapters.bookId, book.id), inArray(schema.chapters.id, chapterIds)));

    const stats = await db
      .select({
        totalChapters: sql<number>`count(*)`,
        totalTime: sql<number>`coalesce(sum(${schema.chapters.estimatedReadingTimeMinutes}), 0)`,
      })
      .from(schema.chapters)
      .where(eq(schema.chapters.bookId, book.id));

    await db.update(schema.books)
      .set({
        totalChapters: Number(stats[0]?.totalChapters ?? 0),
        estimatedReadingTimeMinutes: Number(stats[0]?.totalTime ?? 0),
        updatedAt: now,
      })
      .where(eq(schema.books.id, book.id));

    return NextResponse.json({
      success: true,
      deletedCount: selectedChapters.length,
      deletedChapterIds: chapterIds,
      message: `Deleted ${selectedChapters.length} selected chapter${selectedChapters.length === 1 ? '' : 's'}.`,
    });
  } catch (error) {
    console.error('Bulk chapter deletion failed:', error);
    return NextResponse.json(
      { error: 'Could not delete the selected chapters. Please refresh and try again.' },
      { status: 500 }
    );
  }
}
