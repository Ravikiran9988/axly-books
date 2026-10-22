'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, BookX, RotateCcw, Sparkles } from 'lucide-react';
import { Book } from '@/types/book';
import { bookService } from '@/services/bookService';
import BookCard from '@/components/BookCard';
import styles from './page.module.css';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'chapters'>('recent');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [allBooks, allCategories] = await Promise.all([
        bookService.getBooks({
          searchQuery,
          category: selectedCategory,
          sortBy,
        }),
        bookService.getCategories(),
      ]);
      setBooks(allBooks);
      setCategories(allCategories);
      setLoading(false);
    }

    loadData();
  }, [searchQuery, selectedCategory, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('recent');
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className={styles.libraryHeader}>
        <div className="badge badge-cyan" style={{ width: 'fit-content' }}>
          <Sparkles size={12} />
          <span>AXLY Digital Library</span>
        </div>
        <h1 className={styles.libraryTitle}>All Published Books</h1>
        <p className={styles.librarySubtitle}>
          Explore published books written by Slayer. All titles are available to read online for free
          with distraction-free reading modes and saved progress.
        </p>
      </div>

      {/* Discovery Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, topics, or keywords..."
            className={styles.searchInput}
            aria-label="Search library"
          />
        </div>

        <div className={styles.filterGroup}>
          {/* Category Filter */}
          <div className={styles.selectWrap}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles.select}
              aria-label="Filter by category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>

          {/* Sort Filter */}
          <div className={styles.selectWrap}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'chapters')}
              className={styles.select}
              aria-label="Sort books"
            >
              <option value="recent">Recently Published</option>
              <option value="title">Alphabetical (Title)</option>
              <option value="chapters">Total Chapters</option>
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>

          <span className={styles.bookCount}>
            {books.length} {books.length === 1 ? 'publication' : 'publications'}
          </span>
        </div>
      </div>

      {/* Books Content */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading library catalogue...
        </div>
      ) : books.length > 0 ? (
        <div className={styles.grid}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <BookX size={28} />
          </div>
          <h3 className={styles.emptyTitle}>No matching books found</h3>
          <p className={styles.emptyDesc}>
            We couldn&apos;t find any publications matching your current search query or filter
            criteria.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
            <span>Reset Filters</span>
          </button>
        </div>
      )}

      {/* Clear Editorial Architecture Notice */}
      <div className={styles.catalogNote}>
        <strong>Note on AXLY Publishing Catalog:</strong> Currently, AXLY exclusively hosts original
        works written and published by Slayer (Medicharla Ravi Kiran). In accordance with Phase 1
        specifications, no fabricated books are presented. Additional volumes and editions will appear
        here as they are published and connected to the backend service in Phase 2.
      </div>
    </div>
  );
}
