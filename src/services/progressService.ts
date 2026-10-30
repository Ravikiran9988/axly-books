import { ReadingPreferences, ReadingProgress, Bookmark } from '@/types/reading';

const PREFERENCES_KEY = 'axly_reading_preferences';
const PROGRESS_KEY = 'axly_reading_progress';
const BOOKMARKS_KEY = 'axly_bookmarks';
const DATA_OWNER_KEY = 'axly_reader_data_owner';
const PREFERENCES_DIRTY_KEY = 'axly_reading_preferences_dirty';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'light', fontSize: 18, lineHeight: 1.75, fontFamily: 'serif', distractionFree: false,
};

type ProgressListener = () => void;
type ProgressMap = Record<string, ReadingProgress>;

interface ServerBookmark {
  id: string; bookSlug: string; bookTitle: string; chapterNumber: number;
  chapterSlug: string; chapterTitle: string; createdAt: number | string;
  note?: string | null; excerpt?: string;
}

function bookmarkKey(bookmark: Pick<Bookmark, 'bookSlug' | 'chapterSlug'>): string {
  return bookmark.bookSlug + '::' + bookmark.chapterSlug;
}

function fromServerBookmark(bookmark: ServerBookmark): Bookmark {
  return {
    id: bookmark.id, bookSlug: bookmark.bookSlug, bookTitle: bookmark.bookTitle,
    chapterNumber: bookmark.chapterNumber, chapterSlug: bookmark.chapterSlug,
    chapterTitle: bookmark.chapterTitle,
    createdAt: typeof bookmark.createdAt === 'number' ? bookmark.createdAt : new Date(bookmark.createdAt).getTime(),
    excerpt: bookmark.note ?? bookmark.excerpt ?? undefined,
  };
}

function toServerPreferences(preferences: ReadingPreferences) {
  return {
    fontSize: preferences.fontSize, lineHeight: preferences.lineHeight,
    readingTheme: preferences.theme, fontFamily: preferences.fontFamily,
    distractionFree: preferences.distractionFree,
  };
}

export class ProgressService {
  private listeners: Set<ProgressListener> = new Set();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private localProgress: ProgressMap = {};
  private localBookmarks: Bookmark[] = [];
  private localPreferences: ReadingPreferences = DEFAULT_PREFERENCES;
  private localInitialized = false;
  private dataOwner = 'guest';
  private authenticatedUserId: string | null = null;
  private hasLocalPreferences = false;
  private preferencesDirty = false;

  constructor() {
    if (typeof window !== 'undefined') this.initLocal();
  }

  private initLocal(): void {
    if (typeof window === 'undefined' || this.localInitialized) return;
    try {
      const pRaw = localStorage.getItem(PROGRESS_KEY);
      const bRaw = localStorage.getItem(BOOKMARKS_KEY);
      const prefRaw = localStorage.getItem(PREFERENCES_KEY);
      if (pRaw) {
        const parsed = JSON.parse(pRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) this.localProgress = parsed as ProgressMap;
      }
      if (bRaw) {
        const parsed = JSON.parse(bRaw);
        if (Array.isArray(parsed)) this.localBookmarks = parsed as Bookmark[];
      }
      if (prefRaw) {
        const parsed = JSON.parse(prefRaw);
        if (parsed && typeof parsed === 'object') {
          this.localPreferences = { ...DEFAULT_PREFERENCES, ...parsed };
          this.hasLocalPreferences = true;
        }
      }
      this.dataOwner = localStorage.getItem(DATA_OWNER_KEY) || 'guest';
      this.preferencesDirty = localStorage.getItem(PREFERENCES_DIRTY_KEY) === 'true';
    } catch {
      // Keep safe defaults when local storage contains malformed data.
    }
    this.localInitialized = true;
  }

