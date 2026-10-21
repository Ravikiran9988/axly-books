'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, FileText } from 'lucide-react';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search books and chapters
  const results: Array<{
    type: 'book' | 'chapter';
    title: string;
    sub: string;
    url: string;
  }> = [];

  PUBLISHED_BOOKS.forEach((book) => {
    if (!trimmed || book.title.toLowerCase().includes(trimmed) || book.description.toLowerCase().includes(trimmed)) {
      results.push({
        type: 'book',
        title: book.title,
        sub: `Book · ${book.category}`,
        url: `/books/${book.slug}`,
      });
    }

    book.chapters.forEach((ch) => {
      if (
        trimmed &&
        (ch.title.toLowerCase().includes(trimmed) ||
          ch.summary.toLowerCase().includes(trimmed) ||
          ch.sections.some((s) => s.title.toLowerCase().includes(trimmed)))
      ) {
        results.push({
          type: 'chapter',
          title: `Ch ${ch.chapterNumber}: ${ch.title}`,
          sub: `${book.title} · ${ch.readingTimeMinutes} min read`,
          url: `/read/${book.slug}?chapter=${ch.slug}`,
        });
      }
    });
  });

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search digital library"
    >
      <div className={styles.modal}>
        <div className={styles.inputRow}>
          <Search size={20} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, chapters, topics..."
            className={styles.input}
          />
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.resultsList}>
          {results.length === 0 ? (
            <div className={styles.emptyState}>
              No matching books or chapters found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.slice(0, 8).map((res, i) => (
              <Link
                key={i}
                href={res.url}
                className={styles.resultItem}
                onClick={onClose}
              >
                <div className={styles.resultIcon}>
                  {res.type === 'book' ? <BookOpen size={18} /> : <FileText size={18} />}
                </div>
                <div className={styles.resultDetails}>
                  <span className={styles.resultTitle}>{res.title}</span>
                  <span className={styles.resultSub}>{res.sub}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span>Navigate with arrow keys or click</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
