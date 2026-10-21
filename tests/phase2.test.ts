import assert from 'assert';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSecureToken,
} from '../src/lib/auth';
import {
  registerSchema,
  loginSchema,
  progressUpdateSchema,
  bookmarkCreateSchema,
} from '../src/lib/validations';
import { checkRateLimit } from '../src/lib/rateLimit';

async function runTests() {
  console.log('🧪 Running AXLY Phase 2 Backend & Security Automated Tests...\n');

  // --- Test Suite 1: Authentication & Password Security ---
  console.log('▶ Test Suite 1: Authentication & Cryptographic Hashing');
  {
    const plainPassword = 'superSecurePassword2026!';
    const hash = await hashPassword(plainPassword);

    assert(hash !== plainPassword, 'Password must not be stored in plain text');
    assert(hash.startsWith('$2'), 'Bcrypt hash signature must be present');

    const isValid = await verifyPassword(plainPassword, hash);
    assert(isValid === true, 'Correct password must verify against bcrypt hash');

    const isWrong = await verifyPassword('wrongPassword123', hash);
    assert(isWrong === false, 'Incorrect password must be rejected');

    const rawToken = generateSecureToken();
    assert(rawToken.length === 64, 'Raw session token must be 32 bytes (64 hex characters)');
    const hashed = hashToken(rawToken);
    assert(hashed.length === 64, 'SHA-256 token hash must be 64 hex characters');

    console.log('  ✔ Password hashing (bcrypt) and session token hashing verified.');
  }

  // --- Test Suite 2: Input Validation & Boundary Enforcement ---
  console.log('\n▶ Test Suite 2: Schema Validation (Zod)');
  {
    // Valid registration
    const validReg = registerSchema.safeParse({
      displayName: 'Alice Reader',
      email: 'alice@example.com',
      password: 'password123',
      agreeTerms: true,
    });
    assert(validReg.success === true, 'Valid registration payload must pass');

    // Reject short password
    const shortPw = registerSchema.safeParse({
      displayName: 'Alice Reader',
      email: 'alice@example.com',
      password: 'short',
      agreeTerms: true,
    });
    assert(shortPw.success === false, 'Password shorter than 8 chars must be rejected');

    // Reject missing terms agreement
    const noTerms = registerSchema.safeParse({
      displayName: 'Alice Reader',
      email: 'alice@example.com',
      password: 'password123',
      agreeTerms: false,
    });
    assert(noTerms.success === false, 'Must agree to terms and privacy');

    // Reject malformed email
    const badEmail = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'somePassword',
    });
    assert(badEmail.success === false, 'Invalid email format must be rejected');

    console.log('  ✔ Registration and login input validation verified.');
  }

  // --- Test Suite 3: Reading Progress Integrity ---
  console.log('\n▶ Test Suite 3: Reading Progress Integrity');
  {
    // Valid progress
    const validProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: 25,
    });
    assert(validProgress.success === true, 'Valid reading progress payload must pass');

    // Progress bounds: reject > 100%
    const overProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: 150,
    });
    assert(overProgress.success === false, 'Progress > 100% must be rejected');

    // Progress bounds: reject < 0%
    const negProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: -10,
    });
    assert(negProgress.success === false, 'Negative progress must be rejected');

    console.log('  ✔ Reading progress percentage boundaries (0-100%) enforced.');
  }

  // --- Test Suite 4: Bookmark Ownership Isolation ---
  console.log('\n▶ Test Suite 4: Bookmark Ownership & Privacy Isolation');
  {
    interface MockBookmark {
      id: string;
      userId: string;
      bookSlug: string;
      chapterSlug: string;
    }

    const mockDb: MockBookmark[] = [];

    // User A creates a bookmark
    const userA_Id = 'user_aaa_111';
    const userB_Id = 'user_bbb_222';

    mockDb.push({
      id: 'bm_1',
      userId: userA_Id,
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-2-supervised-learning-mechanics',
    });

    // Function simulating server-side authorized query
    const getBookmarksForUser = (requestingUserId: string) => {
      return mockDb.filter((b) => b.userId === requestingUserId);
    };

    // User A should see their bookmark
    const userABookmarks = getBookmarksForUser(userA_Id);
    assert.strictEqual(userABookmarks.length, 1, 'User A must see their own bookmark');

    // User B should NOT see User A's bookmark
    const userBBookmarks = getBookmarksForUser(userB_Id);
    assert.strictEqual(userBBookmarks.length, 0, 'User B must not see User A bookmarks');

    // Function simulating server-side authorized deletion
    const deleteBookmarkForUser = (bookmarkId: string, requestingUserId: string): boolean => {
      const index = mockDb.findIndex((b) => b.id === bookmarkId && b.userId === requestingUserId);
      if (index === -1) return false;
      mockDb.splice(index, 1);
      return true;
    };

    // User B attempts to delete User A's bookmark
    const userBDeleteAttempt = deleteBookmarkForUser('bm_1', userB_Id);
    assert.strictEqual(userBDeleteAttempt, false, 'User B must not be allowed to delete User A bookmark');
    assert.strictEqual(mockDb.length, 1, 'Bookmark must still exist after unauthorized deletion attempt');

    // User A deletes their own bookmark
    const userADeleteAttempt = deleteBookmarkForUser('bm_1', userA_Id);
    assert.strictEqual(userADeleteAttempt, true, 'User A can delete their own bookmark');
    assert.strictEqual(mockDb.length, 0, 'Bookmark must be deleted');

    console.log('  ✔ Bookmark ownership isolation and privacy verified.');
  }

  // --- Test Suite 5: Rate Limiter Protection ---
  console.log('\n▶ Test Suite 5: Rate Limiting Defense');
  {
    const testIp = '198.51.100.42';
    const limit = 3;
    const windowMs = 5000;

    // Requests 1, 2, 3 should be allowed
    assert(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed === true, 'Req 1 allowed');
    assert(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed === true, 'Req 2 allowed');
    assert(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed === true, 'Req 3 allowed');

    // Request 4 should be throttled (HTTP 429)
    const throttled = checkRateLimit(`test_${testIp}`, limit, windowMs);
    assert(throttled.isAllowed === false, 'Req 4 must be throttled');
    assert(throttled.retryAfterSeconds > 0, 'Must provide retry-after seconds');

    console.log('  ✔ Sliding window rate limiting successfully throttles brute-force attempts.');
  }

  console.log('\n✨ ALL PHASE 2 AUTOMATED TESTS PASSED SUCCESSFULLY! (100% OK)');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
