'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, BookOpen, FileText } from 'lucide-react';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}
interface SearchResult {
  type: 'book' | 'chapter';
  title: string;
  sub: string;
  url: string;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch('/api/search?q=' + encodeURIComponent(query.trim()), {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Search request failed');
        const payload = await response.json() as { results?: SearchResult[] };
        if (!controller.signal.aborted) {
          setResults(Array.isArray(payload.results) ? payload.results : []);
          setResultsQuery(query.trim());
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setResultsQuery(query.trim());
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query]);

  if (!isOpen) return null;

  const visibleResults = resultsQuery === query.trim() ? results : [];

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search books, chapters, topics..."
            className={styles.input}
          />
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close search">
            <X size={20} />
          </button>
        </div>

        <div className={styles.resultsList} aria-live="polite" aria-busy={isSearching}>
          {visibleResults.length === 0 ? (
            <div className={styles.emptyState}>
              {isSearching ? 'Searching the library…' : query.trim() ? 'No matching books or chapters found for “' + query + '”' : 'No published books are available yet.'}
            </div>
          ) : (
            visibleResults.map((result, index) => (
              <Link key={result.type + '-' + result.url + '-' + index} href={result.url} className={styles.resultItem} onClick={onClose}>
                <div className={styles.resultIcon}>
                  {result.type === 'book' ? <BookOpen size={18} /> : <FileText size={18} />}
                </div>
                <div className={styles.resultDetails}>
                  <span className={styles.resultTitle}>{result.title}</span>
                  <span className={styles.resultSub}>{result.sub}</span>
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
