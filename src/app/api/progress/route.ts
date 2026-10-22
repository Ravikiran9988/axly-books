import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { progressUpdateSchema } from '@/lib/validations';

interface StoredProgressItem {
  bookSlug: string;
  lastChapterNumber: number;
  lastChapterSlug: string;
  percentComplete: number;
  lastReadTimestamp: number;
}

// In-memory progress store for unconfigured database development
const inMemoryProgress = new Map<string, Record<string, StoredProgressItem>>();

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookSlug = searchParams.get('bookSlug');

    if (isDatabaseConfigured() && db) {
      if (bookSlug) {
        const records = await db
          .select({
            progress: schema.readingProgress,
            book: schema.books,
            chapter: schema.chapters,
          })
          .from(schema.readingProgress)
          .innerJoin(schema.books, eq(schema.readingProgress.bookId, schema.books.id))
          .innerJoin(schema.chapters, eq(schema.readingProgress.chapterId, schema.chapters.id))
          .where(
            and(
              eq(schema.readingProgress.userId, user.id),
              eq(schema.books.slug, bookSlug)
            )
          )
          .limit(1);

        if (records.length === 0) {
          return NextResponse.json({ progress: null });
        }

        const r = records[0];
        return NextResponse.json({
          progress: {
            bookSlug: r.book.slug,
            lastChapterNumber: r.chapter.chapterNumber,
            lastChapterSlug: r.chapter.slug,
            percentComplete: r.progress.progressPercentage,
            lastReadTimestamp: new Date(r.progress.lastReadAt).getTime(),
          },
        });
      } else {
        const records = await db
          .select({
            progress: schema.readingProgress,
            book: schema.books,
            chapter: schema.chapters,
          })
          .from(schema.readingProgress)
          .innerJoin(schema.books, eq(schema.readingProgress.bookId, schema.books.id))
          .innerJoin(schema.chapters, eq(schema.readingProgress.chapterId, schema.chapters.id))
          .where(eq(schema.readingProgress.userId, user.id));

        const result: Record<string, StoredProgressItem> = {};
        records.forEach((r) => {
          result[r.book.slug] = {
            bookSlug: r.book.slug,
            lastChapterNumber: r.chapter.chapterNumber,
            lastChapterSlug: r.chapter.slug,
            percentComplete: r.progress.progressPercentage,
            lastReadTimestamp: new Date(r.progress.lastReadAt).getTime(),
          };
        });

        return NextResponse.json({ progress: result });
      }
    }

    // In-memory fallback
    const userProgress = inMemoryProgress.get(user.id) || {};
    if (bookSlug) {
      return NextResponse.json({ progress: userProgress[bookSlug] || null });
    }
    return NextResponse.json({ progress: userProgress });
  } catch (err: unknown) {
    console.error('Fetch progress error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading reading progress.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = progressUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid progress data.' },
        { status: 400 }
      );
    }

    const { bookSlug, chapterSlug, chapterNumber, progressPercentage, lastReadAnchor } =
      parseResult.data;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      // Find book and chapter records
      const bookRecords = await db
        .select()
        .from(schema.books)
        .where(eq(schema.books.slug, bookSlug))
        .limit(1);

      if (bookRecords.length === 0) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }
      const book = bookRecords[0];

      const chapterRecords = await db
        .select()
        .from(schema.chapters)
        .where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug)))
        .limit(1);

      if (chapterRecords.length === 0) {
        return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
      }
      const chapter = chapterRecords[0];

      // Upsert progress record for (userId, bookId) enforcing single-record model
      await db
        .insert(schema.readingProgress)
        .values({
          id: `prog_${crypto.randomUUID()}`,
          userId: user.id,
          bookId: book.id,
          chapterId: chapter.id,
          lastReadAnchor: lastReadAnchor || null,
          progressPercentage,
          lastReadAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.readingProgress.userId, schema.readingProgress.bookId],
          set: {
            chapterId: chapter.id,
            lastReadAnchor: lastReadAnchor || null,
            progressPercentage,
            lastReadAt: now,
            updatedAt: now,
          },
        });

      return NextResponse.json({
        success: true,
        progress: {
          bookSlug,
          lastChapterNumber: chapter.chapterNumber,
          lastChapterSlug: chapter.slug,
          percentComplete: progressPercentage,
          lastReadTimestamp: now.getTime(),
        },
      });
    }

    // In-memory fallback
    const userProgress = inMemoryProgress.get(user.id) || {};
    const updatedRecord: StoredProgressItem = {
      bookSlug,
      lastChapterNumber: chapterNumber,
      lastChapterSlug: chapterSlug,
      percentComplete: progressPercentage,
      lastReadTimestamp: now.getTime(),
    };
    userProgress[bookSlug] = updatedRecord;
    inMemoryProgress.set(user.id, userProgress);

    return NextResponse.json({
      success: true,
      progress: updatedRecord,
    });
  } catch (err: unknown) {
    console.error('Update progress error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving reading progress.' },
      { status: 500 }
    );
  }
}
