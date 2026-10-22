import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { PUBLISHED_BOOKS } from '@/data/booksData';

export async function GET() {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    if (isDatabaseConfigured() && db) {
      const allBooks = await db.select().from(schema.books);
      const allChapters = await db.select({ count: sql<number>`count(*)` }).from(schema.chapters);

      const totalBooks = allBooks.length;
      const publishedBooks = allBooks.filter((b) => b.isPublished).length;
      const draftBooks = allBooks.filter((b) => !b.isPublished).length;
      const totalChapters = Number(allChapters[0]?.count || 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalBooks,
          publishedBooks,
          draftBooks,
          totalChapters,
        },
      });
    }

    // Fallback for development without DB
    const totalBooks = PUBLISHED_BOOKS.length;
    const publishedBooks = PUBLISHED_BOOKS.filter((b) => b.isPublished !== false).length;
    const draftBooks = totalBooks - publishedBooks;
    const totalChapters = PUBLISHED_BOOKS.reduce((acc, b) => acc + (b.totalChapters || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalBooks,
        publishedBooks,
        draftBooks,
        totalChapters,
      },
    });
  } catch (err: unknown) {
    console.error('Admin overview stats error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve overview statistics.' },
      { status: 500 }
    );
  }
}
