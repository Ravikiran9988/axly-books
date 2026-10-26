export type ReadingTheme = 'dark' | 'light' | 'sepia';
export type ReadingFontFamily = 'sans' | 'serif' | 'mono';

export interface ReadingPreferences {
  theme: ReadingTheme;
  fontSize: number; // e.g. 15 to 24px
  lineHeight: number; // e.g. 1.6 to 2.2
  fontFamily: ReadingFontFamily;
  distractionFree: boolean;
}

export interface ReadingProgress {
  bookSlug: string;
  lastChapterNumber: number;
  lastChapterSlug: string;
  lastChapterTitle?: string;
  percentComplete: number;
  lastReadTimestamp: number;
}

export interface Bookmark {
  id: string;
  bookSlug: string;
  bookTitle: string;
  chapterNumber: number;
  chapterSlug: string;
  chapterTitle: string;
  createdAt: number;
  excerpt?: string;
}
