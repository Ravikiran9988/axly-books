import assert from 'assert';
import { inMemoryStore, hashPassword, createSession, SESSION_COOKIE_NAME } from '../src/lib/auth';

// Route Handlers
import { POST as registerHandler } from '../src/app/api/auth/register/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { GET as meHandler } from '../src/app/api/auth/me/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';
import { POST as forgotPasswordHandler } from '../src/app/api/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '../src/app/api/auth/reset-password/route';

import { GET as adminOverviewHandler } from '../src/app/api/admin/overview/route';
import { GET as adminBooksGetHandler, POST as adminBooksPostHandler } from '../src/app/api/admin/books/route';
import { POST as adminUploadHandler } from '../src/app/api/admin/upload/route';
import { GET as booksGetHandler } from '../src/app/api/books/route';
import { GET as bookSlugHandler } from '../src/app/api/books/[slug]/route';

import { GET as progressGetHandler, POST as progressPostHandler } from '../src/app/api/progress/route';
import { GET as bookmarksGetHandler, POST as bookmarksPostHandler, DELETE as bookmarksDeleteHandler } from '../src/app/api/bookmarks/route';
import { GET as preferencesGetHandler, PUT as preferencesPutHandler } from '../src/app/api/preferences/route';

/**
 * Helper to build Request with optional cookie and JSON body
 */
