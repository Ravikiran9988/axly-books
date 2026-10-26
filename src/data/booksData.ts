import type { Book } from '@/types/book';

/**
 * No demo books are shipped in the public catalogue.
 * Add real publications through the admin CMS or the database seed data.
 * Keeping this list empty prevents the ML + Deep Learning sample book from
 * appearing in local/static fallback mode or being re-created by db:seed.
 */
export const PUBLISHED_BOOKS: Book[] = [];

export function getAllBooks(): Book[] {
  return PUBLISHED_BOOKS;
}

export function getBookBySlug(slug: string): Book | undefined {
  return PUBLISHED_BOOKS.find((book) => book.slug === slug);
}

export function getChapterBySlug(bookSlug: string, chapterSlug: string) {
  const book = getBookBySlug(bookSlug);
  if (!book) return undefined;
  return book.chapters.find((chapter) => chapter.slug === chapterSlug);
}

export function getFeaturedBook(): Book | undefined {
  return PUBLISHED_BOOKS[0];
}