  private persistProgress(): void {
    if (typeof window !== 'undefined') localStorage.setItem(PROGRESS_KEY, JSON.stringify(this.localProgress));
  }
  private persistBookmarks(): void {
    if (typeof window !== 'undefined') localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(this.localBookmarks));
  }
  private persistPreferences(): void {
    if (typeof window !== 'undefined') localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.localPreferences));
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try { listener(); } catch (error) { console.error('Error in reading-data listener:', error); }
    });
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private clearLocalState(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.localProgress = {};
    this.localBookmarks = [];
    this.localPreferences = DEFAULT_PREFERENCES;
    this.hasLocalPreferences = false;
    this.preferencesDirty = false;
    this.authenticatedUserId = null;
    this.dataOwner = 'guest';
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(BOOKMARKS_KEY);
      localStorage.removeItem(PREFERENCES_KEY);
      localStorage.removeItem(PREFERENCES_DIRTY_KEY);
      localStorage.setItem(DATA_OWNER_KEY, 'guest');
    }
  }

  /**
   * Called after session restoration, login, or registration. Guest data is
   * migrated into the first account that claims it. A different account never
   * inherits the previous account's local cache.
   */
  public async syncFromServer(userId: string): Promise<void> {
    if (typeof window === 'undefined' || !userId) return;
    this.initLocal();

    const previousOwner = localStorage.getItem(DATA_OWNER_KEY) || this.dataOwner || 'guest';
    const isGuestMigration = previousOwner === 'guest';
    if (previousOwner !== 'guest' && previousOwner !== userId) this.clearLocalState();
    this.authenticatedUserId = userId;

    const [progressResult, bookmarksResult, preferencesResult] = await Promise.allSettled([
      fetch('/api/progress', { cache: 'no-store' }),
      fetch('/api/bookmarks', { cache: 'no-store' }),
      fetch('/api/preferences', { cache: 'no-store' }),
    ]);

    // Merge progress by timestamp and upload any guest/offline record newer than
    // the server's copy. Server-only records remain available as well.
    if (progressResult.status === 'fulfilled' && progressResult.value.ok) {
      try {
        const data = await progressResult.value.json();
        const serverProgress = data.progress && typeof data.progress === 'object' ? data.progress as ProgressMap : {};
        const mergedProgress: ProgressMap = { ...serverProgress };
        for (const [bookSlug, localRecord] of Object.entries(this.localProgress)) {
          const remoteRecord = serverProgress[bookSlug];
          if (!remoteRecord || Number(localRecord.lastReadTimestamp || 0) > Number(remoteRecord.lastReadTimestamp || 0)) {
            try {
              const response = await fetch('/api/progress', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bookSlug, chapterSlug: localRecord.lastChapterSlug,
                  chapterTitle: localRecord.lastChapterTitle,
                  chapterNumber: localRecord.lastChapterNumber,
                  progressPercentage: localRecord.percentComplete,
                }),
              });
              if (response.ok) {
                const payload = await response.json();
                mergedProgress[bookSlug] = payload.progress || localRecord;
              } else mergedProgress[bookSlug] = localRecord;
            } catch { mergedProgress[bookSlug] = localRecord; }
          }
        }
        this.localProgress = mergedProgress;
        this.persistProgress();
      } catch {
        // Preserve the existing local cache when the server response is malformed.
      }
    }

    // The database allows one bookmark per reader/book/chapter. Merge using that
    // identity and retain local-only items if an individual migration request fails.
    if (bookmarksResult.status === 'fulfilled' && bookmarksResult.value.ok) {
      try {
        const data = await bookmarksResult.value.json();
        const remote = Array.isArray(data.bookmarks)
          ? (data.bookmarks as ServerBookmark[]).map(fromServerBookmark) : [];
        const merged = [...remote];
        const seen = new Set(remote.map(bookmarkKey));
        for (const localBookmark of this.localBookmarks) {
          const key = bookmarkKey(localBookmark);
          if (seen.has(key)) continue;
          let retainedBookmark = localBookmark;
          try {
            const response = await fetch('/api/bookmarks', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bookSlug: localBookmark.bookSlug, chapterSlug: localBookmark.chapterSlug,
                chapterNumber: localBookmark.chapterNumber, note: localBookmark.excerpt,
              }),
            });
            if (response.ok) {
              const payload = await response.json();
              if (payload.bookmark) retainedBookmark = fromServerBookmark(payload.bookmark as ServerBookmark);
            }
          } catch {
            // Keep the local bookmark so the next authenticated sync can retry it.
          }
          merged.push(retainedBookmark);
          seen.add(key);
        }
        this.localBookmarks = merged;
        this.persistBookmarks();
      } catch {
        // Preserve the existing local cache when the server response is malformed.
      }
    }

    // Guest-customized preferences are copied into a new account. For an
    // established account, the server remains authoritative unless a prior
    // preference update failed and left a dirty marker.
    if (preferencesResult.status === 'fulfilled' && preferencesResult.value.ok) {
      try {
        const data = await preferencesResult.value.json();
        if (data.preferences) {
          const shouldUploadLocal = (isGuestMigration && this.hasLocalPreferences) || this.preferencesDirty;
          if (shouldUploadLocal) {
            try {
              const response = await fetch('/api/preferences', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toServerPreferences(this.localPreferences)),
              });
              if (response.ok) {
                this.preferencesDirty = false;
                localStorage.removeItem(PREFERENCES_DIRTY_KEY);
              } else {
                this.preferencesDirty = true;
                localStorage.setItem(PREFERENCES_DIRTY_KEY, 'true');
              }
            } catch {
              this.preferencesDirty = true;
              localStorage.setItem(PREFERENCES_DIRTY_KEY, 'true');
            }
          } else {
            this.localPreferences = {
              theme: data.preferences.readingTheme || DEFAULT_PREFERENCES.theme,
              fontSize: data.preferences.fontSize ?? DEFAULT_PREFERENCES.fontSize,
              lineHeight: data.preferences.lineHeight ?? DEFAULT_PREFERENCES.lineHeight,
              fontFamily: data.preferences.fontFamily || DEFAULT_PREFERENCES.fontFamily,
              distractionFree: data.preferences.distractionFree ?? DEFAULT_PREFERENCES.distractionFree,
            };
            this.hasLocalPreferences = true;
            this.persistPreferences();
          }
        }
      } catch {
        // Preserve local preferences if the server response is malformed.
      }
    }

    this.dataOwner = userId;
    localStorage.setItem(DATA_OWNER_KEY, userId);
    this.notify();
  }

  public clearForLogout(): void {
    this.initLocal();
    this.clearLocalState();
    this.notify();
  }

  public getPreferences(): ReadingPreferences {
    this.initLocal();
    return this.localPreferences;
  }

  public savePreferences(updates: Partial<ReadingPreferences>): ReadingPreferences {
    this.initLocal();
    this.localPreferences = { ...this.localPreferences, ...updates };
    this.hasLocalPreferences = true;
    this.persistPreferences();
    this.notify();

    if (this.authenticatedUserId && typeof window !== 'undefined') {
      this.preferencesDirty = true;
      localStorage.setItem(PREFERENCES_DIRTY_KEY, 'true');
      fetch('/api/preferences', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toServerPreferences(this.localPreferences)),
      }).then((response) => {
        if (response.ok) {
          this.preferencesDirty = false;
          localStorage.removeItem(PREFERENCES_DIRTY_KEY);
        }
      }).catch(() => {
        // The dirty marker lets the next authenticated sync retry this update.
      });
    }
    return this.localPreferences;
  }

  public getProgress(bookSlug: string): ReadingProgress | null {
    this.initLocal();
    return this.localProgress[bookSlug] || null;
  }
  public getAllProgress(): ProgressMap {
    this.initLocal();
    return this.localProgress;
  }

  public saveProgress(
    bookSlug: string, chapterNumber: number, chapterSlug: string,
    percentComplete: number, immediate: boolean = false, chapterTitle?: string
  ): ReadingProgress {
    this.initLocal();
    const record: ReadingProgress = {
      bookSlug, lastChapterNumber: chapterNumber, lastChapterSlug: chapterSlug,
      ...(chapterTitle ? { lastChapterTitle: chapterTitle } : {}),
      percentComplete: Math.min(100, Math.max(0, Math.round(percentComplete))),
      lastReadTimestamp: Date.now(),
    };
    this.localProgress[bookSlug] = record;
    this.persistProgress();
    this.notify();

    const existing = this.debounceTimers.get(bookSlug);
    if (existing) clearTimeout(existing);
    const sendUpdate = async () => {
      if (!this.authenticatedUserId) return;
      try {
        await fetch('/api/progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookSlug, chapterSlug, chapterTitle, chapterNumber,
            progressPercentage: record.percentComplete,
          }),
        });
      } catch {
        // Local progress remains available for a later authenticated sync.
      }
    };

    if (immediate) void sendUpdate();
    else if (typeof window !== 'undefined') {
      this.debounceTimers.set(bookSlug, setTimeout(() => void sendUpdate(), 2500));
    }
    return record;
  }

  public getBookmarks(bookSlug?: string): Bookmark[] {
    this.initLocal();
    return bookSlug
      ? this.localBookmarks.filter((bookmark) => bookmark.bookSlug === bookSlug)
      : this.localBookmarks;
  }

  public async addBookmark(
    bookSlug: string, bookTitle: string, chapterNumber: number,
    chapterSlug: string, chapterTitle: string, excerpt?: string
  ): Promise<Bookmark> {
    this.initLocal();
    const existing = this.localBookmarks.find(
      (bookmark) => bookmark.bookSlug === bookSlug && bookmark.chapterSlug === chapterSlug
    );
    if (existing) return existing;

    const newBookmark: Bookmark = {
      id: 'bm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      bookSlug, bookTitle, chapterNumber, chapterSlug, chapterTitle,
      createdAt: Date.now(), excerpt,
    };
    this.localBookmarks.unshift(newBookmark);
    this.persistBookmarks();
    this.notify();

    if (this.authenticatedUserId && typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/bookmarks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookSlug, chapterSlug, chapterNumber, note: excerpt }),
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload.bookmark?.id) {
            newBookmark.id = payload.bookmark.id;
            this.persistBookmarks();
            this.notify();
          }
        }
      } catch {
        // Retain the local bookmark for retry during a later authenticated sync.
      }
    }
    return newBookmark;
  }

  public async removeBookmark(id: string): Promise<void> {
    this.initLocal();
    this.localBookmarks = this.localBookmarks.filter((bookmark) => bookmark.id !== id);
    this.persistBookmarks();
    this.notify();
    if (this.authenticatedUserId && typeof window !== 'undefined') {
      try { await fetch('/api/bookmarks?id=' + encodeURIComponent(id), { method: 'DELETE' }); }
      catch { /* Local removal remains applied. */ }
    }
  }

  public async removeBookmarkByChapter(bookSlug: string, chapterSlug: string): Promise<void> {
    this.initLocal();
    this.localBookmarks = this.localBookmarks.filter(
      (bookmark) => !(bookmark.bookSlug === bookSlug && bookmark.chapterSlug === chapterSlug)
    );
    this.persistBookmarks();
    this.notify();
    if (this.authenticatedUserId && typeof window !== 'undefined') {
      try {
        await fetch(
          '/api/bookmarks?bookSlug=' + encodeURIComponent(bookSlug) +
          '&chapterSlug=' + encodeURIComponent(chapterSlug),
          { method: 'DELETE' }
        );
      } catch { /* Local removal remains applied. */ }
    }
  }

  public isBookmarked(bookSlug: string, chapterSlug: string): boolean {
    this.initLocal();
    return this.localBookmarks.some(
      (bookmark) => bookmark.bookSlug === bookSlug && bookmark.chapterSlug === chapterSlug
    );
  }
}

export const progressService = new ProgressService();
