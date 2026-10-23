'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Sliders,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  Copy,
} from 'lucide-react';
import { Book } from '@/types/book';
import { ReadingPreferences } from '@/types/reading';
import { progressService } from '@/services/progressService';
import styles from './reader.module.css';
import CommentsPanel from './CommentsPanel';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.75,
  fontFamily: 'serif',
  distractionFree: false,
};

interface InteractiveReaderProps {
  book: Book;
  initialChapterSlug?: string;
}

export default function InteractiveReader({ book }: InteractiveReaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterParam = searchParams ? searchParams.get('chapter') : null;

  // Find active chapter based on query param or first chapter
  const activeChapterIndex = Math.max(
    0,
    book.chapters.findIndex((c) => c.slug === chapterParam)
  );
  const currentChapter = book.chapters[activeChapterIndex] || book.chapters[0];
  const prevChapter = activeChapterIndex > 0 ? book.chapters[activeChapterIndex - 1] : null;
  const nextChapter =
    activeChapterIndex < book.chapters.length - 1 ? book.chapters[activeChapterIndex + 1] : null;

  // Preferences & State synchronized safely via React useSyncExternalStore
  const prefs = useSyncExternalStore(
    useCallback((cb) => progressService.subscribe(cb), []),
    useCallback(() => progressService.getPreferences(), []),
    () => DEFAULT_PREFERENCES
  );

  const isBookmarked = useSyncExternalStore(
    useCallback((cb) => progressService.subscribe(cb), []),
    useCallback(() => progressService.isBookmarked(book.slug, currentChapter.slug), [book.slug, currentChapter.slug]),
    () => false
  );

  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const articleRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionKey = `axly_read_position:${book.slug}:${currentChapter.slug}`;
  const wordCount = useMemo(
    () => currentChapter.sections.reduce((total, section) => total + section.content.trim().split(/\s+/).filter(Boolean).length, 0),
    [currentChapter.sections]
  );
  const chapterReadingMinutes = currentChapter.readingTimeMinutes || Math.max(1, Math.ceil(wordCount / 220));
  const remainingMinutes = Math.max(0, Math.ceil(chapterReadingMinutes * (1 - scrollProgress / 100)));

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Save chapter progress and restore the reader's last position on this device.
  useEffect(() => {
    const percent = Math.round((currentChapter.chapterNumber / book.totalChapters) * 100);
    progressService.saveProgress(
      book.slug,
      currentChapter.chapterNumber,
      currentChapter.slug,
      percent,
      true
    );

    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        restoreTimer = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 150);
      }
    } else {
      const savedPosition = Number(localStorage.getItem(positionKey) || 0);
      restoreTimer = setTimeout(() => {
        window.scrollTo({ top: savedPosition > 0 ? savedPosition : 0, behavior: 'auto' });
      }, 80);
    }

    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      try {
        localStorage.setItem(positionKey, String(Math.max(0, Math.round(window.scrollY))));
      } catch {
        // Reading continues if local storage is unavailable.
      }
    };
  }, [book.slug, book.totalChapters, currentChapter.chapterNumber, currentChapter.slug, positionKey]);

  const handleCopyCode = async (idx: number, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIdx(idx);
      showToast('Code snippet copied to clipboard');
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      showToast('Failed to copy code snippet');
    }
  };

  // Track scroll depth and persist the position without writing on every scroll event.
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const articleTop = articleRef.current
        ? articleRef.current.getBoundingClientRect().top + window.scrollY
        : 0;
      const articleHeight = articleRef.current?.offsetHeight ?? document.documentElement.scrollHeight;
      const scrollableHeight = Math.max(1, articleHeight - window.innerHeight);
      const progress = ((scrollTop - articleTop) / scrollableHeight) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(positionKey, String(Math.max(0, Math.round(window.scrollY))));
        } catch {
          // Ignore storage restrictions and keep the reader usable.
        }
      }, 250);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
    };
  }, [positionKey]);

  const updatePreference = (updates: Partial<ReadingPreferences>) => {
    progressService.savePreferences(updates);
  };

  const handleToggleBookmark = useCallback(() => {
    const currentlyBookmarked = progressService.isBookmarked(book.slug, currentChapter.slug);
    if (currentlyBookmarked) {
      progressService.removeBookmarkByChapter(book.slug, currentChapter.slug);
      showToast('Bookmark removed');
    } else {
      progressService.addBookmark(
        book.slug,
        book.title,
        currentChapter.chapterNumber,
        currentChapter.slug,
        currentChapter.title,
        currentChapter.summary
      );
      showToast(`Chapter ${currentChapter.chapterNumber} bookmarked`);
    }
  }, [book.slug, book.title, currentChapter.chapterNumber, currentChapter.slug, currentChapter.title, currentChapter.summary, showToast]);

  const toggleDistractionFree = useCallback(() => {
    const next = !prefs.distractionFree;
    progressService.savePreferences({ distractionFree: next });
    if (next) {
      showToast('Distraction-free mode enabled (Press D or click top-right to exit)');
    }
  }, [prefs.distractionFree, showToast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if focused in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      if (e.key === 'ArrowLeft' && prevChapter) {
        router.push(`/read/${book.slug}?chapter=${prevChapter.slug}`);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        router.push(`/read/${book.slug}?chapter=${nextChapter.slug}`);
      } else if (e.key.toLowerCase() === 'd') {
        toggleDistractionFree();
      } else if (e.key.toLowerCase() === 'b') {
        handleToggleBookmark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.slug, prevChapter, nextChapter, router, toggleDistractionFree, handleToggleBookmark]);

  // Font family resolution
  const getFontFamilyStyle = () => {
    switch (prefs.fontFamily) {
      case 'sans':
        return 'var(--font-sans)';
      case 'mono':
        return 'var(--font-mono)';
      case 'serif':
      default:
        return 'var(--font-serif)';
    }
  };

  // Theme class name
  const themeClass =
    prefs.theme === 'light'
      ? styles.themeLight
      : prefs.theme === 'sepia'
      ? styles.themeSepia
      : styles.themeDark;

  return (
    <div className={`${styles.readerRoot} ${themeClass}`}>
      {/* Distraction Free Exit Button */}
      {prefs.distractionFree && (
        <button
          type="button"
          className={styles.distractionFreeExitBtn}
          onClick={toggleDistractionFree}
          aria-label="Exit distraction-free mode"
        >
          <Minimize2 size={14} />
          <span>Exit Focus Mode</span>
        </button>
      )}

      {/* Top Toolbar */}
      <header
        className={`${styles.topToolbar} ${
          prefs.distractionFree ? styles.distractionFreeHidden : ''
        }`}
      >
        <div className={styles.toolbarLeft}>
          <Link
            href={`/books/${book.slug}`}
            className={styles.backBtn}
            title="Return to book overview"
          >
            <ArrowLeft size={16} />
            <span>Overview</span>
          </Link>

          <div className={styles.bookMetaTitle}>
            <span className={styles.bookTitleHeader}>{book.title}</span>
            <span className={styles.chapterTitleHeader}>
              Ch {currentChapter.chapterNumber}: {currentChapter.title}
            </span>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          {/* Table of contents toggle */}
          <button
            type="button"
            className={`${styles.toolBtn} ${tocOpen ? styles.toolBtnActive : ''}`}
            onClick={() => setTocOpen(!tocOpen)}
            title="Table of Contents"
            aria-label="Table of Contents"
          >
            <List size={18} />
          </button>

          {/* Bookmark toggle */}
          <button
            type="button"
            className={`${styles.toolBtn} ${isBookmarked ? styles.toolBtnActive : ''}`}
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Bookmarked' : 'Add Bookmark'}
            aria-label={isBookmarked ? 'Bookmarked' : 'Add Bookmark'}
          >
            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {/* Distraction free mode toggle */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={toggleDistractionFree}
            title="Toggle Distraction-Free Mode (Shortcut: D)"
            aria-label="Distraction-free mode"
          >
            <Maximize2 size={18} />
          </button>

          {/* Reader settings toggle */}
          <div style={{ position: 'relative' }} ref={settingsRef}>
            <button
              type="button"
              className={`${styles.toolBtn} ${settingsOpen ? styles.toolBtnActive : ''}`}
              onClick={() => setSettingsOpen(!settingsOpen)}
              title="Reading Preferences"
              aria-label="Reading Preferences"
            >
              <Sliders size={18} />
            </button>

            {/* Reading Settings Drawer */}
            {settingsOpen && (
              <div className={styles.settingsPanel}>
                {/* Theme Selector */}
                <div className={styles.settingRow}>
                  <span className={styles.settingLabel}>Theme</span>
                  <div className={styles.themeSelector}>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${styles.themeBtnLight} ${
                        prefs.theme === 'light' ? styles.themeBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ theme: 'light' })}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${styles.themeBtnDark} ${
                        prefs.theme === 'dark' ? styles.themeBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ theme: 'dark' })}
                    >
                      Dark
                    </button>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${styles.themeBtnSepia} ${
                        prefs.theme === 'sepia' ? styles.themeBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ theme: 'sepia' })}
                    >
                      Sepia
                    </button>
                  </div>
                </div>

                {/* Font Size Adjustment */}
                <div className={styles.settingRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={styles.settingLabel}>Font Size</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--reader-subtle)' }}>
                      {prefs.fontSize}px
                    </span>
                  </div>
                  <div className={styles.sliderRow}>
                    <span style={{ fontSize: '0.75rem' }}>A</span>
                    <input
                      type="range"
                      min={15}
                      max={24}
                      value={prefs.fontSize}
                      onChange={(e) => updatePreference({ fontSize: Number(e.target.value) })}
                      className={styles.slider}
                    />
                    <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>A</span>
                  </div>
                </div>

                {/* Line Spacing Adjustment */}
                <div className={styles.settingRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={styles.settingLabel}>Line Spacing</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--reader-subtle)' }}>
                      {prefs.lineHeight.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.4}
                    max={2.2}
                    step={0.1}
                    value={prefs.lineHeight}
                    onChange={(e) => updatePreference({ lineHeight: Number(e.target.value) })}
                    className={styles.slider}
                  />
                </div>

                {/* Typography Style */}
                <div className={styles.settingRow}>
                  <span className={styles.settingLabel}>Font Style</span>
                  <div className={styles.fontSelector}>
                    <button
                      type="button"
                      className={`${styles.fontBtn} ${
                        prefs.fontFamily === 'serif' ? styles.fontBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ fontFamily: 'serif' })}
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      Editorial
                    </button>
                    <button
                      type="button"
                      className={`${styles.fontBtn} ${
                        prefs.fontFamily === 'sans' ? styles.fontBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ fontFamily: 'sans' })}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    >
                      Modern
                    </button>
                    <button
                      type="button"
                      className={`${styles.fontBtn} ${
                        prefs.fontFamily === 'mono' ? styles.fontBtnActive : ''
                      }`}
                      onClick={() => updatePreference({ fontFamily: 'mono' })}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      Mono
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll Progress Bar */}
        <div className={styles.progressBarTop}>
          <div className={styles.progressBarFillTop} style={{ width: `${scrollProgress}%` }} />
        </div>
      </header>

      {/* Table of Contents Drawer */}
      {tocOpen && (
        <>
          <div className={styles.tocBackdrop} onClick={() => setTocOpen(false)} />
          <div className={styles.tocDrawer}>
            <div className={styles.tocDrawerHeader}>
              <span className={styles.tocDrawerTitle}>Table of Contents</span>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setTocOpen(false)}
                aria-label="Close table of contents"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.tocDrawerList}>
              {book.chapters.map((ch) => {
                const isCurrent = ch.slug === currentChapter.slug;
                return (
                  <Link
                    key={ch.id}
                    href={`/read/${book.slug}?chapter=${ch.slug}`}
                    className={`${styles.tocItem} ${isCurrent ? styles.tocItemCurrent : ''}`}
                    onClick={() => setTocOpen(false)}
                  >
                    <span style={{ fontWeight: 700, width: '22px' }}>{ch.chapterNumber}.</span>
                    <span style={{ flex: 1 }}>{ch.title}</span>
                    {isCurrent && <Check size={16} />}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Chapter Column */}
      <article
        ref={articleRef}
        className={styles.mainArticle}
        style={{
          fontFamily: getFontFamilyStyle(),
          fontSize: `${prefs.fontSize}px`,
          lineHeight: prefs.lineHeight,
        }}
      >
        <div className={styles.chapterBadge}>
          Chapter {currentChapter.chapterNumber} of {book.totalChapters}
        </div>
        <div className={styles.readingStatus} aria-label="Chapter reading information">
          <span>{chapterReadingMinutes} min read</span>
          <span className={styles.statusDot} aria-hidden="true">•</span>
          <span>{Math.round(scrollProgress)}% through chapter</span>
          <span className={styles.statusDot} aria-hidden="true">•</span>
          <span>{remainingMinutes === 0 ? 'Almost finished' : '~' + remainingMinutes + ' min left'}</span>
        </div>

        <h1 className={styles.chapterTitle}>{currentChapter.title}</h1>
        <p className={styles.chapterSummary}>{currentChapter.summary}</p>

        {/* Structured Sections with Stable Anchors */}
        {currentChapter.sections.map((section, idx) => (
          <section key={idx} id={`sec-${idx + 1}`} className={styles.contentSection}>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            <p className={styles.paragraph}>{section.content}</p>

            {/* Optional Conceptual Callout */}
            {section.callout && (
              <div className={styles.calloutBox}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {section.callout.type.toUpperCase()}:
                </strong>
                <span>{section.callout.text}</span>
              </div>
            )}

            {/* Optional Code Snippet with Copy Control */}
            {section.codeSnippet && (
              <div className={styles.codeBox}>
                <div className={styles.codeHeader}>
                  <span>{section.codeSnippet.language}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(idx, section.codeSnippet!.code)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--reader-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    aria-label="Copy code listing"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check size={13} color="var(--color-brand-cyan)" />
                        <span style={{ color: 'var(--color-brand-cyan)' }}>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className={styles.codeContent}>
                  <code>{section.codeSnippet.code}</code>
                </pre>
              </div>
            )}
          </section>
        ))}

        {/* Bottom Chapter Navigation */}
        <nav className={styles.bottomNav} aria-label="Chapter navigation">
          {prevChapter ? (
            <Link
              href={`/read/${book.slug}?chapter=${prevChapter.slug}`}
              className={styles.navPrev}
            >
              <ChevronLeft size={18} />
              <div>
                <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8 }}>
                  Previous
                </span>
                <span>Ch {prevChapter.chapterNumber}: {prevChapter.title.slice(0, 24)}...</span>
              </div>
            </Link>
          ) : (
            <div className={`${styles.navPrev} ${styles.navDisabled}`}>
              <ChevronLeft size={18} />
              <span>Beginning of Book</span>
            </div>
          )}

          {nextChapter ? (
            <Link
              href={`/read/${book.slug}?chapter=${nextChapter.slug}`}
              className={styles.navNext}
            >
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8 }}>Next</span>
                <span>Ch {nextChapter.chapterNumber}: {nextChapter.title.slice(0, 24)}...</span>
              </div>
              <ChevronRight size={18} />
            </Link>
          ) : (
            <div className={`${styles.navNext} ${styles.navDisabled}`}>
              <span>End of Book</span>
              <ChevronRight size={18} />
            </div>
          )}
        </nav>
      </article>

      <CommentsPanel bookSlug={book.slug} chapterSlug={currentChapter.slug} />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className={styles.toast}>
          <Bookmark size={15} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
