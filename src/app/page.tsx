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
  Clock,
} from 'lucide-react';
import { getServerPublishedBooks } from '@/services/serverBookService';
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
  const featuredBook = publishedBooks[0] || null;


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

          {/* Featured Publication Spotlight Banner Card */}
          <div className={styles.heroSpotlightWrapper}>
            <div className={styles.spotlightGlow} aria-hidden="true" />
            {featuredBook ? (
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightHeader}>
                  <div className={styles.spotlightPill}>
                    <span className={styles.pulseDot} />
                    <span>Featured Publication</span>
                  </div>
                  <span className={styles.spotlightBadge}>100% Free</span>
                </div>

                <div className={styles.spotlightBody}>
                  <Link
                    href={`/books/${featuredBook.slug}`}
                    className={styles.spotlightCoverLink}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <div className={styles.spotlightCoverFrame}>
                      <Image
                        src={featuredBook.coverImage || '/images/ml-deep-learning-cover.jpg'}
                        alt={`Cover of ${featuredBook.title}`}
                        width={180}
                        height={270}
                        className={styles.spotlightCoverImg}
                        priority
                      />
                    </div>
                  </Link>

                  <div className={styles.spotlightDetails}>
                    <span className={styles.spotlightCategory}>{featuredBook.category}</span>
                    <h3 className={styles.spotlightTitle}>
                      <Link href={`/books/${featuredBook.slug}`}>{featuredBook.title}</Link>
                    </h3>
                    <p className={styles.spotlightAuthor}>
                      By <strong>{featuredBook.author}</strong>
                    </p>

                    <div className={styles.spotlightMeta}>
                      <span className={styles.spotlightMetaItem}>
                        <BookOpen size={13} />
                        {featuredBook.totalChapters} Chapters
                      </span>
                      <span className={styles.spotlightMetaItem}>
                        <Clock size={13} />
                        ~{Math.round(featuredBook.estimatedReadingTimeMinutes / 60)}h Read
                      </span>
                    </div>

                    <div className={styles.spotlightActions}>
                      <Link
                        href={`/read/${featuredBook.slug}`}
                        className={`btn btn-primary ${styles.spotlightReadBtn}`}
                      >
                        <BookOpen size={15} />
                        <span>Start Reading</span>
                      </Link>
                      <Link
                        href={`/books/${featuredBook.slug}`}
                        className={`btn btn-secondary ${styles.spotlightDetailsBtn}`}
                        title="View book details and table of contents"
                        aria-label={`View details of ${featuredBook.title}`}
                      >
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className={styles.spotlightFooter}>
                  <div className={styles.spotlightFooterInfo}>
                    <CheckCircle2 size={13} className={styles.spotlightSparkle} />
                    <span>No paywalls or sign-up required</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.spotlightCard}>
                <div className={styles.spotlightHeader}>
                  <span className={styles.spotlightPill}>Axly Library</span>
                </div>
                <p style={{ color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                  No published books yet. New publications will appear here as soon as they are released.
                </p>
              </div>
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
                and make learning more approachable creating a structured path from essential data tools
                and foundational principles toward neural networks, Transformers, and modern Generative AI.&rdquo;
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
                  <span>GitHub (1250+ Contributions)</span>
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
