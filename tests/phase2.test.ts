import assert from 'assert';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSecureToken,
  createSession,
  validateSessionToken,
  destroySession,
  assertRecordOwnership,
  inMemoryStore,
} from '../src/lib/auth';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  progressUpdateSchema,
  bookmarkCreateSchema,
  bookCreateSchema,
  chapterCreateSchema,
} from '../src/lib/validations';
import { checkRateLimit, checkRateLimitAsync } from '../src/lib/rateLimit';

async function runTests() {
  console.log('🧪 Running AXLY Phase 2 Backend, RBAC & Security Automated Tests...\n');

  // --- Test Suite 1: Authentication & Cryptographic Hashing ---
  console.log('▶ Test Suite 1: Authentication & Cryptographic Security');
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
    assert.strictEqual(rawToken.length, 64, 'Raw session token must be 32 bytes (64 hex characters)');
    const hashed = hashToken(rawToken);
    assert.strictEqual(hashed.length, 64, 'SHA-256 token hash must be 64 hex characters');

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
    assert.strictEqual(validReg.success, true, 'Valid registration payload must pass');

    // Reject short password (<8)
    const shortPw = registerSchema.safeParse({
      displayName: 'Alice Reader',
      email: 'alice@example.com',
      password: 'short',
      agreeTerms: true,
    });
    assert.strictEqual(shortPw.success, false, 'Password shorter than 8 chars must be rejected');

    // Reject missing terms agreement
    const noTerms = registerSchema.safeParse({
      displayName: 'Alice Reader',
      email: 'alice@example.com',
      password: 'password123',
      agreeTerms: false,
    });
    assert.strictEqual(noTerms.success, false, 'Must agree to terms and privacy');

    // Reject malformed email
    const badEmail = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'somePassword',
    });
    assert.strictEqual(badEmail.success, false, 'Invalid email format must be rejected');

    // Reset password validation
    const validReset = resetPasswordSchema.safeParse({
      token: generateSecureToken(),
      newPassword: 'BrandNewSecurePassword2026!',
    });
    assert.strictEqual(validReset.success, true, 'Valid password reset payload must pass');

    console.log('  ✔ Registration, login, and reset-password input validations enforced.');
  }

  // --- Test Suite 3: Role-Based Access Control (RBAC) & Promotion ---
  console.log('\n▶ Test Suite 3: Role-Based Access Control (RBAC)');
  {
    // Ensure all newly registered accounts receive 'reader' role
    const newReaderId = 'usr_reader_test_01';
    inMemoryStore.users.set(newReaderId, {
      id: newReaderId,
      displayName: 'Bob Reader',
      email: 'bob@example.com',
      passwordHash: await hashPassword('TestPassword123!'),
      role: 'reader',
      createdAt: new Date(),
    });

    const readerSessionToken = await createSession(newReaderId);
    const readerUser = await validateSessionToken(readerSessionToken);
    assert(readerUser !== null, 'Session must resolve to user');
    assert.strictEqual(readerUser?.role, 'reader', 'New user must strictly possess reader role');

    // A reader cannot perform admin actions
    assert.notStrictEqual((readerUser as { role?: string })?.role, 'admin', 'Reader must NOT have admin privileges');

    // Elevation simulation: owner promotes user to admin
    const adminUserRecord = inMemoryStore.users.get(newReaderId);
    if (adminUserRecord) {
      adminUserRecord.role = 'admin';
    }

    const elevatedUser = await validateSessionToken(readerSessionToken);
    assert.strictEqual(elevatedUser?.role, 'admin', 'Elevated user now possesses admin role');

    // Test record ownership check
    const isOwner = assertRecordOwnership(newReaderId, newReaderId, 'reader');
    assert.strictEqual(isOwner, true, 'User owns their own record');

    const isAdversary = assertRecordOwnership('usr_other_user', newReaderId, 'reader');
    assert.strictEqual(isAdversary, false, 'Reader cannot own another user record');

    const adminOverride = assertRecordOwnership('usr_other_user', newReaderId, 'admin');
    assert.strictEqual(adminOverride, true, 'Admin has authorized administrative access across records');

    await destroySession(readerSessionToken);
    console.log('  ✔ RBAC roles (reader vs admin) and ownership assertion helpers verified.');
  }

  // --- Test Suite 4: Content Management Validation (Books & Chapters) ---
  console.log('\n▶ Test Suite 4: Content Management Validation (CMS)');
  {
    const validBook = bookCreateSchema.safeParse({
      title: 'Neural Networks & Deep Transformers',
      slug: 'neural-networks-deep-transformers',
      subtitle: 'Complete Guide from Perceptrons to LLMs',
      description: 'An advanced exploration of deep architectures, backprop calculus, and attention.',
      synopsis: 'Detailed educational synopsis covering self-attention, multi-head projections, and training.',
      category: 'Artificial Intelligence',
      tags: ['AI', 'Transformers', 'Python'],
      edition: 'First Edition (2026)',
      publishedYear: 2026,
      coverImageUrl: '/images/ml-deep-learning-cover.jpg',
      isPublished: false, // Default draft
    });
    assert.strictEqual(validBook.success, true, 'Valid book creation schema must pass');

    // Reject uppercase or space in slug
    const badSlug = bookCreateSchema.safeParse({
      title: 'Invalid Book',
      slug: 'Invalid Slug with Spaces',
      description: 'Long enough description text here.',
      synopsis: 'Long enough synopsis text here.',
      category: 'Tech',
      coverImageUrl: '/images/cover.jpg',
    });
    assert.strictEqual(badSlug.success, false, 'Invalid book slug must be rejected');

    // Valid chapter
    const validChapter = chapterCreateSchema.safeParse({
      chapterNumber: 1,
      title: 'Foundations of Attention Mechanics',
      slug: 'chapter-1-attention-mechanics',
      summary: 'Exploring query, key, and value vectors in self-attention.',
      estimatedReadingTimeMinutes: 20,
      isPublished: true,
      content: [
        {
          title: '1.1 Scaled Dot-Product Attention',
          content: 'The attention function computes weighted sums of values based on similarity.',
          codeSnippet: { language: 'python', code: 'import numpy as np\n# attention calculation' },
          callout: { type: 'concept', text: 'Softmax normalizes similarity scores to sum to 1.' },
        },
      ],
    });
    assert.strictEqual(validChapter.success, true, 'Valid chapter creation schema must pass');

    console.log('  ✔ Book and chapter validation schemas (slug format, sections, callouts) verified.');
  }

  // --- Test Suite 5: Reading Progress & Bookmarks Isolation ---
  console.log('\n▶ Test Suite 5: Reading Progress & Bookmark Boundaries');
  {
    // Valid progress
    const validProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: 25,
    });
    assert.strictEqual(validProgress.success, true, 'Valid reading progress payload must pass');

    // Reject > 100%
    const overProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: 150,
    });
    assert.strictEqual(overProgress.success, false, 'Progress > 100% must be rejected');

    // Reject < 0%
    const negProgress = progressUpdateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      progressPercentage: -10,
    });
    assert.strictEqual(negProgress.success, false, 'Negative progress must be rejected');

    // Bookmark validation
    const validBookmark = bookmarkCreateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-1-foundations-of-machine-learning',
      chapterNumber: 1,
      note: 'Key definition of vectorized representations',
    });
    assert.strictEqual(validBookmark.success, true, 'Valid bookmark payload must pass');

    console.log('  ✔ Reading progress percentage boundaries (0-100%) and bookmark schemas enforced.');
  }

  // --- Test Suite 6: Rate Limiter Protection ---
  console.log('\n▶ Test Suite 6: Rate Limiting Defense');
  {
    const testIp = '198.51.100.99';
    const limit = 3;
    const windowMs = 5000;

    // Requests 1, 2, 3 should be allowed
    assert.strictEqual(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed, true, 'Req 1 allowed');
    assert.strictEqual(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed, true, 'Req 2 allowed');
    assert.strictEqual(checkRateLimit(`test_${testIp}`, limit, windowMs).isAllowed, true, 'Req 3 allowed');

    // Request 4 should be throttled (HTTP 429)
    const throttled = checkRateLimit(`test_${testIp}`, limit, windowMs);
    assert.strictEqual(throttled.isAllowed, false, 'Req 4 must be throttled');
    assert(throttled.retryAfterSeconds > 0, 'Must provide retry-after seconds');

    console.log('  ✔ Sliding window rate limiting successfully throttles brute-force attempts.');
  }

  // --- Test Suite 7: Production Rate-Limiter Fail-Closed Behavior ---
  console.log('\n▶ Test Suite 7: Production Rate-Limiter Fail-Closed Behavior');
  {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDatabaseUrl = process.env.DATABASE_URL;

    try {
      // Remove database configuration just for this check. checkRateLimitAsync
      // must reject sensitive requests instead of using an instance-local limiter.
      delete process.env.DATABASE_URL;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true });

      const unavailable = await checkRateLimitAsync('test-production-limiter-unavailable', 5, 60_000);
      assert.strictEqual(unavailable.isAllowed, false, 'Limiter failure must not allow a production request');
      assert.strictEqual(unavailable.unavailable, true, 'Limiter failure must be reported as unavailable');
      assert.strictEqual(unavailable.retryAfterSeconds > 0, true, 'Unavailable response should include retry delay');

      console.log('  ✔ Production fails closed when the shared rate-limit database is not configured.');
    } finally {
      if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
      else Object.defineProperty(process.env, 'NODE_ENV', { value: previousNodeEnv, configurable: true, writable: true });

      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }

  console.log('\n✨ ALL PHASE 2 AUTOMATED TESTS PASSED SUCCESSFULLY! (100% OK)');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
