import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, ChevronRight, Download } from 'lucide-react';
import { getServerBookBySlug } from '@/services/serverBookService';
import BookActions from './BookActions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface BookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BookPageProps) {
  const { slug } = await params;
  const book = await getServerBookBySlug(slug);
  if (!book) return { title: 'Book Not Found · AXLY' };

  return {
    title: `${book.title} — AXLY Books`,
    description: book.description,
  };
}

export default async function BookDetailPage({ params }: BookPageProps) {
  const { slug } = await params;
  const book = await getServerBookBySlug(slug);

  if (!book) {
    notFound();
  }

  const hours = Math.round(book.estimatedReadingTimeMinutes / 60);

  return (
    <div className={`container ${styles.container}`}>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginBottom: '2rem',
        }}
      >
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>
          Home
        </Link>
        <ChevronRight size={14} />
        <Link href="/books" style={{ color: 'var(--text-secondary)' }}>
          Books
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--color-brand-cyan)' }}>{book.title}</span>
      </nav>

      {/* Main Book Hero */}
      <div className={styles.bookHero}>
        {/* Cover Column */}
        <div className={styles.coverSide}>
          <div className={styles.coverFrame}>
            <Image
              src={book.coverImage || '/images/ml-deep-learning-cover.jpg'}
              alt={`Cover of ${book.title}`}
              width={340}
              height={510}
              className={styles.coverImg}
              style={{ width: '100%', height: 'auto' }}
              priority
            />
          </div>

          {/* Interactive Start/Continue Reading CTA (Client Component) */}
          <BookActions book={book} />
          {book.allowPdfDownload && book.originalPdfUrl && (
            <a
              href={book.originalPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', width: '100%' }}
            >
              <Download size={16} /> Download original PDF
            </a>
          )}
        </div>

        {/* Info Column */}
        <div className={styles.infoSide}>
          <div className={styles.tagsRow}>
            <span className="badge badge-cyan">{book.publicationStatus}</span>
            <span className="badge badge-muted">{book.category}</span>
            <span className="badge badge-muted">{book.edition}</span>
          </div>

          <div>
            <h1 className={styles.mainTitle}>{book.title}</h1>
            <p className={styles.mainSubtitle}>{book.subtitle}</p>
          </div>

          <p className={styles.authorLine}>
            Authored by{' '}
            <Link href={`/author/${book.authorSlug}`}>
              {book.author} ({book.authorRealName})
            </Link>
          </p>

          {/* Key Metadata Grid */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Total Chapters</span>
              <span className={styles.metaVal}>{book.totalChapters} Chapters</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Reading Time</span>
              <span className={styles.metaVal}>~{hours} Hours</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Edition</span>
              <span className={styles.metaVal}>{book.edition}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Access</span>
              <span className={styles.metaVal} style={{ color: 'var(--color-brand-cyan)' }}>
                100% Free
              </span>
            </div>
          </div>

          {/* Description & Detailed Synopsis */}
          <div className={styles.synopsisSection}>
            <h2 className={styles.synopsisTitle}>About this Publication</h2>
            <p>{book.synopsis}</p>
          </div>

          {/* Legal Rights & License Presentation */}
          <div
            style={{
              padding: '1.25rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {book.copyrightNotice}
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                CC BY-NC 4.0
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
              Licensed under{' '}
              <a
                href={book.licenseUrl || 'https://creativecommons.org/licenses/by-nc/4.0/'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-brand-cyan)', textDecoration: 'underline' }}
              >
                {book.license}
              </a>
              . Free online access for individual educational study and technical advancement.
            </p>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {book.tags.map((tag) => (
              <span key={tag} className="badge badge-muted" style={{ fontSize: '0.8rem' }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <section className={styles.tocSection}>
        <h2 className={styles.tocTitle}>Table of Contents</h2>
        <p className={styles.tocDesc}>
          {book.totalChapters} comprehensive chapters covering foundations to state-of-the-art
          Generative AI. Select any chapter to begin reading immediately.
        </p>

        <div className={styles.tocList}>
          {book.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/read/${book.slug}?chapter=${chapter.slug}`}
              className={styles.chapterItem}
            >
              <div className={styles.chapterLeft}>
                <div className={styles.chapterNumber}>{chapter.chapterNumber}</div>
                <div className={styles.chapterInfo}>
                  <span className={styles.chapterTitle}>{chapter.title}</span>
                  <span className={styles.chapterSummary}>{chapter.summary}</span>
                </div>
              </div>

              <div className={styles.chapterRight}>
                <Clock size={14} />
                <span>{chapter.readingTimeMinutes} min read</span>
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
