import assert from 'node:assert/strict';
import { POST as createComment } from '../src/app/api/books/[slug]/chapters/[chapterSlug]/comments/route';
import { POST as voteComment } from '../src/app/api/comments/[commentId]/vote/route';
import { POST as reportComment } from '../src/app/api/comments/[commentId]/report/route';
import { PATCH as editComment, DELETE as deleteComment } from '../src/app/api/comments/[commentId]/route';
import { SESSION_COOKIE_NAME } from '../src/lib/auth';

async function runP4CommentSecurityTests() {
  console.log('🧪 AXLY BOOKS — P4 comments security tests');
  const anonymous = new Request('http://localhost:3000/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'A helpful thought.' }) });
  const context = { params: Promise.resolve({ slug: 'missing-book', chapterSlug: 'missing-chapter' }) };
  assert.equal((await createComment(anonymous, context)).status, 401, 'Anonymous users cannot post comments');

  const forgedCookie = new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE_NAME}=not-a-valid-session` },
    body: JSON.stringify({ content: 'Attempted spam.' }),
  });
  const commentContext = { params: Promise.resolve({ commentId: 'comment-not-found' }) };
  assert.equal((await voteComment(forgedCookie, commentContext)).status, 401, 'Forged sessions cannot vote');
  assert.equal((await reportComment(forgedCookie, commentContext)).status, 401, 'Forged sessions cannot submit reports');
  assert.equal((await editComment(forgedCookie, commentContext)).status, 401, 'Forged sessions cannot edit comments');
  assert.equal((await deleteComment(forgedCookie, commentContext)).status, 401, 'Forged sessions cannot delete comments');

  console.log('  ✔ Anonymous comment creation is rejected.');
  console.log('  ✔ Forged sessions cannot vote, report, edit, or delete comments.');
}
runP4CommentSecurityTests().catch((error) => { console.error(error); process.exitCode = 1; });