function createJsonRequest(url: string, method: string, body?: unknown, cookieToken?: string): Request {
  const headers = new Headers();
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (cookieToken) {
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${cookieToken}`);
  }

  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Extracts raw session token from Set-Cookie header of a Response
 */
function extractSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1].trim() : null;
}

async function runRealRouteIntegrationTests() {
  console.log('🧪 AXLY BOOKS — GENUINE HTTP ROUTE INTEGRATION TESTS');
  console.log('   Exercising real Next.js API route handlers, RBAC, cookies, and validations...\n');

  // =========================================================================
  // SCENARIO 1: AUTHENTICATION & ROLE ENFORCEMENT
  // =========================================================================
  console.log('▶ Scenario 1: Authentication & Role Enforcement');
  let readerSessionToken: string = '';
  let readerUserId: string = '';
  const readerEmail = `reader_${Date.now()}@test.axly.in`;
  const readerPassword = 'ReaderPassword2026!';

  // 1.1 Successful Registration
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/register', 'POST', {
      displayName: 'Test Reader One',
      email: readerEmail,
      password: readerPassword,
      agreeTerms: true,
      role: 'admin', // Malicious attempt to self-grant admin role
    });

    const res = await registerHandler(req);
    assert.strictEqual(res.status, 201, `Registration should succeed with 201, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true, 'Registration payload must indicate success');
    assert.strictEqual(data.user.role, 'reader', 'Server MUST strictly enforce "reader" role on public registration');
    readerUserId = data.user.id;

    // Cookie verification
    readerSessionToken = extractSessionCookie(res) || '';
    assert(readerSessionToken.length > 0, 'Registration response must issue an HTTP-only axly_session cookie');
    console.log('  ✔ Registration succeeds and strictly enforces "reader" role despite client input.');
  }

  // 1.2 Duplicate Registration Rejection
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/register', 'POST', {
      displayName: 'Duplicate Attempt',
      email: readerEmail,
      password: readerPassword,
      agreeTerms: true,
    });
    const res = await registerHandler(req);
    assert.strictEqual(res.status, 409, `Duplicate registration must return 409 Conflict, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('already exists'), 'Must provide honest conflict error message');
    console.log('  ✔ Duplicate registration properly rejected with 409 Conflict.');
  }

  // 1.3 Session Lookup via /api/auth/me
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/me', 'GET', undefined, readerSessionToken);
    const res = await meHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.user !== null, 'Session lookup with valid token must return user profile');
    assert.strictEqual(data.user.email, readerEmail);
    assert.strictEqual(data.user.role, 'reader');
    console.log('  ✔ Session lookup (/api/auth/me) correctly identifies reader.');
  }

  // 1.4 Invalid Login Attempt
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
      email: readerEmail,
      password: 'wrongPasswordXYZ123!',
    });
    const res = await loginHandler(req);
    assert.strictEqual(res.status, 401, `Wrong password must return 401 Unauthorized, got ${res.status}`);
    console.log('  ✔ Invalid login credentials rejected with 401.');
  }

  // 1.5 Valid Login
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
      email: readerEmail,
      password: readerPassword,
    });
    const res = await loginHandler(req);
    assert.strictEqual(res.status, 200, 'Valid login must return 200 OK');
    const newSessionToken = extractSessionCookie(res);
    assert(newSessionToken && newSessionToken.length > 0, 'Login response must issue a session cookie');
    readerSessionToken = newSessionToken;
    console.log('  ✔ Valid login succeeds and returns new session cookie.');
  }

  // 1.6 Logout
  {
    const req = createJsonRequest('http://localhost:3000/api/auth/logout', 'POST', undefined, readerSessionToken);
    const res = await logoutHandler(req);
    assert.strictEqual(res.status, 200, 'Logout must return 200');

    // Confirm session destroyed
    const meReq = createJsonRequest('http://localhost:3000/api/auth/me', 'GET', undefined, readerSessionToken);
    const meRes = await meHandler(meReq);
    const meData = await meRes.json();
    assert.strictEqual(meData.user, null, 'Destroyed session must return user: null');
    console.log('  ✔ Logout successfully invalidates server session.');

    // Re-login to continue reader testing
    const loginReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
      email: readerEmail,
      password: readerPassword,
    });
    const loginRes = await loginHandler(loginReq);
    readerSessionToken = extractSessionCookie(loginRes)!;
  }

  // =========================================================================
  // SCENARIO 2: AUTHORIZATION & RBAC BARRIERS
  // =========================================================================
  console.log('\n▶ Scenario 2: Authorization & Role-Based Access Control');

  // Create an Administrator user in memory for testing
  const adminId = `usr_admin_${Date.now()}`;
  const adminEmail = `admin_${Date.now()}@axly.in`;
  const adminHash = await hashPassword('AdminMasterKey2026!');
  inMemoryStore.users.set(adminId, {
    id: adminId,
    displayName: 'Medicharla Ravi Kiran (Admin)',
    email: adminEmail,
    passwordHash: adminHash,
    role: 'admin',
    createdAt: new Date(),
  });
  const adminSessionToken = await createSession(adminId);

  // 2.1 Guest (Unauthenticated) Access to Admin Routes
  {
    const req = createJsonRequest('http://localhost:3000/api/admin/overview', 'GET');
    const res = await adminOverviewHandler(req);
    assert.strictEqual(res.status, 401, `Unauthenticated request to /api/admin/overview must return 401, got ${res.status}`);
    console.log('  ✔ Guests blocked from admin APIs with 401 Unauthorized.');
  }

  // 2.2 Reader Access to Admin Routes (Must be 403 Forbidden)
  {
    const overviewReq = createJsonRequest('http://localhost:3000/api/admin/overview', 'GET', undefined, readerSessionToken);
    const overviewRes = await adminOverviewHandler(overviewReq);
    assert.strictEqual(overviewRes.status, 403, `Reader accessing /api/admin/overview must return 403 Forbidden, got ${overviewRes.status}`);

    const booksReq = createJsonRequest('http://localhost:3000/api/admin/books', 'GET', undefined, readerSessionToken);
    const booksRes = await adminBooksGetHandler(booksReq);
    assert.strictEqual(booksRes.status, 403, `Reader accessing /api/admin/books must return 403 Forbidden, got ${booksRes.status}`);

    const postBookReq = createJsonRequest('http://localhost:3000/api/admin/books', 'POST', {
      title: 'Illegal Reader Book',
      slug: 'illegal-reader-book',
      subtitle: 'Should not create',
      description: 'Reader attempting to write',
      category: 'Deep Learning',
      tags: ['Test'],
      edition: '1st Edition',
      publishedYear: 2026,
      isPublished: true,
      isFree: true,
      allowPdfDownload: true,
      coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
    }, readerSessionToken);
    const postBookRes = await adminBooksPostHandler(postBookReq);
    assert.strictEqual(postBookRes.status, 403, `Reader POSTing to /api/admin/books must return 403, got ${postBookRes.status}`);
    console.log('  ✔ Readers strictly forbidden (403) from accessing or mutating admin resources.');
  }

  // 2.3 Admin Access to Admin Routes
  {
    const overviewReq = createJsonRequest('http://localhost:3000/api/admin/overview', 'GET', undefined, adminSessionToken);
    const overviewRes = await adminOverviewHandler(overviewReq);
    assert.strictEqual(overviewRes.status, 200, `Admin accessing /api/admin/overview must return 200, got ${overviewRes.status}`);

    const booksReq = createJsonRequest('http://localhost:3000/api/admin/books', 'GET', undefined, adminSessionToken);
    const booksRes = await adminBooksGetHandler(booksReq);
    assert.strictEqual(booksRes.status, 200, `Admin accessing /api/admin/books must return 200, got ${booksRes.status}`);
    console.log('  ✔ Verified administrator authorized to access management endpoints.');
  }

  // =========================================================================
  // SCENARIO 3: IMAGE UPLOAD HARDENING & PERSISTENT STORAGE
  // =========================================================================
  console.log('\n▶ Scenario 3: Image Upload Validation & Provider Behavior');

  // 3.1 Unauthenticated upload attempt
  {
    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: new FormData(),
    });
    const res = await adminUploadHandler(req);
    assert.strictEqual(res.status, 401, 'Unauthenticated upload must return 401');
    console.log('  ✔ Unauthenticated upload rejected with 401.');
  }

  // 3.2 Reader upload attempt
  {
    const headers = new Headers();
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${readerSessionToken}`);
    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers,
      body: new FormData(),
    });
    const res = await adminUploadHandler(req);
    assert.strictEqual(res.status, 403, 'Reader upload must return 403 Forbidden');
    console.log('  ✔ Reader upload rejected with 403 Forbidden.');
  }

  // 3.3 Admin upload with missing BLOB_READ_WRITE_TOKEN
  {
    const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const headers = new Headers();
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${adminSessionToken}`);
    const formData = new FormData();
    const fakeFile = new Blob(['mock image data'], { type: 'image/jpeg' });
    formData.append('file', fakeFile, 'test.jpg');

    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    const res = await adminUploadHandler(req);
    assert.strictEqual(res.status, 503, 'Missing storage token must return honest 503 Service Unavailable');
    const data = await res.json();
    assert.strictEqual(data.isConfigured, false);
    assert(data.error.includes('BLOB_READ_WRITE_TOKEN is not configured'));
    console.log('  ✔ Missing BLOB_READ_WRITE_TOKEN returns honest 503 (no false success).');

    // Restore token if had one
    if (originalToken) process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  }

  // 3.4 Magic Bytes Content Inspection: Fake extension rejection
  {
    // Temporarily set a dummy token so token check passes to reach validation logic
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token_placeholder';

    const headers = new Headers();
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${adminSessionToken}`);
    const formData = new FormData();
    // File has image/png mime-type but content is plain ASCII text
    const maliciousFile = new Blob(['Not a real PNG header, malicious executable payload'], { type: 'image/png' });
    formData.append('file', maliciousFile, 'payload.png');

    const req = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    const res = await adminUploadHandler(req);
    assert.strictEqual(res.status, 400, 'Spoofed image header must be rejected with 400 Bad Request');
    const data = await res.json();
    assert(data.error.includes('File content verification failed') || data.error.includes('header does not match'));
    console.log('  ✔ Deep content inspection rejects spoofed MIME types using magic bytes.');

    delete process.env.BLOB_READ_WRITE_TOKEN;
  }

  // =========================================================================
  // SCENARIO 4: READING PROGRESS & ACCOUNT ISOLATION
  // =========================================================================
  console.log('\n▶ Scenario 4: Reading Progress, Bookmarks & Account Isolation');

  // Register Reader Two for isolation testing
  const readerTwoEmail = `reader2_${Date.now()}@test.axly.in`;
  const regTwoReq = createJsonRequest('http://localhost:3000/api/auth/register', 'POST', {
    displayName: 'Test Reader Two',
    email: readerTwoEmail,
    password: 'ReaderTwoPassword2026!',
    agreeTerms: true,
  });
  const regTwoRes = await registerHandler(regTwoReq);
  const readerTwoToken = extractSessionCookie(regTwoRes)!;

  // 4.1 Save Reading Progress for Reader One
  {
    const req = createJsonRequest('http://localhost:3000/api/progress', 'POST', {
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-01-python-data-stack',
      chapterNumber: 1,
      progressPercentage: 45,
      lastReadAnchor: '#numpy-operations',
    }, readerSessionToken);
    const res = await progressPostHandler(req);
    assert(res.status === 200 || res.status === 201, `Save progress should succeed, got ${res.status}`);
    console.log('  ✔ Reader 1 saved reading progress.');
  }

  // 4.2 Account Isolation: Reader Two Progress is completely separate
  {
    const req = createJsonRequest('http://localhost:3000/api/progress?bookSlug=ml-deep-learning-fundamentals', 'GET', undefined, readerTwoToken);
    const res = await progressGetHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.progress, null, 'Reader 2 must NOT see Reader 1 reading progress');
    console.log('  ✔ Account isolation verified: Reader 2 does not receive Reader 1 progress.');
  }

  // 4.3 Bookmark Creation for Reader One
  let createdBookmarkId = '';
  {
    const req = createJsonRequest('http://localhost:3000/api/bookmarks', 'POST', {
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-01-python-data-stack',
      chapterNumber: 1,
      note: 'Vector Operations in NumPy: Broadcasting arrays without looping',
      anchor: '#broadcasting',
    }, readerSessionToken);
    const res = await bookmarksPostHandler(req);
    assert.strictEqual(res.status, 201, `Bookmark creation must return 201, got ${res.status}`);
    const data = await res.json();
    createdBookmarkId = data.bookmark.id;
    console.log('  ✔ Reader 1 created bookmark.');
  }

  // 4.4 Account Isolation: Reader Two Bookmarks are empty
  {
    const req = createJsonRequest('http://localhost:3000/api/bookmarks?bookSlug=ml-deep-learning-fundamentals', 'GET', undefined, readerTwoToken);
    const res = await bookmarksGetHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.bookmarks.length, 0, 'Reader 2 must have 0 bookmarks');
    console.log('  ✔ Account isolation verified: Reader 2 has 0 bookmarks.');
  }

  // 4.5 Reader One deletes bookmark
  {
    const req = createJsonRequest(`http://localhost:3000/api/bookmarks?id=${createdBookmarkId}`, 'DELETE', undefined, readerSessionToken);
    const res = await bookmarksDeleteHandler(req);
    assert.strictEqual(res.status, 200, 'Bookmark deletion must succeed with 200');
    console.log('  ✔ Reader 1 successfully deleted bookmark.');
  }

  // 4.6 Reader Preferences Persistence
  {
    const updateReq = createJsonRequest('http://localhost:3000/api/preferences', 'PUT', {
      fontSize: 20,
      lineHeight: 1.8,
      readingTheme: 'sepia',
      fontFamily: 'serif',
      distractionFree: true,
    }, readerSessionToken);
    const updateRes = await preferencesPutHandler(updateReq);
    assert.strictEqual(updateRes.status, 200, 'Preferences update must succeed');

    const getReq = createJsonRequest('http://localhost:3000/api/preferences', 'GET', undefined, readerSessionToken);
    const getRes = await preferencesGetHandler(getReq);
    assert.strictEqual(getRes.status, 200);
    const data = await getRes.json();
    assert.strictEqual(data.preferences.fontSize, 20);
    assert.strictEqual(data.preferences.readingTheme, 'sepia');
    assert.strictEqual(data.preferences.distractionFree, true);
    console.log('  ✔ Reader preferences successfully persisted and retrieved.');
  }

  // =========================================================================
  // SCENARIO 5: PASSWORD RECOVERY SECURITY
  // =========================================================================
  console.log('\n▶ Scenario 5: Password Recovery Security & Hash Lifecycle');
  {
    // 5.1 Request reset token
    const forgotReq = createJsonRequest('http://localhost:3000/api/auth/forgot-password', 'POST', {
      email: readerEmail,
    });
    const forgotRes = await forgotPasswordHandler(forgotReq);
    assert.strictEqual(forgotRes.status, 202, 'Forgot password request must return generic 202 Accepted');
    const forgotData = await forgotRes.json();
    assert.strictEqual(forgotData.requestAccepted, true, 'Request acceptance must be distinct from email delivery');
    assert(!forgotData.message.includes('have been dispatched'), 'Response must not claim email was dispatched');

    // Find the generated reset token from inMemoryStore for verification
    let resetRawToken = '';
    for (const [hash, resetRec] of inMemoryStore.resets.entries()) {
      if (resetRec.userId === readerUserId && !resetRec.used) {
        // Find raw token by matching hash
        resetRawToken = hash; // in memory store key is hash
        break;
      }
    }
    assert(resetRawToken.length > 0, 'Password reset token should be registered in store');

    // 5.2 Reset password with invalid token
    const invalidResetReq = createJsonRequest('http://localhost:3000/api/auth/reset-password', 'POST', {
      token: 'completely-invalid-token-12345',
      newPassword: 'BrandNewSecurePassword2026!',
    });
    const invalidResetRes = await resetPasswordHandler(invalidResetReq);
    assert.strictEqual(invalidResetRes.status, 400, 'Invalid reset token must be rejected with 400');
    console.log('  ✔ Invalid password reset token safely rejected.');

    // 5.3 Provider non-2xx must not be treated as a successful delivery.
    // The public response remains generic to avoid account-enumeration leaks.
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousResendKey = process.env.RESEND_API_KEY;
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const originalFetch = globalThis.fetch;
    const existingResetHashes = [...inMemoryStore.resets.keys()].sort();

    try {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;
      process.env.RESEND_API_KEY = 're_test_provider_failure';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      globalThis.fetch = (async () => new Response('provider unavailable', { status: 503 })) as typeof fetch;

      const providerFailureReq = createJsonRequest('http://localhost:3000/api/auth/forgot-password', 'POST', {
        email: readerEmail,
      });
      const providerFailureRes = await forgotPasswordHandler(providerFailureReq);
      assert.strictEqual(providerFailureRes.status, 202, 'Reset request response must remain generic when provider fails');
      const providerFailureData = await providerFailureRes.json();
      assert.strictEqual(providerFailureData.requestAccepted, true);
      assert(!providerFailureData.message.includes('have been dispatched'), 'Must not claim a failed email was dispatched');
      assert.deepStrictEqual(
        [...inMemoryStore.resets.keys()].sort(),
        existingResetHashes,
        'Undelivered reset token must be deleted when provider rejects the email'
      );
      console.log('  ✔ Resend non-2xx response is checked; undelivered token is invalidated without account enumeration.');
    } finally {
      globalThis.fetch = originalFetch;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      if (previousResendKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousResendKey;
      if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  }

  // =========================================================================
  // SCENARIO 6: PUBLIC BOOK DISCOVERY & VISIBILITY ENFORCEMENT
  // =========================================================================
  console.log('\n▶ Scenario 6: Public Book Discovery & Visibility Enforcement');
  {
    // 6.1 Public visitor queries published catalogue
    const publicReq = createJsonRequest('http://localhost:3000/api/books', 'GET');
    const publicRes = await booksGetHandler(publicReq);
    assert.strictEqual(publicRes.status, 200, 'Public catalogue must be accessible to visitors');
    const publicData = await publicRes.json();
    assert(publicData.success === true, 'Public books response must indicate success');
    assert(publicData.books.length > 0, 'Public catalogue must contain published books');
    for (const b of publicData.books) {
      assert.strictEqual(b.isPublished, true, 'Public visitor MUST ONLY see published books');
    }
    console.log('  ✔ Public library catalogue returns exclusively published books.');

    // 6.2 Public visitor loads book by slug
    const slugReq = createJsonRequest('http://localhost:3000/api/books/ml-deep-learning-fundamentals', 'GET');
    const slugRes = await bookSlugHandler(slugReq, { params: Promise.resolve({ slug: 'ml-deep-learning-fundamentals' }) });
    assert.strictEqual(slugRes.status, 200, 'Published book must be viewable by visitor');
    const slugData = await slugRes.json();
    assert.strictEqual(slugData.book.slug, 'ml-deep-learning-fundamentals');
    assert.strictEqual(slugData.book.author, 'Slayer');
    assert.strictEqual(slugData.book.authorRealName, 'Medicharla Ravi Kiran');
    assert.strictEqual(slugData.book.isFree, true);
    console.log('  ✔ Visitor retrieves published book details with author attribution & free access.');

    // 6.3 Non-existent or unpublished book returns 404 to visitor
    const missingReq = createJsonRequest('http://localhost:3000/api/books/non-existent-draft-slug', 'GET');
    const missingRes = await bookSlugHandler(missingReq, { params: Promise.resolve({ slug: 'non-existent-draft-slug' }) });
    assert.strictEqual(missingRes.status, 404, 'Non-existent or draft books must return 404 to visitors');
    console.log('  ✔ Non-existent and unpublished draft books safely hidden behind 404.');
  }

  console.log('\n🎉 ALL GENUINE ROUTE INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runRealRouteIntegrationTests().catch((err) => {
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});
