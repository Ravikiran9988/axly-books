import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { chapterUpdateSchema } from '@/lib/validations';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { chapterId } = await params;

    if (isDatabaseConfigured() && db) {
      const records = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.id, chapterId))
        .limit(1);

      if (records.length === 0) {
        return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, chapter: records[0] });
    }

    return NextResponse.json({ error: 'Database required.' }, { status: 503 });
  } catch (err: unknown) {
    console.error('Admin get single chapter error:', err);
    return NextResponse.json({ error: 'Failed to retrieve chapter.' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { chapterId } = await params;

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = chapterUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid chapter data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const updates = parseResult.data;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.id, chapterId))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
      }

      const chapter = existing[0];

      // If chapterNumber changed, check uniqueness
      if (updates.chapterNumber && updates.chapterNumber !== chapter.chapterNumber) {
        const numCollision = await db
          .select({ id: schema.chapters.id })
          .from(schema.chapters)
          .where(
            and(
              eq(schema.chapters.bookId, chapter.bookId),
              eq(schema.chapters.chapterNumber, updates.chapterNumber)
            )
          )
          .limit(1);

        if (numCollision.length > 0) {
          return NextResponse.json(
            { error: `Chapter number ${updates.chapterNumber} already exists in this book.` },
            { status: 409 }
          );
        }
      }

      // If slug changed, check uniqueness
      if (updates.slug && updates.slug !== chapter.slug) {
        const slugCollision = await db
          .select({ id: schema.chapters.id })
          .from(schema.chapters)
          .where(
            and(
              eq(schema.chapters.bookId, chapter.bookId),
              eq(schema.chapters.slug, updates.slug)
            )
          )
          .limit(1);

        if (slugCollision.length > 0) {
          return NextResponse.json(
            { error: `Chapter slug "${updates.slug}" already exists in this book.` },
            { status: 409 }
          );
        }
      }

      await db
        .update(schema.chapters)
        .set({
          ...updates,
          updatedAt: now,
        })
        .where(eq(schema.chapters.id, chapterId));

      // Recalculate book total estimated time
      const stats = await db
        .select({
          totalTime: sql<number>`coalesce(sum(${schema.chapters.estimatedReadingTimeMinutes}), 0)`,
        })
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, chapter.bookId));

      await db
        .update(schema.books)
        .set({
          estimatedReadingTimeMinutes: Number(stats[0]?.totalTime || 0),
          updatedAt: now,
        })
        .where(eq(schema.books.id, chapter.bookId));

      const updated = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.id, chapterId))
        .limit(1);

      return NextResponse.json({ success: true, chapter: updated[0] });
    }

    return NextResponse.json({ success: true, message: 'Updated chapter.' });
  } catch (err: unknown) {
    console.error('Admin update chapter error:', err);
    return NextResponse.json({ error: 'Failed to update chapter.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { chapterId } = await params;

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.id, chapterId))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
      }

      const chapter = existing[0];
      const bookId = chapter.bookId;
      const now = new Date();

      // Clean up reading_progress and bookmarks referencing this chapter
      await db.delete(schema.readingProgress).where(eq(schema.readingProgress.chapterId, chapterId));
      await db.delete(schema.bookmarks).where(eq(schema.bookmarks.chapterId, chapterId));
      await db.delete(schema.chapters).where(eq(schema.chapters.id, chapterId));

      // Recalculate book totalChapters and reading time
      const stats = await db
        .select({
          totalChapters: sql<number>`count(*)`,
          totalTime: sql<number>`coalesce(sum(${schema.chapters.estimatedReadingTimeMinutes}), 0)`,
        })
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, bookId));

      await db
        .update(schema.books)
        .set({
          totalChapters: Number(stats[0]?.totalChapters || 0),
          estimatedReadingTimeMinutes: Number(stats[0]?.totalTime || 0),
          updatedAt: now,
        })
        .where(eq(schema.books.id, bookId));

      return NextResponse.json({
        success: true,
        message: `Chapter "${chapter.title}" was successfully deleted.`,
      });
    }

    return NextResponse.json({ success: true, message: 'Deleted chapter.' });
  } catch (err: unknown) {
    console.error('Admin delete chapter error:', err);
    return NextResponse.json({ error: 'Failed to delete chapter.' }, { status: 500 });
  }
}
