import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ArrowRight,
  Bookmark,
  Sliders,
  CheckCircle,
  ExternalLink,
  Code2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { getServerPublishedBooks } from "@/services/serverBookService";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "4rem 0", color: "var(--text-muted)" }}>
          Loading…
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}

async function HomePageContent() {
  const publishedBooks = await getServerPublishedBooks();
  const featuredBook = publishedBooks[0] || null;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBlob1} aria-hidden="true" />
        <div className={styles.heroBlob2} aria-hidden="true" />

        <div className={`container ${styles.heroInner}`}>
          {/* LEFT — copy */}
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <BookOpen size={13} strokeWidth={2.5} />
              Independent Digital Publishing
            </span>

            <h1 className={styles.heroHeadline}>
              Read Deep.<br />
              <span className={styles.heroAccent}>Think Deeper.</span>
            </h1>

            <p className={styles.heroSub}>
              Handcrafted technical books by Slayer — free, distraction-free, and built for
              engineers who want to actually understand how things work.
            </p>

            <div className={styles.heroCtas}>
              <Link href="/books" className={styles.ctaPrimary}>
                <BookOpen size={17} strokeWidth={2.5} />
                Browse Library
              </Link>
              <Link href="/author/slayer" className={styles.ctaGhost}>
                About the Author
                <ChevronRight size={16} strokeWidth={2.5} />
              </Link>
            </div>

            <div className={styles.trustRow}>
              <span className={styles.trustPill}>
                <CheckCircle size={13} className={styles.trustIcon} />
                No paywall
              </span>
              <span className={styles.trustPill}>
                <CheckCircle size={13} className={styles.trustIcon} />
                No sign-up
              </span>
              <span className={styles.trustPill}>
                <CheckCircle size={13} className={styles.trustIcon} />
                Progress saved
              </span>
            </div>
          </div>

          {/* RIGHT — featured book card */}
          {featuredBook && (
            <div className={styles.bookCardWrap}>
              <div className={styles.bookGlowRing} aria-hidden="true" />
              <div className={styles.bookCard}>
                <div className={styles.bookCardTop}>
                  <span className={styles.livePill}>
                    <span className={styles.liveDot} />
                    Now Available
                  </span>
                  <span className={styles.freePill}>Free</span>
                </div>

                <Link
                  href={`/books/${featuredBook.slug}`}
                  className={styles.coverLink}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <div className={styles.coverFrame}>
                    <Image
                      src={featuredBook.coverImage || "/images/ml-deep-learning-cover.jpg"}
                      alt={`Cover of ${featuredBook.title}`}
                      fill
                      className={styles.coverImg}
                      priority
                      sizes="(max-width: 900px) 100vw, 340px"
                    />
                    <div className={styles.coverSheen} aria-hidden="true" />
                  </div>
                </Link>

                <div className={styles.bookMeta}>
                  <span className={styles.bookCategory}>{featuredBook.category}</span>
                  <h2 className={styles.bookTitle}>
                    <Link href={`/books/${featuredBook.slug}`}>{featuredBook.title}</Link>
                  </h2>
                  <p className={styles.bookAuthor}>
                    by <strong>{featuredBook.author}</strong>
                  </p>

                  <div className={styles.bookStats}>
                    <span className={styles.bookStat}>
                      <BookOpen size={12} />
                      {featuredBook.totalChapters} chapters
                    </span>
                    <span className={styles.bookStatDivider} />
                    <span className={styles.bookStat}>
                      <Clock size={12} />
                      ~{Math.round(featuredBook.estimatedReadingTimeMinutes / 60)}h read
                    </span>
                  </div>

                  <div className={styles.bookActions}>
                    <Link href={`/read/${featuredBook.slug}`} className={styles.readBtn}>
                      <BookOpen size={15} strokeWidth={2.5} />
                      Start Reading
                    </Link>
                    <Link
                      href={`/books/${featuredBook.slug}`}
                      className={styles.detailBtn}
                      aria-label="Book details"
                    >
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <div className={styles.statsBar}>
        <div className={`container ${styles.statsInner}`}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{publishedBooks.length}</span>
            <span className={styles.statLabel}>{publishedBooks.length === 1 ? "Book" : "Books"} Published</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>
              {publishedBooks.reduce((a, b) => a + (b.totalChapters ?? 0), 0)}
            </span>
            <span className={styles.statLabel}>Chapters</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>100%</span>
            <span className={styles.statLabel}>Free Access</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNum}>0</span>
            <span className={styles.statLabel}>Paywalls</span>
          </div>
        </div>
      </div>

      {/* ── READING EXPERIENCE ───────────────────────────────── */}
      <section className={styles.featuresSection}>
        <div className="container">
          <div className={styles.featuresHeader}>
            <span className={styles.sectionEyebrow}>Reading Experience</span>
            <h2 className={styles.sectionHeading}>Built for Readers Who Mean Business</h2>
            <p className={styles.sectionSub}>
              No ads, no popups, no noise. Just you, the content, and a reader
              engineered around how engineers actually study.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={`${styles.featureCard} ${styles.featureBlue}`}>
              <div className={styles.featureIconBox}>
                <BookOpen size={24} strokeWidth={1.8} />
              </div>
              <h3 className={styles.featureTitle}>Chapter Navigation</h3>
              <p className={styles.featureDesc}>
                Slide-out table of contents. Jump anywhere instantly. Never lose your thread.
              </p>
            </div>
            <div className={`${styles.featureCard} ${styles.featurePurple}`}>
              <div className={styles.featureIconBox}>
                <Sliders size={24} strokeWidth={1.8} />
              </div>
              <h3 className={styles.featureTitle}>Reading Preferences</h3>
              <p className={styles.featureDesc}>
                Dark, Light, or Sepia. Adjust font size, line height, and focus mode on the fly.
              </p>
            </div>
            <div className={`${styles.featureCard} ${styles.featureGreen}`}>
              <div className={styles.featureIconBox}>
                <Bookmark size={24} strokeWidth={1.8} />
              </div>
              <h3 className={styles.featureTitle}>Auto-saved Progress</h3>
              <p className={styles.featureDesc}>
                Your position is saved the moment you scroll. Resume exactly where you left off.
              </p>
            </div>
            <div className={`${styles.featureCard} ${styles.featureAmber}`}>
              <div className={styles.featureIconBox}>
                <Code2 size={24} strokeWidth={1.8} />
              </div>
              <h3 className={styles.featureTitle}>Code &amp; Math Ready</h3>
              <p className={styles.featureDesc}>
                High-contrast syntax blocks and formatted formulae rendered for engineering clarity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUTHOR ───────────────────────────────────────────── */}
      <section className={styles.authorSection}>
        <div className="container">
          <div className={styles.authorCard}>
            <div className={styles.authorCardAccent} aria-hidden="true" />

            <div className={styles.authorLeft}>
              <div className={styles.authorAvatar}>S</div>
              <span className={styles.authorBadge}>Author · Engineer</span>
            </div>

            <div className={styles.authorRight}>
              <span className={styles.sectionEyebrow}>Meet the Author</span>
              <h2 className={styles.authorName}>Medicharla Ravi Kiran</h2>
              <p className={styles.authorHandle}>Slayer · AI/ML Engineer &amp; Full-Stack Developer</p>

              <blockquote className={styles.authorQuote}>
                &ldquo;Through writing, I aim to organise knowledge, explain technical
                concepts, and make learning more approachable. My book,{" "}
                <em>ML + Deep Learning Fundamentals</em>, presents a structured path from
                essential data tools toward Transformers and modern Generative AI.&rdquo;
              </blockquote>

              <div className={styles.authorLinks}>
                <Link href="/author/slayer" className={styles.authorLinkPrimary}>
                  Full Profile
                  <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
                <a
                  href="https://github.com/Ravikiran9988/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.authorLinkSecondary}
                >
                  <Code2 size={15} />
                  GitHub
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
