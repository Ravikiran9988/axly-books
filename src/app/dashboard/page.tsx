import React from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import {
  BookOpen,
  Bookmark,
  CheckCircle,
  ArrowRight,
  Library,
  Settings,
  Shield,
  Compass,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import styles from './dashboard.module.css';

export const instant = false;

export const metadata = {
  title: 'Reader Dashboard — AXLY Books',
  description: 'Your personalized reading space, bookmarks, and progress tracking on AXLY Books.',
};

export default async function ReaderDashboardPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?returnTo=' + encodeURIComponent('/dashboard'));
  }

  // Load reading progress and bookmarks for this authenticated user
  let progressRecords: Array<{
    bookSlug: string;
    bookTitle: string;
    bookCover: string;
    chapterNumber: number;
    chapterSlug: string;
    chapterTitle: string;
    progressPercentage: number;
    lastReadAt: Date;
  }> = [];

  let userBookmarks: Array<{
    id: string;
    bookSlug: string;
    bookTitle: string;
    chapterNumber: number;
    chapterSlug: string;
    chapterTitle: string;
    note?: string | null;
    createdAt: Date;
  }> = [];

  if (isDatabaseConfigured() && db) {
    const pResults = await db
      .select({
        progress: schema.readingProgress,
        book: schema.books,
        chapter: schema.chapters,
      })
      .from(schema.readingProgress)
      .innerJoin(schema.books, eq(schema.readingProgress.bookId, schema.books.id))
      .innerJoin(schema.chapters, eq(schema.readingProgress.chapterId, schema.chapters.id))
      .where(eq(schema.readingProgress.userId, user.id))
      .orderBy(desc(schema.readingProgress.lastReadAt));

    progressRecords = pResults.map((r) => ({
      bookSlug: r.book.slug,
      bookTitle: r.book.title,
      bookCover: r.book.coverImageUrl,
      chapterNumber: r.chapter.chapterNumber,
      chapterSlug: r.chapter.slug,
      chapterTitle: r.chapter.title,
      progressPercentage: r.progress.progressPercentage,
      lastReadAt: r.progress.lastReadAt,
    }));

    const bResults = await db
      .select({
        bookmark: schema.bookmarks,
        book: schema.books,
        chapter: schema.chapters,
      })
      .from(schema.bookmarks)
      .innerJoin(schema.books, eq(schema.bookmarks.bookId, schema.books.id))
      .innerJoin(schema.chapters, eq(schema.bookmarks.chapterId, schema.chapters.id))
      .where(eq(schema.bookmarks.userId, user.id))
      .orderBy(desc(schema.bookmarks.createdAt));

    userBookmarks = bResults.map((r) => ({
      id: r.bookmark.id,
      bookSlug: r.book.slug,
      bookTitle: r.book.title,
      chapterNumber: r.chapter.chapterNumber,
      chapterSlug: r.chapter.slug,
      chapterTitle: r.chapter.title,
      note: r.bookmark.note,
      createdAt: r.bookmark.createdAt,
    }));
  }

  const latestRead = progressRecords.length > 0 ? progressRecords[0] : null;

  return (
    <div className={styles.dashboardContainer}>
      {/* Header Greeting */}
      <header className={styles.headerSection}>
        <div className={styles.greetingBox}>
          <div className={styles.badgeGroup}>
            <span className={styles.roleBadge}>
              {user.role === 'admin' ? 'Administrator Account' : 'Reader Account'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Member since {new Date(user.createdAt).getFullYear()}
            </span>
          </div>
          <h1 className={styles.title}>Welcome back, {user.displayName.split(' ')[0]}</h1>
          <p className={styles.subtitle}>
            Resume your study across free publications and technical volumes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/my-library" className="btn btn-secondary btn-sm">
            <Library size={16} />
            <span>My Library</span>
          </Link>
          <Link href="/profile" className="btn btn-secondary btn-sm">
            <Settings size={16} />
            <span>Profile & Settings</span>
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" className="btn btn-primary btn-sm">
              <Shield size={16} />
              <span>Admin Dashboard</span>
            </Link>
          )}
        </div>
      </header>

      {/* Quick Summary Cards */}
      <div className={styles.quickStatsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{progressRecords.length}</div>
            <div className={styles.statLabel}>Books In Progress</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Bookmark size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{userBookmarks.length}</div>
            <div className={styles.statLabel}>Saved Bookmarks</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className={styles.statValue}>100%</div>
            <div className={styles.statLabel}>Free Digital Access</div>
          </div>
        </div>
      </div>

      {/* Continue Reading Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <BookOpen size={20} color="var(--color-brand-cyan)" />
            <span>Continue Reading</span>
          </h2>
          <Link href="/books" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-cyan)' }}>
            <span>Explore All Books</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {latestRead ? (
          <div className={styles.continueCard}>
            <Image
              src={latestRead.bookCover || '/images/ml-deep-learning-cover.jpg'}
              alt={latestRead.bookTitle}
              width={100}
              height={140}
              className={styles.continueCover}
            />
            <div className={styles.continueDetails}>
              <h3 className={styles.continueBookTitle}>{latestRead.bookTitle}</h3>
              <div className={styles.continueChapter}>
                <span>
                  Chapter {latestRead.chapterNumber}: {latestRead.chapterTitle}
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressLabel}>
                  <span>Reading Progress</span>
                  <span>{latestRead.progressPercentage}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${latestRead.progressPercentage}%` }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <Link
                  href={`/read/${latestRead.bookSlug}?chapter=${latestRead.chapterSlug}`}
                  className="btn btn-primary btn-sm"
                >
                  <BookOpen size={16} />
                  <span>Resume Chapter {latestRead.chapterNumber}</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BookOpen size={28} />
            </div>
            <h3 className={styles.emptyTitle}>Your Reading Journey Starts Here</h3>
            <p className={styles.emptyText}>
              You haven&apos;t started reading any books yet. Browse our published catalogue and dive into
              technical chapters completely free.
            </p>
            <Link href="/books" className="btn btn-primary btn-sm">
              <Library size={16} />
              <span>Browse Digital Library</span>
            </Link>
          </div>
        )}
      </section>

      {/* Saved Bookmarks Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Bookmark size={20} color="var(--color-brand-cyan)" />
            <span>Saved Bookmarks</span>
          </h2>
          {userBookmarks.length > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {userBookmarks.length} saved
            </span>
          )}
        </div>

        {userBookmarks.length > 0 ? (
          <div className={styles.bookmarksList}>
            {userBookmarks.map((bm) => (
              <article key={bm.id} className={styles.bookmarkCard}>
                <span className={styles.bookmarkBook}>{bm.bookTitle}</span>
                <h3 className={styles.bookmarkChapter}>
                  <Link href={`/read/${bm.bookSlug}?chapter=${bm.chapterSlug}`}>
                    Ch {bm.chapterNumber}: {bm.chapterTitle}
                  </Link>
                </h3>
                {bm.note && <p className={styles.bookmarkNote}>&ldquo;{bm.note}&rdquo;</p>}
                <div className={styles.bookmarkFooter}>
                  <span>Saved {new Date(bm.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/read/${bm.bookSlug}?chapter=${bm.chapterSlug}`}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <span>Read</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Bookmark size={28} />
            </div>
            <h3 className={styles.emptyTitle}>No Saved Bookmarks Yet</h3>
            <p className={styles.emptyText}>
              While reading chapters, click the Bookmark icon (or press B) to save equations,
              concepts, and code listings for quick recall here.
            </p>
          </div>
        )}
      </section>

      {/* Featured Book Callout if reader hasn't read any book */}
      {progressRecords.length === 0 && PUBLISHED_BOOKS.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Compass size={20} color="var(--color-brand-blue)" />
              <span>Recommended Start</span>
            </h2>
          </div>
          <div className={styles.continueCard}>
            <Image
              src={PUBLISHED_BOOKS[0].coverImage || '/images/ml-deep-learning-cover.jpg'}
              alt={PUBLISHED_BOOKS[0].title}
              width={100}
              height={140}
              className={styles.continueCover}
            />
            <div className={styles.continueDetails}>
              <h3 className={styles.continueBookTitle}>{PUBLISHED_BOOKS[0].title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {PUBLISHED_BOOKS[0].subtitle}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {PUBLISHED_BOOKS[0].description}
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <Link href={`/read/${PUBLISHED_BOOKS[0].slug}`} className="btn btn-primary btn-sm">
                  <BookOpen size={16} />
                  <span>Start Reading Chapter 1</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
