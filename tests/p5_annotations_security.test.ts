import assert from 'node:assert/strict';
import { POST as createAnnotation } from '../src/app/api/reader/annotations/route';
import { PATCH as editAnnotation, DELETE as deleteAnnotation } from '../src/app/api/reader/annotations/[annotationId]/route';
import { POST as submitCorrection } from '../src/app/api/books/[slug]/corrections/route';
import { PATCH as markNotification } from '../src/app/api/reader/notifications/route';
import { SESSION_COOKIE_NAME } from '../src/lib/auth';
async function run() {
 console.log('🧪 AXLY BOOKS — P5 private annotations and author tools security tests');
 const anon = new Request('http://localhost/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookSlug: 'book', chapterSlug: 'chapter', quote: 'A passage', note: 'Private' }) });
 assert.equal((await createAnnotation(anon)).status, 401, 'Anonymous users cannot create annotations');
 assert.equal((await submitCorrection(anon, { params: Promise.resolve({ slug: 'book' }) })).status, 401, 'Anonymous users cannot submit corrections');
 const forged = new Request('http://localhost/api/test', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: SESSION_COOKIE_NAME + '=forged-session' }, body: JSON.stringify({ note: 'steal note' }) });
 const ctx = { params: Promise.resolve({ annotationId: 'not-owned' }) };
 assert.equal((await editAnnotation(forged, ctx)).status, 401, 'Forged sessions cannot edit private annotations');
 assert.equal((await deleteAnnotation(forged, ctx)).status, 401, 'Forged sessions cannot delete private annotations');
 assert.equal((await markNotification(forged)).status, 401, 'Forged sessions cannot read/modify notification state');
 console.log('  ✔ Anonymous submissions and forged-session annotation/notification changes are rejected.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
