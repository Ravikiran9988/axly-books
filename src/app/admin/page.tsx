import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { desc, sql } from 'drizzle-orm';
import {
  BookOpen,
  FileText,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import styles from './admin.module.css';

export const instant = false;

export default async function AdminOverviewPage() {
  let booksList: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    category: string;
    coverImageUrl: string;
    isPublished: boolean;
    totalChapters: number;
    updatedAt: Date;
  }> = [];

  let totalBooks = 0;
  let publishedBooks = 0;
  let draftBooks = 0;
  let totalChapters = 0;

  if (isDatabaseConfigured() && db) {
    const rawBooks = await db
      .select()
      .from(schema.books)
      .orderBy(desc(schema.books.createdAt));

    const chapterStats = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.chapters);

    booksList = rawBooks.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      category: b.category,
      coverImageUrl: b.coverImageUrl,
      isPublished: b.isPublished,
      totalChapters: b.totalChapters,
      updatedAt: b.updatedAt,
    }));

    totalBooks = booksList.length;
    publishedBooks = booksList.filter((b) => b.isPublished).length;
    draftBooks = booksList.filter((b) => !b.isPublished).length;
    totalChapters = Number(chapterStats[0]?.count || 0);
  } else {
    // Fallback for development without DB
    booksList = PUBLISHED_BOOKS.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      category: b.category,
      coverImageUrl: b.coverImage,
      isPublished: b.isPublished ?? true,
      totalChapters: b.totalChapters,
      updatedAt: new Date(0),
    }));

    totalBooks = booksList.length;
    publishedBooks = booksList.filter((b) => b.isPublished).length;
    draftBooks = totalBooks - publishedBooks;
    totalChapters = PUBLISHED_BOOKS.reduce((acc, b) => acc + (b.totalChapters || 0), 0);
  }

  return (
    <div>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.pageTitle}>Dashboard Overview</h1>
          <p className={styles.pageDesc}>
            Summary of publications, drafts, and chapter records stored in Neon PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/books" className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Manage Books</span>
          </Link>
        </div>
      </header>

      {/* Truthful Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <BookOpen size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{totalBooks}</div>
            <div className={styles.statLabel}>Total Books</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{publishedBooks}</div>
            <div className={styles.statLabel}>Published Books</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
            <Clock size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{draftBooks}</div>
            <div className={styles.statLabel}>Draft / Unpublished</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FileText size={24} />
          </div>
          <div>
            <div className={styles.statValue}>{totalChapters}</div>
            <div className={styles.statLabel}>Total Chapters</div>
          </div>
        </div>
      </div>

      {/* Recent Books Table */}
      <div style={{ marginTop: '2rem' }}>
        <div className={styles.toolbarRow}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Books
          </h2>
          <Link href="/admin/books" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-brand-cyan)' }}>
            <span>View All Books</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Book</th>
                <th>Category</th>
                <th>Chapters</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {booksList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No books found. Click &quot;Manage Books&quot; to create your first book.
                  </td>
                </tr>
              ) : (
                booksList.slice(0, 5).map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className={styles.bookTitleCol}>
                        <Image
                          src={book.coverImageUrl || '/images/ml-deep-learning-cover.jpg'}
                          alt={book.title}
                          width={44}
                          height={60}
                          className={styles.bookThumbnail}
                        />
                        <div>
                          <div className={styles.bookTitleText}>{book.title}</div>
                          <div className={styles.bookSlugText}>/{book.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{book.category}</td>
                    <td>{book.totalChapters} chapters</td>
                    <td>
                      {book.isPublished ? (
                        <span className={styles.badgePublished}>
                          <CheckCircle size={12} />
                          Published
                        </span>
                      ) : (
                        <span className={styles.badgeDraft}>
                          <Clock size={12} />
                          Draft
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionButtonGroup}>
                        <Link
                          href={`/admin/books/${book.id}/chapters`}
                          className={styles.btnAction}
                        >
                          <FileText size={14} />
                          <span>Chapters</span>
                        </Link>
                        <Link
                          href={`/books/${book.slug}`}
                          className={styles.btnAction}
                          target="_blank"
                          title="Preview public reader page"
                        >
                          <Eye size={14} />
                          <span>Preview</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
