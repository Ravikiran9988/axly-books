import { ReadingPreferences, ReadingProgress, Bookmark } from '@/types/reading';

const PREFERENCES_KEY = 'axly_reading_preferences';
const PROGRESS_KEY = 'axly_reading_progress';
const BOOKMARKS_KEY = 'axly_bookmarks';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.75,
  fontFamily: 'serif',
  distractionFree: false,
};

type ProgressListener = () => void;

class ProgressService {
  private listeners: Set<ProgressListener> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private localProgress: Record<string, ReadingProgress> = {};
  private localBookmarks: Bookmark[] = [];
  private localPreferences: ReadingPreferences = DEFAULT_PREFERENCES;
  private isSynced = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initLocal();
      this.syncFromServer();
    }
  }

  private initLocal() {
    try {
      const pRaw = localStorage.getItem(PROGRESS_KEY);
      if (pRaw) this.localProgress = JSON.parse(pRaw);

      const bRaw = localStorage.getItem(BOOKMARKS_KEY);
      if (bRaw) this.localBookmarks = JSON.parse(bRaw);

      const prefRaw = localStorage.getItem(PREFERENCES_KEY);
      if (prefRaw) this.localPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(prefRaw) };
    } catch {
      // Ignore local storage parse error
    }
  }

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

  /**
   * Syncs reading progress, bookmarks, and preferences from backend API
   */
  public async syncFromServer(): Promise<void> {
    try {
      const [progRes, bmRes, prefRes] = await Promise.allSettled([
        fetch('/api/progress', { cache: 'no-store' }),
        fetch('/api/bookmarks', { cache: 'no-store' }),
        fetch('/api/preferences', { cache: 'no-store' }),
      ]);

      if (progRes.status === 'fulfilled' && progRes.value.ok) {
        const data = await progRes.value.json();
        if (data.progress) {
          this.localProgress = { ...this.localProgress, ...data.progress };
          localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.localProgress));
        }
      }

      if (bmRes.status === 'fulfilled' && bmRes.value.ok) {
        const data = await bmRes.value.json();
        if (Array.isArray(data.bookmarks)) {
          this.localBookmarks = data.bookmarks;
          localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.localBookmarks));
        }
      }

      if (prefRes.status === 'fulfilled' && prefRes.value.ok) {
        const data = await prefRes.value.json();
        if (data.preferences) {
          this.localPreferences = {
            ...this.localPreferences,
            theme: data.preferences.readingTheme || this.localPreferences.theme,
            fontSize: data.preferences.fontSize || this.localPreferences.fontSize,
            lineHeight: data.preferences.lineHeight || this.localPreferences.lineHeight,
            fontFamily: data.preferences.fontFamily || this.localPreferences.fontFamily,
            distractionFree: data.preferences.distractionFree ?? this.localPreferences.distractionFree,
          };
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.localPreferences));
        }
      }

      this.isSynced = true;
      this.notify();
    } catch {
      // Offline fallback: rely on local cache
    }
  }

  // --- Reading Preferences ---
  public getPreferences(): ReadingPreferences {
    return this.localPreferences;
  }

  public savePreferences(updates: Partial<ReadingPreferences>): ReadingPreferences {
    this.localPreferences = { ...this.localPreferences, ...updates };

    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.localPreferences));
      this.notify();

      // Sync to server asynchronously
      fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontSize: updates.fontSize,
          lineHeight: updates.lineHeight,
          readingTheme: updates.theme,
          fontFamily: updates.fontFamily,
          distractionFree: updates.distractionFree,
        }),
      }).catch(() => {});
    }

    return this.localPreferences;
  }

  // --- Reading Progress ---
  public getProgress(bookSlug: string): ReadingProgress | null {
    return this.localProgress[bookSlug] || null;
  }

  public getAllProgress(): Record<string, ReadingProgress> {
    return this.localProgress;
  }

  public saveProgress(
    bookSlug: string,
    chapterNumber: number,
    chapterSlug: string,
    percentComplete: number,
    immediate: boolean = false,
    chapterTitle?: string
  ): ReadingProgress {
    const record: ReadingProgress = {
      bookSlug,
      lastChapterNumber: chapterNumber,
      lastChapterSlug: chapterSlug,
      ...(chapterTitle ? { lastChapterTitle: chapterTitle } : {}),
      percentComplete: Math.min(100, Math.max(0, Math.round(percentComplete))),
      lastReadTimestamp: Date.now(),
    };

    this.localProgress[bookSlug] = record;
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.localProgress));
      this.notify();

      // Clear existing debounce timer for this book
      const existing = this.debounceTimers.get(bookSlug);
      if (existing) clearTimeout(existing);

      const sendUpdate = async () => {
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookSlug,
              chapterSlug,
              chapterTitle,
              chapterNumber,
              progressPercentage: record.percentComplete,
            }),
          });
        } catch {
          // Graceful network retry/fallback
        }
      };

      if (immediate) {
        sendUpdate();
      } else {
        // Debounce frequent scroll updates by 2.5 seconds
        const timer = setTimeout(sendUpdate, 2500);
        this.debounceTimers.set(bookSlug, timer);
      }
    }

    return record;
  }

  // --- Bookmarks ---
  public getBookmarks(bookSlug?: string): Bookmark[] {
    if (bookSlug) {
      return this.localBookmarks.filter((b) => b.bookSlug === bookSlug);
    }
    return this.localBookmarks;
  }

  public async addBookmark(
    bookSlug: string,
    bookTitle: string,
    chapterNumber: number,
    chapterSlug: string,
    chapterTitle: string,
    excerpt?: string
  ): Promise<Bookmark> {
    const existing = this.localBookmarks.find(
      (b) => b.bookSlug === bookSlug && b.chapterSlug === chapterSlug
    );
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

    this.localBookmarks.unshift(newBookmark);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.localBookmarks));
      this.notify();

      // Sync to server
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookSlug,
            chapterSlug,
            chapterNumber,
            note: excerpt,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.bookmark?.id) {
            newBookmark.id = data.bookmark.id;
          }
        }
      } catch {
        // Preserved in local storage
      }
    }

    return newBookmark;
  }

  public async removeBookmark(id: string): Promise<void> {
    this.localBookmarks = this.localBookmarks.filter((b) => b.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.localBookmarks));
      this.notify();

      try {
        await fetch(`/api/bookmarks?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch {
        // Ignored
      }
    }
  }

  public async removeBookmarkByChapter(bookSlug: string, chapterSlug: string): Promise<void> {
    this.localBookmarks = this.localBookmarks.filter(
      (b) => !(b.bookSlug === bookSlug && b.chapterSlug === chapterSlug)
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.localBookmarks));
      this.notify();

      try {
        await fetch(
          `/api/bookmarks?bookSlug=${encodeURIComponent(bookSlug)}&chapterSlug=${encodeURIComponent(
            chapterSlug
          )}`,
          { method: 'DELETE' }
        );
      } catch {
        // Ignored
      }
    }
  }

  public isBookmarked(bookSlug: string, chapterSlug: string): boolean {
    return this.localBookmarks.some(
      (b) => b.bookSlug === bookSlug && b.chapterSlug === chapterSlug
    );
  }
}

export const progressService = new ProgressService();
