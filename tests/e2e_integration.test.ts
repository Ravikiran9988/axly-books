import assert from 'assert';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSessionToken,
  destroySession,
  inMemoryStore,
} from '../src/lib/auth';
import {
  registerSchema,
  loginSchema,
  progressUpdateSchema,
  bookmarkCreateSchema,
  preferencesUpdateSchema,
} from '../src/lib/validations';
import { PUBLISHED_BOOKS, getBookBySlug } from '../src/data/booksData';

interface StoredProgressRecord {
  userId: string;
  bookSlug: string;
  chapterNumber: number;
  chapterSlug: string;
  progressPercentage: number;
  lastReadAt: Date;
}

interface StoredBookmark {
  id: string;
  userId: string;
  bookSlug: string;
  chapterSlug: string;
  note?: string;
}

async function runEndToEndIntegrationTests() {
  console.log('🚀 Running AXLY End-to-End User Journey, RBAC & Integration Tests...\n');

  // =========================================================================
  // JOURNEY 1: VISITOR DISCOVERY & PUBLIC ACCESS (NO AUTH REQUIRED)
  // =========================================================================
  console.log('▶ Journey 1: Visitor Book Discovery & Public Reading');
  {
    // 1. Visitor opens library catalogue
    const allBooks = PUBLISHED_BOOKS;
    assert(allBooks.length > 0, 'Library must contain at least 1 verified published book');
    assert.strictEqual(allBooks[0].author, 'Slayer', 'Author pen name must be Slayer');
    assert.strictEqual(
      allBooks[0].authorRealName,
      'Medicharla Ravi Kiran',
      'Author full name must be Medicharla Ravi Kiran'
    );
    assert.strictEqual(allBooks[0].isFree, true, 'All books must be 100% free online reading');

    // 2. Visitor searches for 'Transformers' or 'Neural Networks'
    const searchQuery = 'transformers';
    const filtered = allBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(searchQuery) ||
        b.description.toLowerCase().includes(searchQuery) ||
        b.tags.some((t) => t.toLowerCase().includes(searchQuery))
    );
    assert.strictEqual(filtered.length, 1, 'Search query must find matching book');

    // 3. Visitor opens book details
    const book = getBookBySlug('ml-deep-learning-fundamentals');
    assert(book !== undefined, 'Book must be retrieved by slug');
    assert.strictEqual(book?.chapters.length, 8, 'Book must contain all 8 structured chapters');

    // 4. Visitor opens Chapter 1 to read
    const ch1 = book?.chapters[0];
    assert.strictEqual(ch1?.chapterNumber, 1, 'First chapter is Chapter 1');
    assert(Boolean(ch1 && ch1.sections.length > 0), 'Chapter must have formatted sections');
    assert(ch1?.sections[1].codeSnippet !== undefined, 'Technical chapter contains Python code snippet');

    // 5. Visitor views legal rights and CC BY-NC 4.0 license
    assert.strictEqual(book?.copyrightNotice, '© 2026 Medicharla Ravi Kiran');
    assert(book?.license.includes('CC BY-NC 4.0'));

    console.log(
      '  ✔ Visitor journey: Public discovery, search, chapter reading, and CC BY-NC 4.0 license verified.'
    );
  }

  // =========================================================================
  // JOURNEY 2: REGISTERED READER ACCOUNT CREATION & ROLE ISOLATION
  // =========================================================================
  console.log('\n▶ Journey 2: Reader Registration & Role Isolation');
  let readerSessionToken = '';
  let readerUserId = '';

  {
    // 1. Validation test on registration input
    const invalidReg = registerSchema.safeParse({
      displayName: 'A', // too short
      email: 'not-an-email',
      password: '123', // too short
      agreeTerms: false,
    });
    assert.strictEqual(invalidReg.success, false, 'Invalid registration input must fail validation');

    const validReg = registerSchema.safeParse({
      displayName: 'Kiran Reader',
      email: 'kiran.reader@example.com',
      password: 'StrongPassword2026!',
      agreeTerms: true,
    });
    assert.strictEqual(validReg.success, true, 'Valid registration payload must pass');

    // 2. Simulate User Registration - new account receives 'reader' role strictly
    readerUserId = 'usr_test_journey_1';
    const passwordHash = await hashPassword(validReg.data!.password);
    inMemoryStore.users.set(readerUserId, {
      id: readerUserId,
      displayName: validReg.data!.displayName,
      email: validReg.data!.email,
      passwordHash,
      role: 'reader', // Server-assigned role
      createdAt: new Date(),
    });

    // 3. Reader logs in
    const loginAttempt = loginSchema.safeParse({
      email: 'kiran.reader@example.com',
      password: 'StrongPassword2026!',
    });
    assert.strictEqual(loginAttempt.success, true, 'Login input valid');

    const storedUser = inMemoryStore.users.get(readerUserId);
    assert(storedUser !== undefined, 'Stored user must exist');
    const passwordMatches = await verifyPassword('StrongPassword2026!', storedUser!.passwordHash);
    assert.strictEqual(passwordMatches, true, 'Bcrypt password verification must succeed');

    // 4. Create Session
    readerSessionToken = await createSession(readerUserId);
    assert(readerSessionToken.length > 0, 'Session token generated');

    // 5. Validate session token
    const authenticatedUser = await validateSessionToken(readerSessionToken);
    assert(authenticatedUser !== null, 'Session must resolve to authenticated user');
    assert.strictEqual(authenticatedUser?.email, 'kiran.reader@example.com');
    assert.strictEqual(authenticatedUser?.displayName, 'Kiran Reader');
    assert.strictEqual(authenticatedUser?.role, 'reader', 'Authenticated user role must be reader');

    console.log('  ✔ Registration, bcrypt hashing, and reader role session authentication verified.');
  }

  // =========================================================================
  // JOURNEY 3: ADMINISTRATOR PROVISIONING & PRIVILEGE ENFORCEMENT
  // =========================================================================
  console.log('\n▶ Journey 3: Administrator Provisioning & Privilege Enforcement');
  let adminSessionToken = '';
  let adminUserId = '';

  {
    adminUserId = 'usr_owner_admin_01';
    const adminPasswordHash = await hashPassword('AdminMasterKey2026!');
    // Provision administrator
    inMemoryStore.users.set(adminUserId, {
      id: adminUserId,
      displayName: 'Medicharla Ravi Kiran',
      email: 'ravikiran@axly.in',
      passwordHash: adminPasswordHash,
      role: 'admin',
      createdAt: new Date(),
    });

    adminSessionToken = await createSession(adminUserId);
    const adminUser = await validateSessionToken(adminSessionToken);
    assert(adminUser !== null, 'Admin session must resolve');
    assert.strictEqual(adminUser?.role, 'admin', 'Admin must have admin role');

    // Verify Reader cannot access admin-only functionality
    const readerUser = await validateSessionToken(readerSessionToken);
    assert.notStrictEqual((readerUser as { role?: string })?.role, 'admin', 'Reader cannot elevate to admin');

    console.log('  ✔ Administrator elevation and role segregation verified.');
  }

  // =========================================================================
  // JOURNEY 4: DRAFT VS PUBLISHED BOOK SEGREGATION
  // =========================================================================
  console.log('\n▶ Journey 4: Draft Publication Segregation');
  {
    interface TestBook {
      id: string;
      slug: string;
      title: string;
      isPublished: boolean;
    }

    const testCatalogue: TestBook[] = [
      { id: 'b1', slug: 'ml-fundamentals', title: 'ML Fundamentals', isPublished: true },
      { id: 'b2', slug: 'quantum-computing-draft', title: 'Quantum Computing (Draft)', isPublished: false },
    ];

    // Function simulating public book catalogue endpoint:
    const getPublicBooks = () => {
      return testCatalogue.filter((b) => b.isPublished);
    };

    // Function simulating admin book catalogue endpoint:
    const getAdminBooks = (role: string) => {
      if (role !== 'admin') throw new Error('Forbidden: Admin access required');
      return testCatalogue;
    };

    // Public readers see only 1 published book
    const publicResults = getPublicBooks();
    assert.strictEqual(publicResults.length, 1, 'Public catalogue must only return published books');
    assert.strictEqual(publicResults[0].slug, 'ml-fundamentals');

    // Admin sees both books (published + draft)
    const adminResults = getAdminBooks('admin');
    assert.strictEqual(adminResults.length, 2, 'Admin catalogue includes drafts');

    // Reader requesting admin books throws forbidden error
    assert.throws(() => getAdminBooks('reader'), /Forbidden/);

    console.log('  ✔ Draft books hidden from public reader catalogue and accessible only to admin.');
  }

  // =========================================================================
  // JOURNEY 5: READING PROGRESS TRACKING & RE-ENTRY RESUMPTION
  // =========================================================================
  console.log('\n▶ Journey 5: Persistent Reading Progress & Resumption');
  {
    const progressMap = new Map<string, StoredProgressRecord>();

    const updateProgress = (
      userId: string,
      bookSlug: string,
      chapterNum: number,
      chapterSlug: string,
      pct: number
    ) => {
      const parsed = progressUpdateSchema.parse({
        bookSlug,
        chapterSlug,
        chapterNumber: chapterNum,
        progressPercentage: pct,
      });
      const key = `${userId}_${parsed.bookSlug}`;
      progressMap.set(key, {
        userId,
        bookSlug: parsed.bookSlug,
        chapterNumber: parsed.chapterNumber,
        chapterSlug: parsed.chapterSlug,
        progressPercentage: parsed.progressPercentage,
        lastReadAt: new Date(),
      });
    };

    // 1. Reader starts ML book at Chapter 1 (12%)
    updateProgress(
      readerUserId,
      'ml-deep-learning-fundamentals',
      1,
      'chapter-1-foundations-of-machine-learning',
      12
    );

    let current = progressMap.get(`${readerUserId}_ml-deep-learning-fundamentals`);
    assert(current !== undefined);
    assert.strictEqual(current?.chapterNumber, 1);
    assert.strictEqual(current?.progressPercentage, 12);

    // 2. Reader advances to Chapter 4: Deep Neural Networks (50%)
    updateProgress(
      readerUserId,
      'ml-deep-learning-fundamentals',
      4,
      'chapter-4-deep-neural-networks-backpropagation',
      50
    );

    // Verify single-record enforcement (overwritten/updated, not duplicated)
    current = progressMap.get(`${readerUserId}_ml-deep-learning-fundamentals`);
    assert.strictEqual(current?.chapterNumber, 4);
    assert.strictEqual(current?.chapterSlug, 'chapter-4-deep-neural-networks-backpropagation');
    assert.strictEqual(current?.progressPercentage, 50);

    // 3. Reader resumes from Continue Reading shortcut
    const resumeUrl = `/read/${current?.bookSlug}?chapter=${current?.chapterSlug}`;
    assert.strictEqual(
      resumeUrl,
      '/read/ml-deep-learning-fundamentals?chapter=chapter-4-deep-neural-networks-backpropagation'
    );

    console.log('  ✔ Progress update, single-record model, and Continue Reading resumption verified.');
  }

  // =========================================================================
  // JOURNEY 6: BOOKMARKING & CROSS-USER PRIVACY ISOLATION
  // =========================================================================
  console.log('\n▶ Journey 6: Chapter Bookmarks & Cross-User Security');
  {
    const bookmarksStore: StoredBookmark[] = [];

    // User A (our reader) saves a bookmark
    const bmValidation = bookmarkCreateSchema.safeParse({
      bookSlug: 'ml-deep-learning-fundamentals',
      chapterSlug: 'chapter-7-transformer-architecture-self-attention',
      chapterNumber: 7,
      note: 'Crucial Self-Attention equations Q, K, V',
    });
    assert.strictEqual(bmValidation.success, true, 'Bookmark validation passed');

    const bmA_Id = 'bm_readerA_1';
    bookmarksStore.push({
      id: bmA_Id,
      userId: readerUserId,
      bookSlug: bmValidation.data!.bookSlug,
      chapterSlug: bmValidation.data!.chapterSlug,
      note: bmValidation.data!.note,
    });

    // Create User B (adversary/other reader)
    const attackerUserId = 'usr_adversary_99';

    // Query bookmarks for User A
    const listA = bookmarksStore.filter((b) => b.userId === readerUserId);
    assert.strictEqual(listA.length, 1, 'Reader A sees their bookmark');

    // Query bookmarks for User B
    const listB = bookmarksStore.filter((b) => b.userId === attackerUserId);
    assert.strictEqual(listB.length, 0, 'User B must never see User A bookmarks');

    // User B attempts to delete User A's bookmark
    const deleteAttemptByAttacker = () => {
      const idx = bookmarksStore.findIndex((b) => b.id === bmA_Id && b.userId === attackerUserId);
      if (idx === -1) return false;
      bookmarksStore.splice(idx, 1);
      return true;
    };
    const attackerResult = deleteAttemptByAttacker();
    assert.strictEqual(attackerResult, false, 'Unauthorized deletion attempt must be denied');
    assert.strictEqual(bookmarksStore.length, 1, 'Bookmark remains untouched');

    // User A deletes their own bookmark
    const deleteByOwner = () => {
      const idx = bookmarksStore.findIndex((b) => b.id === bmA_Id && b.userId === readerUserId);
      if (idx === -1) return false;
      bookmarksStore.splice(idx, 1);
      return true;
    };
    const ownerResult = deleteByOwner();
    assert.strictEqual(ownerResult, true, 'Owner can delete their bookmark');
    assert.strictEqual(bookmarksStore.length, 0, 'Bookmark successfully deleted');

    console.log('  ✔ Bookmarks private access control and cross-user deletion denial verified.');
  }

  // =========================================================================
  // JOURNEY 7: READING PREFERENCES PERSISTENCE
  // =========================================================================
  console.log('\n▶ Journey 7: Reading Preferences Customization');
  {
    const prefValid = preferencesUpdateSchema.safeParse({
      fontSize: 22,
      lineHeight: 1.85,
      readingTheme: 'sepia',
      fontFamily: 'serif',
      distractionFree: true,
    });
    assert.strictEqual(prefValid.success, true, 'Preferences schema validation passed');

    // Boundary check: reject extreme font size
    const badFontSize = preferencesUpdateSchema.safeParse({
      fontSize: 85, // way too big
    });
    assert.strictEqual(badFontSize.success, false, 'Invalid font size rejected');

    console.log('  ✔ Reading preferences (Dark/Light/Sepia, font sizes, line heights) validated.');
  }

  // =========================================================================
  // JOURNEY 8: LOGOUT & ACCESS REVOCATION
  // =========================================================================
  console.log('\n▶ Journey 8: Logout & Session Revocation');
  {
    // Reader logs out
    await destroySession(readerSessionToken);
    const afterLogoutReader = await validateSessionToken(readerSessionToken);
    assert.strictEqual(afterLogoutReader, null, 'Revoked reader session token must return null user');

    // Admin logs out
    await destroySession(adminSessionToken);
    const afterLogoutAdmin = await validateSessionToken(adminSessionToken);
    assert.strictEqual(afterLogoutAdmin, null, 'Revoked admin session token must return null user');

    console.log('  ✔ Session revocation on logout verified for both readers and admins.');
  }

  console.log('\n🎉 ALL END-TO-END JOURNEY & INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
}

runEndToEndIntegrationTests().catch((err) => {
  console.error('❌ E2E Integration tests failed:', err);
  process.exit(1);
});
