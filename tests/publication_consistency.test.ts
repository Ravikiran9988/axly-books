import assert from 'node:assert/strict';
import { bookService } from '../src/services/bookService';

async function runPublicationConsistencyTests() {
  console.log('🧪 AXLY BOOKS — publication consistency tests');

  const originalFetch = globalThis.fetch;
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
    writable: true,
  });

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/books?')) {
        return new Response(JSON.stringify({ success: true, books: [], count: 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url === '/api/books') {
        return new Response(JSON.stringify({
          success: true,
          books: [
            { id: 'b1', slug: 'ai-basics', category: 'AI' },
            { id: 'b2', slug: 'data-notes', category: 'Data Engineering' },
            { id: 'b3', slug: 'ai-agents', category: 'AI' },
          ],
          count: 3,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.startsWith('/api/books/')) {
        return new Response(JSON.stringify({ error: 'Book not found.' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Unexpected request' }), { status: 500 });
    }) as typeof fetch;

    const emptyCatalogue = await bookService.getBooks();
    assert.deepEqual(emptyCatalogue, [], 'An empty API catalogue must not be repopulated from static seed data');

    const deletedOrUnpublishedBook = await bookService.getBookBySlug('ml-deep-learning-fundamentals');
    assert.equal(deletedOrUnpublishedBook, null, 'A 404 from the API must not fall back to a static book');

    const categories = await bookService.getCategories();
    assert.deepEqual(categories, ['All', 'AI', 'Data Engineering'], 'Categories must be based on current catalogue data');

    console.log('  ✔ Empty catalogues remain empty.');
    console.log('  ✔ Deleted/unpublished books do not reappear through static fallback.');
    console.log('  ✔ Categories reflect the current API catalogue.');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  }
}

runPublicationConsistencyTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
