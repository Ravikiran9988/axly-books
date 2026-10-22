export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  slug: string;
  readingTimeMinutes: number;
  summary: string;
  isPublished?: boolean;
  sections: {
    title: string;
    content: string;
    codeSnippet?: {
      language: string;
      code: string;
    };
    callout?: {
      type: 'tip' | 'note' | 'concept';
      text: string;
    };
  }[];
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  authorRealName: string;
  authorSlug: string;
  coverImage: string;
  description: string;
  synopsis: string;
  category: string;
  tags: string[];
  edition: string;
  publishedYear: number;
  publicationStatus: 'Available Free' | 'Upcoming';
  totalChapters: number;
  estimatedReadingTimeMinutes: number;
  isFree: boolean;
  isPublished?: boolean;
  allowPdfDownload: boolean;
  copyrightNotice: string;
  license: string;
  licenseUrl?: string;
  chapters: Chapter[];
}

export interface BookFilter {
  searchQuery?: string;
  category?: string;
  status?: string;
  sortBy?: 'recent' | 'title' | 'chapters';
}
