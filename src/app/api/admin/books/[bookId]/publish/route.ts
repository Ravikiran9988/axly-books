import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { isBookPublishable } from '@/lib/publicationRules';

export async function PATCH(
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

    const body = await request.json().catch(() => ({}));
    const now = new Date();

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
      const nextIsPublished =
        typeof body.isPublished === 'boolean' ? body.isPublished : !book.isPublished;

      // Validation rule: when publishing, ensure metadata and public chapters exist
      if (nextIsPublished) {
        const chapters = await db
          .select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
          .from(schema.chapters)
          .where(eq(schema.chapters.bookId, book.id));
        const hasPublishedChapter = chapters.some((chapter) => chapter.isPublished);
        if (!isBookPublishable({
          totalChapters: chapters.length,
          hasPublishedChapter,
          allowPdfDownload: book.allowPdfDownload,
          originalPdfPath: book.originalPdfPath,
        })) {
          return NextResponse.json(
            { error: 'This book has no published chapter. Open Chapters, publish at least one chapter, then try again. For PDF-only books, enable downloads and attach a private original PDF.' },
            { status: 400 }
          );
        }
      }

      await db
        .update(schema.books)
        .set({
          isPublished: nextIsPublished,
          status: nextIsPublished ? 'Available Free' : 'Draft',
          updatedAt: now,
        })
        .where(eq(schema.books.id, book.id));

      return NextResponse.json({
        success: true,
        isPublished: nextIsPublished,
        status: nextIsPublished ? 'Available Free' : 'Draft',
        message: nextIsPublished
          ? `"${book.title}" is now published and available to public readers.`
          : `"${book.title}" has been unpublished and moved to draft status.`,
      });
    }

    return NextResponse.json({ error: 'Persistent database service is required to change publication status.' }, { status: 503 });
  } catch (err: unknown) {
    console.error('Publish toggle error:', err);
    return NextResponse.json({ error: 'Failed to update publication status.' }, { status: 500 });
  }
}
