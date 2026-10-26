'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, RotateCcw, BookmarkCheck } from 'lucide-react';
import { Book } from '@/types/book';
import { progressService } from '@/services/progressService';
import { ReadingProgress } from '@/types/reading';
import styles from './page.module.css';

interface BookActionsProps {
  book: Book;
}

export default function BookActions({ book }: BookActionsProps) {
  const [progress, setProgress] = useState<ReadingProgress | null>(() => {
    if (typeof window === 'undefined') return null;
    return progressService.getProgress(book.slug);
  });

  useEffect(() => {
    const unsubscribe = progressService.subscribe(() => {
      setProgress(progressService.getProgress(book.slug));
    });

    return () => unsubscribe();
  }, [book.slug]);

  // Use the chapter array as the source of truth for reader availability.
  // totalChapters is a denormalized counter and can lag behind imported/edited chapters.
  const chapters = Array.isArray(book.chapters)
    ? book.chapters.filter((chapter) => chapter.isPublished !== false)
    : [];
  const hasChapters = chapters.length > 0;
  const hasProgress = Boolean(hasChapters && progress && progress.percentComplete > 0);
  const continueUrl = hasProgress
    ? `/read/${book.slug}?chapter=${progress!.lastChapterSlug}`
    : hasChapters
      ? `/read/${book.slug}?chapter=${chapters[0].slug}`
      : `/read/${book.slug}`;

  return (
    <div className={styles.quickActions}>
      {hasProgress && progress && (
        <div className={styles.progressNotice}>
          <div className={styles.progressNoticeHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookmarkCheck size={16} /> Reading in Progress
            </span>
            <span>{progress.percentComplete}% Complete</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.percentComplete}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
              }}
            />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Last position: Chapter {progress.lastChapterNumber}
          </span>
        </div>
      )}

      {hasChapters && (
        <Link href={continueUrl} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          <BookOpen size={18} />
          <span>{hasProgress ? 'Continue Reading' : 'Start Reading'}</span>
        </Link>
      )}

      {hasProgress && (
        <Link
          href={`/read/${book.slug}?chapter=${chapters[0].slug}`}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%' }}
        >
          <RotateCcw size={14} />
          <span>Restart from Chapter 1</span>
        </Link>
      )}
    </div>
  );
}
