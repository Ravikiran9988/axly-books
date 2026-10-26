import { NextResponse } from 'next/server';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

/** Publish a selected group of reviewed chapters in one database request. */
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
    const rawIds: unknown =
      body && typeof body === 'object'
        ? (body as { chapterIds?: unknown }).chapterIds
        : null;

    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 500) {
      return NextResponse.json(
        { error: 'Select between 1 and 500 chapters to publish.' },
        { status: 400 }
      );
    }

    const chapterIds = [
      ...new Set(rawIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)),
    ];
    if (chapterIds.length !== rawIds.length) {
      return NextResponse.json(
        { error: 'One or more selected chapter IDs are invalid.' },
        { status: 400 }
      );
    }

    const [book] = await db
      .select({ id: schema.books.id, slug: schema.books.slug, isPublished: schema.books.isPublished })
      .from(schema.books)
      .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
      .limit(1);

    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const selected = await db
      .select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
      .from(schema.chapters)
      .where(and(eq(schema.chapters.bookId, book.id), inArray(schema.chapters.id, chapterIds)));

    if (selected.length !== chapterIds.length) {
      return NextResponse.json(
        { error: 'Some selected chapters no longer exist. Refresh the page and try again.' },
        { status: 409 }
      );
    }

    const draftsToPublish = selected.filter((chapter) => !chapter.isPublished);
    if (draftsToPublish.length > 0) {
      await db
        .update(schema.chapters)
        .set({ isPublished: true, updatedAt: new Date() })
        .where(
          and(
            eq(schema.chapters.bookId, book.id),
            inArray(schema.chapters.id, draftsToPublish.map((chapter) => chapter.id))
          )
        );
    }

    return NextResponse.json({
      success: true,
      publishedCount: draftsToPublish.length,
      publishedChapterIds: selected.map((chapter) => chapter.id),
      bookIsPublished: book.isPublished,
      message: draftsToPublish.length
        ? `Published ${draftsToPublish.length} chapter${draftsToPublish.length === 1 ? '' : 's'}.${book.isPublished ? ' Refresh the public book page to see the Read Book option.' : ' The book itself is still a draft; publish the book to make it public.'}`
        : 'All selected chapters are already published.',
    });
  } catch (error) {
    console.error('Bulk chapter publishing failed:', error);
    return NextResponse.json(
      { error: 'Could not publish the selected chapters. Please refresh and try again.' },
      { status: 500 }
    );
  }
}
