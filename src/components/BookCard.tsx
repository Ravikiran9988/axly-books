'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, ArrowRight, Download, Share2, Check, AlertCircle } from 'lucide-react';
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

  const [shareFeedback, setShareFeedback] = useState<'success' | 'error' | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = progressService.subscribe(() => {
      setProgress(progressService.getProgress(book.slug));
    });

    return () => {
      unsubscribe();
    };
  }, [book.slug]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const canDownloadPdf = Boolean(
    book.allowPdfDownload &&
    typeof book.originalPdfUrl === 'string' &&
    book.originalPdfUrl.trim().length > 0
  );

  // Prefer the actual chapter list over the denormalized totalChapters value.
  // Older/partially updated book records can have a stale or zero count even
  // though the API supplies published chapters; that must not hide Read Book.
  const publishedChapters = Array.isArray(book.chapters)
    ? book.chapters.filter((chapter) => chapter.isPublished !== false)
    : [];
  const chapterCount = Math.max(
    0,
    publishedChapters.length,
    Number.isFinite(book.totalChapters) ? book.totalChapters : 0
  );
  const canReadOnline = book.allowOnlineReading !== false && (publishedChapters.length > 0 || chapterCount > 0);
  const hasStarted = Boolean(canReadOnline && progress && progress.percentComplete > 0);
  const activeProgress = hasStarted ? progress : null;
  const readUrl = activeProgress
    ? `/read/${book.slug}?chapter=${activeProgress.lastChapterSlug}`
    : `/read/${book.slug}`;
  const isPrivatePdfRoute = Boolean(book.originalPdfUrl?.startsWith('/api/books/'));

  const getCanonicalUrl = (): string => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/books/${book.slug}`;
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://books.axly.in';
    return `${baseUrl.replace(/\/$/, '')}/books/${book.slug}`;
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }

    try {
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.setAttribute('readonly', '');
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) return true;
      }
    } catch {
      // Fallback failed
    }

    return false;
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    const url = getCanonicalUrl();

    // Prefer Web Share API when supported
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: book.title,
          text: `Read "${book.title}" on AXLY Books`,
          url,
        });
        return;
      } catch (err: unknown) {
        // If user cancelled or dismissed share sheet, do not show error or fallback
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: Copy to clipboard
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setShareFeedback('success');
    } else {
      setShareFeedback('error');
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
    }, 2500);
  };

  return (
    <article className={styles.card}>
      <Link
        href={`/books/${book.slug}`}
        className={styles.coverWrapper}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className={styles.badgeOverlay}>
          <span className="badge badge-cyan">{canReadOnline ? 'Free Online' : canDownloadPdf ? 'Free PDF' : 'Coming Soon'}</span>
        </div>
        <div className={styles.coverFrame}>
          <Image
            src={book.coverImage || '/images/ml-deep-learning-cover.jpg'}
            alt={`Cover of ${book.title}`}
            width={240}
            height={360}
            className={styles.coverImage}
          />
        </div>
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
          {canReadOnline ? (
            <>
              <span className={styles.metaItem}><BookOpen size={14} />{chapterCount} Chapters</span>
              <span className={styles.metaItem}><Clock size={14} />~{Math.round(book.estimatedReadingTimeMinutes / 60)}h read</span>
            </>
          ) : canDownloadPdf ? (
            <span className={styles.metaItem}><Download size={14} />Download-only PDF</span>
          ) : (
            <span className={styles.metaItem}>Content coming soon</span>
          )}
        </div>

        {activeProgress && (
          <div className={styles.progressBarContainer}>
            <div className={styles.progressLabel}>
              <span>Progress</span>
              <span>{activeProgress.percentComplete}%</span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${activeProgress.percentComplete}%` }}
              />
            </div>
          </div>
        )}

        <div className={styles.actionsContainer}>
          {shareFeedback && (
            <div
              className={`${styles.shareToast} ${
                shareFeedback === 'success' ? styles.shareToastSuccess : styles.shareToastError
              }`}
              role="status"
              aria-live="polite"
            >
              {shareFeedback === 'success' ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span>Link copied to clipboard!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>Unable to copy link</span>
                </>
              )}
            </div>
          )}

          <div className={styles.actions}>
            {canReadOnline && (
              <Link href={readUrl} className={`btn btn-primary ${styles.readBtn}`}>
                <BookOpen size={16} aria-hidden="true" />
                <span>{hasStarted ? 'Continue Reading' : 'Read Book'}</span>
              </Link>
            )}

            <div className={styles.secondaryActions}>
              {canDownloadPdf && (
                <a
                  href={book.originalPdfUrl!}
                  target={isPrivatePdfRoute ? undefined : '_blank'}
                  rel={isPrivatePdfRoute ? undefined : 'noopener noreferrer'}
                  download
                  className={`btn btn-secondary ${styles.iconBtn}`}
                  title={`Download PDF: ${book.title}`}
                  aria-label={`Download PDF of ${book.title}`}
                >
                  <Download size={16} aria-hidden="true" />
                </a>
              )}

              <button
                type="button"
                onClick={handleShare}
                className={`btn btn-secondary ${styles.iconBtn} ${
                  shareFeedback === 'success' ? styles.btnSuccess : ''
                } ${shareFeedback === 'error' ? styles.btnError : ''}`}
                title={shareFeedback === 'success' ? 'Link copied!' : `Share ${book.title}`}
                aria-label={
                  shareFeedback === 'success'
                    ? `Link for ${book.title} copied to clipboard`
                    : `Share ${book.title}`
                }
              >
                {shareFeedback === 'success' ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Share2 size={16} aria-hidden="true" />
                )}
              </button>

              <Link
                href={`/books/${book.slug}`}
                className={`btn btn-secondary ${styles.iconBtn}`}
                title="View book details and table of contents"
                aria-label={`View details of ${book.title}`}
              >
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
