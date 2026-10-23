import assert from 'node:assert/strict';
import { POST as importBookHandler } from '../src/app/api/admin/books/import/route';
import { SESSION_COOKIE_NAME } from '../src/lib/auth';

async function runPhase3LaunchChecks() {
  console.log('🧪 AXLY BOOKS — P3 launch-readiness checks');

  // The import endpoint must reject anonymous requests before parsing payloads
  // or touching storage/database services.
  const anonymousRequest = new Request('http://localhost:3000/api/admin/books/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      book: { title: 'Should not be imported' },
      chapters: [],
      originalPdfUrl: 'https://example.com/book.pdf',
    }),
  });
  const anonymousResponse = await importBookHandler(anonymousRequest);
  assert.equal(anonymousResponse.status, 401, 'Anonymous PDF imports must be rejected with 401');

  const responseBody = await anonymousResponse.json() as { error?: string };
  assert.match(responseBody.error ?? '', /authentication|required|log in/i, 'Response should explain authentication is required');

  // A forged cookie value must not grant admin privileges.
  const forgedCookieRequest = new Request('http://localhost:3000/api/admin/books/import', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=not-a-real-session-token`,
    },
    body: JSON.stringify({ book: {}, chapters: [], originalPdfUrl: 'https://example.com/book.pdf' }),
  });
  const forgedCookieResponse = await importBookHandler(forgedCookieRequest);
  assert.equal(forgedCookieResponse.status, 401, 'Invalid session cookies must not authorize PDF imports');

  console.log('  ✔ Anonymous and forged-session PDF import requests are rejected.');
  console.log('  ✔ P3 launch-readiness checks passed.');
}

runPhase3LaunchChecks().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
