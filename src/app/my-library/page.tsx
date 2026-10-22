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
import { PUBLISHED_BOOKS } from '@/data/booksData';
import { progressService } from '@/services/progressService';
import { Bookmark as BookmarkType, ReadingProgress } from '@/types/reading';
import styles from './library.module.css';

export default function MyLibraryPage() {
  const [allProgress, setAllProgress] = useState<Record<string, ReadingProgress>>({});
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);

  useEffect(() => {
    const refresh = () => {
      setAllProgress(progressService.getAllProgress());
      setBookmarks(progressService.getBookmarks());
    };

    refresh();
    const unsub = progressService.subscribe(refresh);
    return () => unsub();
  }, []);

  const handleRemoveBookmark = (id: string) => {
    progressService.removeBookmark(id);
  };

  // Match progress with published books
  const activeBooks = Object.values(allProgress)
    .map((prog) => {
      const book = PUBLISHED_BOOKS.find((b) => b.slug === prog.bookSlug);
      return book ? { book, progress: prog } : null;
    })
    .filter(Boolean) as Array<{
    book: (typeof PUBLISHED_BOOKS)[0];
    progress: ReadingProgress;
  }>;

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
          <span>Currently Reading ({activeBooks.length})</span>
        </h2>

        {activeBooks.length > 0 ? (
          <div className={styles.inProgressGrid}>
            {activeBooks.map(({ book, progress }) => {
              const currentChapter =
                book.chapters.find((c) => c.slug === progress.lastChapterSlug) || book.chapters[0];

              return (
                <div key={book.id} className={styles.progressCard}>
                  <div className={styles.miniCover}>
                    <Image
                      src={book.coverImage || '/images/ml-deep-learning-cover.jpg'}
                      alt={book.title}
                      width={90}
                      height={135}
                      className={styles.miniCoverImg}
                    />
                  </div>

                  <div className={styles.progressDetails}>
                    <h3 className={styles.bookName}>{book.title}</h3>
                    <span className={styles.chapterStatus}>
                      Chapter {progress.lastChapterNumber}: {currentChapter.title}
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
