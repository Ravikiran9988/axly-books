'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bookmark,
  BookOpen,
  ArrowRight,
  Trash2,
  BookmarkX,
  Library,
} from 'lucide-react';
import { progressService } from '@/services/progressService';
import { Bookmark as BookmarkType, ReadingProgress } from '@/types/reading';
import styles from './library.module.css';

interface LibraryBook {
  id: string;
  slug: string;
  title: string;
  coverImage?: string;
  coverImageUrl?: string;
  allowOnlineReading?: boolean;
}

export default function MyLibraryPage() {
  const [allProgress, setAllProgress] = useState<Record<string, ReadingProgress>>({});
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      setAllProgress(progressService.getAllProgress());
      setBookmarks(progressService.getBookmarks());
    };

    refresh();
    const unsubscribe = progressService.subscribe(refresh);

    // Use the live catalogue instead of PUBLISHED_BOOKS. That static file is
    // intentionally empty in production, so matching progress against it made
    // every reader's shelf appear empty even when a book card showed progress.
    const loadBooks = async () => {
      try {
        const response = await fetch('/api/books', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load the published book catalogue.');
        const data = await response.json();
        const catalogue = Array.isArray(data.books)
          ? data.books.filter(
              (book: unknown): book is LibraryBook =>
                Boolean(
                  book &&
                  typeof book === 'object' &&
                  'slug' in book &&
                  typeof book.slug === 'string' &&
                  'title' in book &&
                  typeof book.title === 'string'
                )
            )
          : [];
        if (!cancelled) setBooks(catalogue);
      } catch {
        if (!cancelled) setBooks([]);
      } finally {
        if (!cancelled) setLoadingBooks(false);
      }
    };

    void loadBooks();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleRemoveBookmark = (id: string) => {
    progressService.removeBookmark(id);
  };

  // Match saved progress against the live published catalogue, not static seed data.
  const booksBySlug = new Map(books.map((book) => [book.slug, book]));
  const activeBooks = Object.values(allProgress)
    .map((progress) => {
      const book = booksBySlug.get(progress.bookSlug);
      return book && book.allowOnlineReading !== false
        ? { book, progress }
        : null;
    })
    .filter((entry): entry is { book: LibraryBook; progress: ReadingProgress } => entry !== null);

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.header}>
        <div className="badge badge-cyan" style={{ width: 'fit-content' }}>
          <Library size={13} />
          <span>Personal Shelf</span>
        </div>
        <h1 className={styles.title}>My Library & Reading Progress</h1>
        <p className={styles.subtitle}>
          Resume your reading journey where you left off. All your saved chapters and bookmarks are
          tracked here.
        </p>
      </div>

      {/* In-Progress Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <BookOpen size={20} color="var(--color-brand-cyan)" />
          <span>Currently Reading ({loadingBooks ? '…' : activeBooks.length})</span>
        </h2>

        {loadingBooks ? (
          <div className={styles.emptyState} role="status">Loading your library…</div>
        ) : activeBooks.length > 0 ? (
          <div className={styles.inProgressGrid}>
            {activeBooks.map(({ book, progress }) => {


              return (
                <div key={book.id} className={styles.progressCard}>
                  <div className={styles.miniCover}>
                    <Image
                      src={book.coverImage || book.coverImageUrl || '/images/ml-deep-learning-cover.jpg'}
                      alt={book.title}
                      width={90}
                      height={135}
                      className={styles.miniCoverImg}
                    />
                  </div>

                  <div className={styles.progressDetails}>
                    <h3 className={styles.bookName}>{book.title}</h3>
                    <span className={styles.chapterStatus}>
                      Chapter {progress.lastChapterNumber}
                      {progress.lastChapterTitle ? `: ${progress.lastChapterTitle}` : ''}
                    </span>

                    <div className={styles.progressBarWrap}>
                      <div className={styles.progressLabels}>
                        <span>Progress</span>
                        <span>{progress.percentComplete}%</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${progress.percentComplete}%` }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '0.25rem' }}>
                      <Link
                        href={`/read/${book.slug}?chapter=${progress.lastChapterSlug}`}
                        className="btn btn-primary btn-sm"
                      >
                        <BookOpen size={14} />
                        <span>Continue Reading</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BookOpen size={26} />
            </div>
            <h3 className={styles.emptyTitle}>No reading progress yet</h3>
            <p className={styles.emptyDesc}>
              You haven&apos;t started reading any books yet. Explore our digital library and dive into
              available technical volumes for free.
            </p>
            <Link href="/books" className="btn btn-primary">
              <span>Explore Book Library</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>

      {/* Bookmarks Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Bookmark size={20} color="var(--color-brand-cyan)" />
          <span>Saved Chapter Bookmarks ({bookmarks.length})</span>
        </h2>

        {bookmarks.length > 0 ? (
          <div className={styles.bookmarksList}>
            {bookmarks.map((bm) => (
              <div key={bm.id} className={styles.bookmarkItem}>
                <div className={styles.bookmarkLeft}>
                  <Bookmark size={20} className={styles.bookmarkIcon} fill="currentColor" />
                  <div>
                    <h3 className={styles.bookmarkTitle}>
                      Chapter {bm.chapterNumber}: {bm.chapterTitle}
                    </h3>
                    <span className={styles.bookmarkBook}>{bm.bookTitle}</span>
                  </div>
                </div>

                <div className={styles.bookmarkActions}>
                  <Link
                    href={`/read/${bm.bookSlug}?chapter=${bm.chapterSlug}`}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>Jump to Chapter</span>
                    <ArrowRight size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(bm.id)}
                    className="btn btn-outline btn-sm"
                    title="Remove bookmark"
                    aria-label="Remove bookmark"
                  >
                    <Trash2 size={15} color="var(--status-error)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BookmarkX size={26} />
            </div>
            <h3 className={styles.emptyTitle}>No saved bookmarks</h3>
            <p className={styles.emptyDesc}>
              When reading a chapter, click the bookmark icon or press &apos;B&apos; on your keyboard
              to save your favorite reading milestones here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
