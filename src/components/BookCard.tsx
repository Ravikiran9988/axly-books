'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Book } from '@/types/book';
import { progressService } from '@/services/progressService';
import { ReadingProgress } from '@/types/reading';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const [progress, setProgress] = useState<ReadingProgress | null>(() => {
    return typeof window !== 'undefined' ? progressService.getProgress(book.slug) : null;
  });

  useEffect(() => {
    const unsubscribe = progressService.subscribe(() => {
      setProgress(progressService.getProgress(book.slug));
    });

    return () => {
      unsubscribe();
    };
  }, [book.slug]);

  const hasStarted = progress && progress.percentComplete > 0;
  const readUrl = hasStarted
    ? `/read/${book.slug}?chapter=${progress.lastChapterSlug}`
    : `/read/${book.slug}`;

  return (
    <article className={styles.card}>
      <Link href={`/books/${book.slug}`} className={styles.coverWrapper} tabIndex={-1}>
        <div className={styles.badgeOverlay}>
          <span className="badge badge-cyan">Free Online</span>
        </div>
        <Image
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          width={320}
          height={480}
          className={styles.coverImage}
          priority
        />
      </Link>

      <div className={styles.content}>
        <span className={styles.category}>{book.category}</span>
        <h3 className={styles.title}>
          <Link href={`/books/${book.slug}`}>{book.title}</Link>
        </h3>
        <p className={styles.subtitle}>{book.subtitle}</p>

        <p className={styles.author}>
          By{' '}
          <Link href={`/author/${book.authorSlug}`} style={{ textDecoration: 'underline' }}>
            <strong>{book.author}</strong>
          </Link>
        </p>

        <p className={styles.description}>{book.description}</p>

        <div className={styles.metaInfo}>
          <span className={styles.metaItem}>
            <BookOpen size={14} />
            {book.totalChapters} Chapters
          </span>
          <span className={styles.metaItem}>
            <Clock size={14} />
            ~{Math.round(book.estimatedReadingTimeMinutes / 60)}h read
          </span>
        </div>

        {hasStarted && (
          <div className={styles.progressBarContainer}>
            <div className={styles.progressLabel}>
              <span>Progress</span>
              <span>{progress.percentComplete}%</span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={readUrl} className={`btn btn-primary ${styles.readBtn}`}>
            <BookOpen size={16} />
            <span>{hasStarted ? 'Continue Reading' : 'Read Book'}</span>
          </Link>
          <Link
            href={`/books/${book.slug}`}
            className={`btn btn-secondary ${styles.detailsBtn}`}
            title="View book details and table of contents"
            aria-label={`View details of ${book.title}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
