import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { eq, or, asc, and } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { bookUpdateSchema } from '@/lib/validations';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import { isBookPublishable } from '@/lib/publicationRules';

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
        const existingChapters = await db
          .select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
          .from(schema.chapters)
          .where(eq(schema.chapters.bookId, targetBook.id));
        if (!isBookPublishable({
          totalChapters: existingChapters.length,
          hasPublishedChapter: existingChapters.some((chapter) => chapter.isPublished),
          allowPdfDownload: targetBook.allowPdfDownload,
          originalPdfPath: targetBook.originalPdfPath,
        })) {
          return NextResponse.json(
            { error: !targetBook.allowPdfDownload
            ? 'This book has no published chapter. Publish a chapter, or enable PDF downloads for a PDF-only book.'
            : !targetBook.originalPdfPath
              ? 'This book has no published chapter. Publish a chapter, or attach a private original PDF to enable PDF-only publication.'
              : 'This book has no published chapter. Publish a chapter, or enable PDF downloads and attach a private original PDF to publish as download-only.' },
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
          originalPdfPath: schema.books.originalPdfPath,
        })
        .from(schema.books);
      const referencedByOtherBook = (url: string | null | undefined) =>
        !!url && otherBooks.some((book) =>
          book.id !== target.id && (book.coverImageUrl === url || book.originalPdfUrl === url)
        );
      const privatePathReferencedByOtherBook = (path: string | null | undefined) =>
        !!path && otherBooks.some((book) => book.id !== target.id && book.originalPdfPath === path);

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

      const storageCleanupWarnings: string[] = [];
      let deletedBlobAssets = 0;

      if (blobUrls.length > 0 && blobToken) {
        try {
          await del(blobUrls, { token: blobToken });
          deletedBlobAssets += blobUrls.length;
        } catch (cleanupError) {
          console.error('Book deleted but public Blob asset cleanup failed:', cleanupError);
          storageCleanupWarnings.push(
            'One or more public Blob files could not be removed. Check Vercel Blob for orphaned files.'
          );
        }
      } else if (blobUrls.length > 0 && !blobToken) {
        storageCleanupWarnings.push(
          'Public Blob cleanup was skipped because BLOB_READ_WRITE_TOKEN is not configured.'
        );
      }

      const privatePdfPath = target.originalPdfPath;
      if (privatePdfPath && !privatePathReferencedByOtherBook(privatePdfPath)) {
        const privateToken = process.env.PDF_BLOB_READ_WRITE_TOKEN;
        if (!privatePdfPath.startsWith('original-pdfs/')) {
          storageCleanupWarnings.push(
            'Private PDF cleanup was skipped because its path is outside the expected original-pdfs/ folder.'
          );
        } else if (!privateToken) {
          storageCleanupWarnings.push(
            'Private PDF cleanup was skipped because PDF_BLOB_READ_WRITE_TOKEN is not configured.'
          );
        } else {
          try {
            await del(privatePdfPath, { token: privateToken });
            deletedBlobAssets += 1;
          } catch (cleanupError) {
            console.error('Book deleted but private PDF cleanup failed:', cleanupError);
            storageCleanupWarnings.push(
              'The private original PDF could not be removed. Check the private Vercel Blob store for an orphaned file.'
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Book "${target.title}" and its chapters, comments, bookmarks, and reading progress were deleted.`,
        ...(storageCleanupWarnings.length
          ? { storageCleanupWarning: storageCleanupWarnings.join(' ') }
          : {}),
        deletedBlobAssets,
      });
    }

    return NextResponse.json({ error: 'Persistent database service is required to delete books.' }, { status: 503 });
  } catch (err: unknown) {
    console.error('Admin delete book error:', err);
    return NextResponse.json({ error: 'Failed to delete book.' }, { status: 500 });
  }
}
