import { ReadingPreferences, ReadingProgress, Bookmark } from '@/types/reading';

const PREFERENCES_KEY = 'axly_reading_preferences';
const PROGRESS_KEY = 'axly_reading_progress';
const BOOKMARKS_KEY = 'axly_bookmarks';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'dark',
  fontSize: 18,
  lineHeight: 1.75,
  fontFamily: 'serif',
  distractionFree: false,
};

type ProgressListener = () => void;

class ProgressService {
  private listeners: Set<ProgressListener> = new Set();

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in progress listener:', err);
      }
    });
  }

  // --- Reading Preferences ---
  public getPreferences(): ReadingPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
      const data = localStorage.getItem(PREFERENCES_KEY);
      if (!data) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  public savePreferences(updates: Partial<ReadingPreferences>): ReadingPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    this.notify();
    return updated;
  }

  // --- Reading Progress ---
  public getProgress(bookSlug: string): ReadingProgress | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (!data) return null;
      const all: Record<string, ReadingProgress> = JSON.parse(data);
      return all[bookSlug] || null;
    } catch {
      return null;
    }
  }

  public getAllProgress(): Record<string, ReadingProgress> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public saveProgress(
    bookSlug: string,
    chapterNumber: number,
    chapterSlug: string,
    percentComplete: number
  ): ReadingProgress {
    const record: ReadingProgress = {
      bookSlug,
      lastChapterNumber: chapterNumber,
      lastChapterSlug: chapterSlug,
      percentComplete: Math.min(100, Math.max(0, Math.round(percentComplete))),
      lastReadTimestamp: Date.now(),
    };

    if (typeof window !== 'undefined') {
      const current = this.getAllProgress();
      current[bookSlug] = record;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(current));
      this.notify();
    }

    return record;
  }

  // --- Bookmarks ---
  public getBookmarks(bookSlug?: string): Bookmark[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      const list: Bookmark[] = data ? JSON.parse(data) : [];
      if (bookSlug) {
        return list.filter((b) => b.bookSlug === bookSlug);
      }
      return list;
    } catch {
      return [];
    }
  }

  public addBookmark(
    bookSlug: string,
    bookTitle: string,
    chapterNumber: number,
    chapterSlug: string,
    chapterTitle: string,
    excerpt?: string
  ): Bookmark {
    const list = this.getBookmarks();
    const existing = list.find((b) => b.bookSlug === bookSlug && b.chapterSlug === chapterSlug);
    if (existing) return existing;

    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bookSlug,
      bookTitle,
      chapterNumber,
      chapterSlug,
      chapterTitle,
      createdAt: Date.now(),
      excerpt,
    };

    list.unshift(newBookmark);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
      this.notify();
    }
    return newBookmark;
  }

  public removeBookmark(id: string): void {
    const list = this.getBookmarks().filter((b) => b.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
      this.notify();
    }
  }

  public removeBookmarkByChapter(bookSlug: string, chapterSlug: string): void {
    const list = this.getBookmarks().filter(
      (b) => !(b.bookSlug === bookSlug && b.chapterSlug === chapterSlug)
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
      this.notify();
    }
  }

  public isBookmarked(bookSlug: string, chapterSlug: string): boolean {
    const list = this.getBookmarks(bookSlug);
    return list.some((b) => b.chapterSlug === chapterSlug);
  }
}

export const progressService = new ProgressService();
