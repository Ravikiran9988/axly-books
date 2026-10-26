import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'recent';

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
      // The public catalogue only exposes published books. Admin tools use
      // /api/admin/books for draft and unpublished records.
      booksList = await db
        .select()
        .from(schema.books)
        .where(eq(schema.books.isPublished, true));
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
      })).filter((b) => b.isPublished);
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

    const publishedChapterCounts = new Map<string, number>();
    if (isDatabaseConfigured() && db && booksList.length > 0) {
      const chapterRows = await db
        .select({ bookId: schema.chapters.bookId })
        .from(schema.chapters)
        .where(eq(schema.chapters.isPublished, true));
      for (const chapter of chapterRows) {
        publishedChapterCounts.set(
          chapter.bookId,
          (publishedChapterCounts.get(chapter.bookId) ?? 0) + 1
        );
      }
    }
    const staticChapterCounts = new Map(
      PUBLISHED_BOOKS.map((book) => [book.id, book.chapters.length] as const)
    );

    const mappedBooks = booksList.map((b) => {
      const chapterCount = isDatabaseConfigured() && db
        ? publishedChapterCounts.get(b.id) ?? 0
        : staticChapterCounts.get(b.id) ?? b.totalChapters ?? 0;

      return {
        ...b,
        // Never send private Blob paths to readers; private downloads go through an authenticated proxy route.
        originalPdfPath: null,
        totalChapters: chapterCount,
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
      };
    });

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
