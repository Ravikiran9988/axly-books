import assert from 'node:assert/strict';
import { ProgressService } from '../src/services/progressService';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

async function run() {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalFetch = globalThis.fetch;
  const storage = new MemoryStorage();

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

  try {
    storage.setItem('axly_reading_preferences', JSON.stringify({
      theme: 'sepia', fontSize: 22, lineHeight: 1.9, fontFamily: 'sans', distractionFree: true,
    }));
    storage.setItem('axly_reading_progress', JSON.stringify({
      'local-book': {
        bookSlug: 'local-book', lastChapterNumber: 2, lastChapterSlug: 'chapter-two',
        lastChapterTitle: 'Chapter Two', percentComplete: 40, lastReadTimestamp: 300,
      },
      'shared-book': {
        bookSlug: 'shared-book', lastChapterNumber: 3, lastChapterSlug: 'chapter-three-local',
        lastChapterTitle: 'Local Newer Chapter', percentComplete: 70, lastReadTimestamp: 500,
      },
    }));
    storage.setItem('axly_bookmarks', JSON.stringify([{
      id: 'guest-bookmark', bookSlug: 'guest-book', bookTitle: 'Guest Book',
      chapterNumber: 1, chapterSlug: 'chapter-one', chapterTitle: 'Chapter One',
      createdAt: 100, excerpt: 'Guest note',
    }]));

    const calls: Array<{ url: string; method: string; body?: Record<string, string | number | boolean | undefined> }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method || 'GET').toUpperCase();
      const body: Record<string, string | number | boolean | undefined> =
        typeof init?.body === 'string'
          ? JSON.parse(init.body) as Record<string, string | number | boolean | undefined>
          : {};
      calls.push({ url, method, body });

      if (method === 'GET' && url === '/api/progress') {
        return new Response(JSON.stringify({ progress: {
          'shared-book': {
            bookSlug: 'shared-book', lastChapterNumber: 1, lastChapterSlug: 'chapter-one',
            lastChapterTitle: 'Server Older Chapter', percentComplete: 20, lastReadTimestamp: 200,
          },
          'server-book': {
            bookSlug: 'server-book', lastChapterNumber: 4, lastChapterSlug: 'chapter-four',
            percentComplete: 80, lastReadTimestamp: 600,
          },
        }}), { status: 200 });
      }
      if (method === 'GET' && url === '/api/bookmarks') {
        return new Response(JSON.stringify({ bookmarks: [{
          id: 'server-bookmark', bookSlug: 'server-book', bookTitle: 'Server Book',
          chapterNumber: 2, chapterSlug: 'chapter-two', chapterTitle: 'Chapter Two',
          createdAt: 200, note: null,
        }]}), { status: 200 });
      }
      if (method === 'GET' && url === '/api/preferences') {
        return new Response(JSON.stringify({ preferences: {
          readingTheme: 'dark', fontSize: 18, lineHeight: 1.75,
          fontFamily: 'serif', distractionFree: false,
        }}), { status: 200 });
      }
      if (method === 'POST' && url === '/api/progress') {
        return new Response(JSON.stringify({ success: true, progress: {
          bookSlug: body.bookSlug, lastChapterNumber: body.chapterNumber,
          lastChapterSlug: body.chapterSlug, lastChapterTitle: body.chapterTitle,
          percentComplete: body.progressPercentage, lastReadTimestamp: 700,
        }}), { status: 200 });
      }
      if (method === 'POST' && url === '/api/bookmarks') {
        return new Response(JSON.stringify({ success: true, bookmark: {
          id: 'migrated-guest-bookmark', bookSlug: body.bookSlug, bookTitle: 'Guest Book',
          chapterNumber: body.chapterNumber, chapterSlug: body.chapterSlug,
          chapterTitle: 'Chapter One', createdAt: 100, note: body.note,
        }}), { status: 201 });
      }
      if (method === 'PUT' && url === '/api/preferences') {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'Unexpected request: ' + method + ' ' + url }), { status: 500 });
    }) as typeof fetch;

    const service = new ProgressService();
    await service.syncFromServer('reader-123');

    assert.equal(service.getPreferences().theme, 'sepia', 'guest preferences should migrate into the new account');
    assert.equal(service.getPreferences().fontSize, 22);
    assert.equal(service.getAllProgress()['shared-book'].lastChapterSlug, 'chapter-three-local',
      'newer local progress should win over an older server record');
    assert.ok(service.getAllProgress()['server-book'], 'server-only progress should be retained');
    assert.ok(calls.some((call) => call.method === 'POST' && call.url === '/api/progress' && call.body.bookSlug === 'local-book'),
      'guest-only progress should migrate');
    assert.ok(calls.some((call) => call.method === 'POST' && call.url === '/api/progress' && call.body.bookSlug === 'shared-book'),
      'newer local progress should be uploaded');
    assert.equal(service.getBookmarks().length, 2, 'server and guest-only bookmarks should be merged');
    assert.equal(service.getBookmarks().find((item) => item.bookSlug === 'guest-book')?.id, 'migrated-guest-bookmark',
      'migrated bookmarks should store the real database ID');
    assert.ok(calls.some((call) => call.method === 'PUT' && call.url === '/api/preferences' && call.body.readingTheme === 'sepia'),
      'customized guest preferences should be uploaded');
    assert.equal(storage.getItem('axly_reader_data_owner'), 'reader-123');

    // Local state belonging to a different signed-in account must not be copied.
    const secondStorage = new MemoryStorage();
    secondStorage.setItem('axly_reader_data_owner', 'previous-reader');
    secondStorage.setItem('axly_reading_progress', JSON.stringify({
      'private-book': {
        bookSlug: 'private-book', lastChapterNumber: 1, lastChapterSlug: 'chapter-one',
        percentComplete: 10, lastReadTimestamp: 999,
      },
    }));
    Object.defineProperty(globalThis, 'localStorage', { value: secondStorage, configurable: true });
    const secondCalls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method || 'GET').toUpperCase();
      secondCalls.push({ url, method });
      if (method === 'GET' && url === '/api/progress') return new Response(JSON.stringify({ progress: {} }), { status: 200 });
      if (method === 'GET' && url === '/api/bookmarks') return new Response(JSON.stringify({ bookmarks: [] }), { status: 200 });
      if (method === 'GET' && url === '/api/preferences') return new Response(JSON.stringify({ preferences: {} }), { status: 200 });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof fetch;

    const secondService = new ProgressService();
    await secondService.syncFromServer('new-reader');
    assert.deepEqual(secondService.getAllProgress(), {}, 'a different account must not inherit previous account progress');
    assert.ok(!secondCalls.some((call) => call.method === 'POST'), 'old account data must not be migrated to a new account');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
