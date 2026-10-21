import { NextResponse } from 'next/server';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'recent';

    let booksList: any[] = [];

    if (isDatabaseConfigured() && db) {
      booksList = await db.select().from(schema.books);
    } else {
      booksList = [...PUBLISHED_BOOKS];
    }

    // Apply filtering
    if (query) {
      booksList = booksList.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.subtitle?.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query) ||
          (Array.isArray(b.tags) && b.tags.some((t: string) => t.toLowerCase().includes(query)))
      );
    }

    if (category && category !== 'All') {
      booksList = booksList.filter((b) => b.category === category);
    }

    // Apply sorting
    if (sort === 'title') {
      booksList.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'chapters') {
      booksList.sort((a, b) => (b.totalChapters || 0) - (a.totalChapters || 0));
    } else {
      booksList.sort((a, b) => (b.publishedYear || 2026) - (a.publishedYear || 2026));
    }

    return NextResponse.json({
      success: true,
      books: booksList,
      count: booksList.length,
    });
  } catch (err: any) {
    console.error('Fetch books error:', err);
    // Graceful fallback to verified fixtures
    return NextResponse.json({
      success: true,
      books: PUBLISHED_BOOKS,
      count: PUBLISHED_BOOKS.length,
    });
  }
}
