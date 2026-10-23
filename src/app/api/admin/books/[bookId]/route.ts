import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { eq, or, asc, and } from 'drizzle-orm';
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

    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured. Configure DATABASE_URL before changing books.' },
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

      // Prevent the edit endpoint from bypassing the publication guard used by the Publish action.
      if (updates.isPublished === true && !targetBook.isPublished) {
        const publishedChapters = await db
          .select({ id: schema.chapters.id })
          .from(schema.chapters)
          .where(and(
            eq(schema.chapters.bookId, targetBook.id),
            eq(schema.chapters.isPublished, true)
          ))
          .limit(1);

        if (publishedChapters.length === 0) {
          return NextResponse.json(
            { error: 'Cannot publish a book without at least one published chapter. Publish a chapter first, then try again.' },
            { status: 400 }
          );
        }
      }

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

    return NextResponse.json({ error: 'Persistent database service is required to update books.' }, { status: 503 });
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

    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured. Configure DATABASE_URL before changing books.' },
        { status: 503 }
      );
    }

    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select()
        .from(schema.books)
        .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const target = existing[0];
      const otherBooks = await db
        .select({
          id: schema.books.id,
          coverImageUrl: schema.books.coverImageUrl,
          originalPdfUrl: schema.books.originalPdfUrl,
        })
        .from(schema.books);
      const referencedByOtherBook = (url: string | null | undefined) =>
        !!url && otherBooks.some((book) =>
          book.id !== target.id && (book.coverImageUrl === url || book.originalPdfUrl === url)
        );

      // Delete the database record first. Chapter, comment, progress, and bookmark
      // rows are removed by the configured foreign-key cascades.
      await db.delete(schema.readingProgress).where(eq(schema.readingProgress.bookId, target.id));
      await db.delete(schema.bookmarks).where(eq(schema.bookmarks.bookId, target.id));
      await db.delete(schema.chapters).where(eq(schema.chapters.bookId, target.id));
      await db.delete(schema.books).where(eq(schema.books.id, target.id));

      // Only remove assets owned by this Vercel Blob store, and never remove an
      // asset that another book still references. External URLs and local paths
      // are intentionally left untouched.
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      const assetUrls = [...new Set([target.originalPdfUrl, target.coverImageUrl].filter(
        (url): url is string => typeof url === 'string' && url.length > 0
      ))];
      const blobUrls = assetUrls.filter((url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:' &&
            (parsed.hostname.endsWith('.public.blob.vercel-storage.com') ||
              parsed.hostname.endsWith('.blob.vercel-storage.com')) &&
            !referencedByOtherBook(url);
        } catch {
          return false;
        }
      });

      let storageCleanupWarning: string | undefined;
      if (blobUrls.length > 0 && blobToken) {
        try {
          await del(blobUrls, { token: blobToken });
        } catch (cleanupError) {
          console.error('Book deleted but Blob asset cleanup failed:', cleanupError);
          storageCleanupWarning =
            'The book was deleted from the library, but one or more stored files could not be removed. Check Vercel Blob and clean up orphaned files if needed.';
        }
      } else if (blobUrls.length > 0 && !blobToken) {
        storageCleanupWarning =
          'The book was deleted from the library, but Blob cleanup was skipped because BLOB_READ_WRITE_TOKEN is not configured.';
      }

      return NextResponse.json({
        success: true,
        message: `Book "${target.title}" and its chapters, comments, bookmarks, and reading progress were deleted.`,
        ...(storageCleanupWarning ? { storageCleanupWarning } : {}),
        deletedBlobAssets: blobToken ? blobUrls.length : 0,
      });
    }

    return NextResponse.json({ error: 'Persistent database service is required to delete books.' }, { status: 503 });
  } catch (err: unknown) {
    console.error('Admin delete book error:', err);
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 });
  }
}
