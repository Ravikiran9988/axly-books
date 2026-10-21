import { Book, BookFilter, Chapter } from '@/types/book';
import { PUBLISHED_BOOKS, getBookBySlug } from '@/data/booksData';

export interface ChapterNavigationResult {
  chapter: Chapter;
  nextChapter: Chapter | null;
  prevChapter: Chapter | null;
  book: Book;
}

export const bookService = {
  /**
   * Retrieves all available books, applying optional filters and sorting.
   * Leverages backend API when available in client runtime with reliable fallback.
   */
  async getBooks(filter?: BookFilter): Promise<Book[]> {
    let result = [...PUBLISHED_BOOKS];

    // Attempt client API call if in browser
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams();
        if (filter?.searchQuery) params.set('q', filter.searchQuery);
        if (filter?.category && filter.category !== 'All') params.set('category', filter.category);
        if (filter?.sortBy) params.set('sort', filter.sortBy);

        const res = await fetch(`/api/books?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.books) && data.books.length > 0) {
            return data.books;
          }
        }
      } catch {
        // Fallback to local verified catalogue
      }
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.subtitle.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter?.category && filter.category !== 'All') {
      result = result.filter((b) => b.category === filter.category);
    }

    if (filter?.status && filter.status !== 'All') {
      result = result.filter((b) => b.publicationStatus === filter.status);
    }

    if (filter?.sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (filter?.sortBy === 'chapters') {
      result.sort((a, b) => b.totalChapters - a.totalChapters);
    } else {
      // default: recent / published
      result.sort((a, b) => b.publishedYear - a.publishedYear);
    }

    return result;
  },

  /**
   * Retrieve single book by its slug.
   */
  async getBookBySlug(slug: string): Promise<Book | null> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/books/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.book) return data.book;
        }
      } catch {
        // Fallback to local
      }
    }

    const book = getBookBySlug(slug);
    return book || null;
  },

  /**
   * Retrieve chapter details along with previous and next chapter metadata.
   */
  async getChapter(
    bookSlug: string,
    chapterSlugOrNumber: string | number
  ): Promise<ChapterNavigationResult | null> {
    const book = await this.getBookBySlug(bookSlug);
    if (!book) return null;

    let index = -1;
    if (typeof chapterSlugOrNumber === 'number') {
      index = book.chapters.findIndex((c) => c.chapterNumber === chapterSlugOrNumber);
    } else {
      index = book.chapters.findIndex(
        (c) => c.slug === chapterSlugOrNumber || String(c.chapterNumber) === chapterSlugOrNumber
      );
    }

    if (index === -1) return null;

    const chapter = book.chapters[index];
    const prevChapter = index > 0 ? book.chapters[index - 1] : null;
    const nextChapter = index < book.chapters.length - 1 ? book.chapters[index + 1] : null;

    return {
      chapter,
      prevChapter,
      nextChapter,
      book,
    };
  },

  /**
   * Returns list of unique categories across books.
   */
  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    PUBLISHED_BOOKS.forEach((b) => categories.add(b.category));
    return ['All', ...Array.from(categories)];
  },
};
