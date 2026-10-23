import assert from 'node:assert/strict';
import { POST as saveReview } from '../src/app/api/books/[slug]/reviews/route';
import { PATCH as moderateReview, DELETE as deleteReview } from '../src/app/api/books/[slug]/reviews/[reviewId]/route';
import { SESSION_COOKIE_NAME } from '../src/lib/auth';

async function runReviewSecurityTests() {
  console.log('🧪 AXLY BOOKS — ratings and reviews security tests');
  const context = { params: Promise.resolve({ slug: 'missing-book' }) };
  const anonymous = new Request('http://localhost:3000/api/books/missing-book/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rating: 5, title: 'Great', content: 'This is a sufficiently long review.' }),
  });
  assert.equal((await saveReview(anonymous, context)).status, 401, 'Anonymous users cannot submit reviews');

  const forgedCookie = new Request('http://localhost:3000/api/books/missing-book/reviews/rev_missing', {
    method: 'DELETE',
    headers: { cookie: `${SESSION_COOKIE_NAME}=not-a-valid-session` },
  });
  const itemContext = { params: Promise.resolve({ slug: 'missing-book', reviewId: 'rev_missing' }) };
  assert.equal((await deleteReview(forgedCookie, itemContext)).status, 401, 'Forged sessions cannot delete reviews');
  const forgedModeration = new Request('http://localhost:3000/api/books/missing-book/reviews/rev_missing', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE_NAME}=not-a-valid-session` },
    body: JSON.stringify({ status: 'hidden' }),
  });
  assert.equal((await moderateReview(forgedModeration, itemContext)).status, 401, 'Forged sessions cannot moderate reviews');
  console.log('  ✔ Anonymous submissions and forged-session review mutations are rejected.');
}
runReviewSecurityTests().catch((error) => { console.error(error); process.exitCode = 1; });
