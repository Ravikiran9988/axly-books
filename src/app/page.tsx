import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  ArrowRight,
  Bookmark,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { getServerPublishedBooks } from '@/services/serverBookService';
import BookCard from '@/components/BookCard';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '4rem 0', color: 'var(--text-muted)' }}>Loading published books...</div>}>
      <HomePageContent />
    </Suspense>
  );
}

async function HomePageContent() {
  const publishedBooks = await getServerPublishedBooks();
  const featuredBook = publishedBooks[0] ?? null;

  return (
    <>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroContent}>
            <div className={styles.brandPill}>
              <BookOpen size={14} />
              <span>Independent Digital Publishing</span>
            </div>

            <h1 className={styles.headline}>
              A World of Ideas, <br />
              <span className={styles.headlineHighlight}>One Page at a Time.</span>
            </h1>

            <p className={styles.heroCopy}>
              Discover and read books by Slayer. Explore technology, learning, and meaningful ideas
              in one thoughtfully designed reading space.
            </p>

            <div className={styles.ctaGroup}>
              <Link href="/books" className="btn btn-primary btn-lg">
                <BookOpen size={18} />
                <span>Explore Books</span>
              </Link>
              <Link href="/author/slayer" className="btn btn-secondary btn-lg">
                <span>Meet the Author</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.heroFeatures}>
              <div className={styles.heroFeatureItem}>
                <CheckCircle2 size={16} className={styles.heroFeatureIcon} />
                <span>100% Free Online Reading</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <CheckCircle2 size={16} className={styles.heroFeatureIcon} />
                <span>Distraction-Free Reader</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <CheckCircle2 size={16} className={styles.heroFeatureIcon} />
                <span>Saved Reading Progress</span>
              </div>
            </div>
          </div>

          {/* Featured Book Presentation */}
          <div className={styles.featuredShowcase}>
            {featuredBook ? (
              <div className={styles.book3dWrapper}>
                <div className={styles.bookCoverGlow} />
                <Link
                  href={`/books/${featuredBook.slug}`}
                  className={styles.book3dFrame}
                  aria-label={`View ${featuredBook.title}`}
                >
                  <Image
                    src={featuredBook.coverImage || '/images/ml-deep-learning-cover.jpg'}
                    alt={`Cover of ${featuredBook.title}`}
                    width={340}
                    height={510}
                    className={styles.bookImage}
                    style={{ width: '100%', height: 'auto' }}
                    priority
                  />
                </Link>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No books are currently published. Check back soon.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Book Spotlight */}
      <section className={styles.section} style={{ paddingTop: '2rem' }}>
        <div className="container">
          <div className={styles.sectionHeaderRow}>
            <div>
              <span className={styles.sectionTag}>Featured Publication</span>
              <h2 className={styles.sectionTitle}>Essential Reading for AI Practitioners</h2>
            </div>
            {featuredBook && (
              <Link href={`/books/${featuredBook.slug}`} className="btn btn-outline">
                <span>View Book Details</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>

          <div className={styles.booksGrid}>
            {publishedBooks.length > 0 ? (
              publishedBooks.map((book) => <BookCard key={book.id} book={book} />)
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>
                No published books yet. New titles will appear here when they are ready.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Reading Experience Preview */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.previewBox}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>Reading Experience</span>
              <h2 className={styles.sectionTitle}>Crafted for Depth, Focus, and Comfort</h2>
              <p className={styles.sectionDesc}>
                AXLY removes the clutter of typical reading apps. Everything is engineered to give
                you a clean editorial canvas designed for deep technical comprehension.
              </p>
            </div>

            <div className={styles.previewGrid}>
              <div className={styles.previewCard}>
                <div className={styles.previewIconWrap}>
                  <BookOpen size={22} />
                </div>
                <h3 className={styles.previewCardTitle}>Instant Chapter Navigation</h3>
                <p className={styles.previewCardText}>
                  Jump between sections effortlessly using the slide-out table of contents.
                  Seamlessly move through consecutive chapters with single-click navigation.
                </p>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewIconWrap}>
                  <Sliders size={22} />
                </div>
                <h3 className={styles.previewCardTitle}>Reading Preferences</h3>
                <p className={styles.previewCardText}>
                  Tailor your environment with Dark, Light, or Sepia themes. Customize font sizes,
                  line heights, and toggle distraction-free mode for immersive focus.
                </p>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewIconWrap}>
                  <Bookmark size={22} />
                </div>
                <h3 className={styles.previewCardTitle}>Bookmarks & Progress</h3>
                <p className={styles.previewCardText}>
                  Never lose your place. Your last read position is saved automatically, allowing
                  you to resume reading seamlessly across study sessions.
                </p>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewIconWrap}>
                  <Code2 size={22} />
                </div>
                <h3 className={styles.previewCardTitle}>Syntax & Mathematical Formulae</h3>
                <p className={styles.previewCardText}>
                  High-contrast code blocks and conceptual callouts formatted specifically for
                  developers and machine learning researchers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About the Author Intro */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.authorBanner}>
            <div className={styles.authorAvatarWrap}>
              <div className={styles.authorAvatar}>S</div>
              <span className={styles.authorBadge}>Author · Slayer</span>
            </div>

            <div className={styles.authorDetails}>
              <div>
                <h2 className={styles.authorName}>Medicharla Ravi Kiran (Slayer)</h2>
                <p className={styles.authorRole}>AI/ML Engineer & Full-Stack Developer</p>
              </div>

              <p className={styles.authorBioExcerpt}>
                &ldquo;Through writing, I aim to organise knowledge, explain technical concepts,
                and make learning more approachable. My book, <em>ML + Deep Learning Fundamentals</em>,
                presents a structured path from essential data tools and machine learning concepts toward
                neural networks, Transformers, and modern Generative AI.&rdquo;
              </p>

              <div className={styles.authorLinksRow}>
                <Link href="/author/slayer" className="btn btn-primary">
                  <span>Read Full Author Profile</span>
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="https://github.com/Ravikiran9988/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  <Code2 size={16} />
                  <span>GitHub (700+ Contributions)</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
