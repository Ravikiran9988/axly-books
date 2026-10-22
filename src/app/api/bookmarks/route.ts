import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { bookmarkCreateSchema } from '@/lib/validations';

interface StoredBookmarkItem {
  id: string;
  bookSlug: string;
  bookTitle: string;
  chapterNumber: number;
  chapterSlug: string;
  chapterTitle: string;
  anchor?: string | null;
  note?: string | null;
  createdAt: number;
}

const inMemoryBookmarks = new Map<string, StoredBookmarkItem[]>();

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
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
      const query = db
        .select({
          bookmark: schema.bookmarks,
          book: schema.books,
          chapter: schema.chapters,
        })
        .from(schema.bookmarks)
        .innerJoin(schema.books, eq(schema.bookmarks.bookId, schema.books.id))
        .innerJoin(schema.chapters, eq(schema.bookmarks.chapterId, schema.chapters.id))
        .where(
          bookSlug
            ? and(eq(schema.bookmarks.userId, user.id), eq(schema.books.slug, bookSlug))
            : eq(schema.bookmarks.userId, user.id)
        )
        .orderBy(desc(schema.bookmarks.createdAt));

      const records = await query;
      const bookmarks = records.map((r) => ({
        id: r.bookmark.id,
        bookSlug: r.book.slug,
        bookTitle: r.book.title,
        chapterNumber: r.chapter.chapterNumber,
        chapterSlug: r.chapter.slug,
        chapterTitle: r.chapter.title,
        anchor: r.bookmark.anchor,
        note: r.bookmark.note,
        createdAt: new Date(r.bookmark.createdAt).getTime(),
      }));

      return NextResponse.json({ success: true, bookmarks });
    }

    // In-memory fallback for local development
    const list = inMemoryBookmarks.get(user.id) || [];
    const filtered = bookSlug ? list.filter((b) => b.bookSlug === bookSlug) : list;
    return NextResponse.json({ success: true, bookmarks: filtered });
  } catch (err: unknown) {
    console.error('Fetch bookmarks error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading bookmarks.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
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
    const parseResult = bookmarkCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid bookmark data.' },
        { status: 400 }
      );
    }

    const { bookSlug, chapterSlug, anchor, note } = parseResult.data;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
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

      const bookmarkId = `bm_${crypto.randomUUID()}`;

      await db
        .insert(schema.bookmarks)
        .values({
          id: bookmarkId,
          userId: user.id,
          bookId: book.id,
          chapterId: chapter.id,
          anchor: anchor || null,
          note: note || null,
          createdAt: now,
        })
        .onConflictDoNothing();

      return NextResponse.json(
        {
          success: true,
          bookmark: {
            id: bookmarkId,
            bookSlug,
            bookTitle: book.title,
            chapterNumber: chapter.chapterNumber,
            chapterSlug: chapter.slug,
            chapterTitle: chapter.title,
            anchor,
            note,
            createdAt: now.getTime(),
          },
        },
        { status: 201 }
      );
    }

    // In-memory fallback
    const list = inMemoryBookmarks.get(user.id) || [];
    const bookmarkId = `bm_${crypto.randomUUID()}`;
    const newBookmark: StoredBookmarkItem = {
      id: bookmarkId,
      bookSlug,
      bookTitle: body.bookTitle || bookSlug,
      chapterNumber: body.chapterNumber || 1,
      chapterSlug,
      chapterTitle: body.chapterTitle || `Chapter ${body.chapterNumber || 1}`,
      anchor: anchor || null,
      note: note || null,
      createdAt: now.getTime(),
    };

    list.unshift(newBookmark);
    inMemoryBookmarks.set(user.id, list);

    return NextResponse.json({ success: true, bookmark: newBookmark }, { status: 201 });
  } catch (err: unknown) {
    console.error('Create bookmark error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while adding bookmark.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
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
    const bookmarkId = searchParams.get('id');
    const bookSlug = searchParams.get('bookSlug');
    const chapterSlug = searchParams.get('chapterSlug');

    if (isDatabaseConfigured() && db) {
      if (bookmarkId) {
        // Enforce ownership: only delete if userId matches session user
        await db
          .delete(schema.bookmarks)
          .where(
            and(
              eq(schema.bookmarks.id, bookmarkId),
              eq(schema.bookmarks.userId, user.id)
            )
          );
      } else if (bookSlug && chapterSlug) {
        const bookRecords = await db
          .select({ id: schema.books.id })
          .from(schema.books)
          .where(eq(schema.books.slug, bookSlug))
          .limit(1);

        const chapterRecords =
          bookRecords.length > 0
            ? await db
                .select({ id: schema.chapters.id })
                .from(schema.chapters)
                .where(
                  and(
                    eq(schema.chapters.bookId, bookRecords[0].id),
                    eq(schema.chapters.slug, chapterSlug)
                  )
                )
                .limit(1)
            : [];

        if (chapterRecords.length > 0) {
          await db
            .delete(schema.bookmarks)
            .where(
              and(
                eq(schema.bookmarks.userId, user.id),
                eq(schema.bookmarks.chapterId, chapterRecords[0].id)
              )
            );
        }
      }

      return NextResponse.json({ success: true, message: 'Bookmark removed.' });
    }

    // In-memory fallback
    const list = inMemoryBookmarks.get(user.id) || [];
    let updated = list;
    if (bookmarkId) {
      updated = list.filter((b) => b.id !== bookmarkId);
    } else if (bookSlug && chapterSlug) {
      updated = list.filter((b) => !(b.bookSlug === bookSlug && b.chapterSlug === chapterSlug));
    }
    inMemoryBookmarks.set(user.id, updated);

    return NextResponse.json({ success: true, message: 'Bookmark removed.' });
  } catch (err: unknown) {
    console.error('Delete bookmark error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting bookmark.' },
      { status: 500 }
    );
  }
}
