import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'recent';

    // Check if requesting user is an administrator
    const user = await getCurrentUser(request);
    const isAdmin = user?.role === 'admin';

    let booksList: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string;
      description: string;
      synopsis?: string;
      authorName?: string;
      coverImageUrl: string;
      category: string;
      tags: string[];
      edition: string;
      publishedYear: number;
      status: string;
      isFree: boolean;
      isPublished: boolean;
      totalChapters: number;
      estimatedReadingTimeMinutes: number;
      allowPdfDownload: boolean;
      originalPdfUrl?: string | null;
      originalPdfPath?: string | null;
      license?: string;
      licenseUrl?: string | null;
    }> = [];

    if (isDatabaseConfigured() && db) {
      if (isAdmin) {
        // Admin can request all books
        booksList = await db.select().from(schema.books);
      } else {
        // Public and normal readers only see published books
        booksList = await db
          .select()
          .from(schema.books)
          .where(eq(schema.books.isPublished, true));
      }
    } else {
      // In-memory / data fallback
      booksList = PUBLISHED_BOOKS.map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        synopsis: b.synopsis,
        authorName: b.author,
        coverImageUrl: b.coverImage,
        category: b.category,
        tags: b.tags,
        edition: b.edition,
        publishedYear: b.publishedYear,
        status: b.publicationStatus,
        isFree: b.isFree,
        isPublished: b.isPublished ?? true,
        totalChapters: b.totalChapters,
        estimatedReadingTimeMinutes: b.estimatedReadingTimeMinutes,
        allowPdfDownload: b.allowPdfDownload,
      })).filter((b) => (isAdmin ? true : b.isPublished));
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

    const mappedBooks = booksList.map((b) => ({
      ...b,
      // Never send private Blob paths to readers; private downloads go through an authenticated proxy route.
      originalPdfPath: null,
      coverImage: b.coverImageUrl || '/images/ml-deep-learning-cover.jpg',
      coverImageUrl: b.coverImageUrl || '/images/ml-deep-learning-cover.jpg',
      author: b.authorName || 'Slayer',
      publicationStatus: b.status || 'Available Free',
      originalPdfUrl: b.allowPdfDownload
        ? b.originalPdfPath
          ? `/api/books/${encodeURIComponent(b.slug)}/pdf`
          : b.originalPdfUrl ?? null
        : null,
      license: b.license || 'All Rights Reserved',
      licenseUrl: b.licenseUrl ?? null,
    }));

    return NextResponse.json({
      success: true,
      books: mappedBooks,
      count: mappedBooks.length,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    console.error('Fetch books error:', err);
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'An unexpected error occurred while loading books.' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      books: PUBLISHED_BOOKS,
      count: PUBLISHED_BOOKS.length,
    });
  }
}
