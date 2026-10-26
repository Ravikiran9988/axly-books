import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- Users Table ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('reader').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Sessions Table ---
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Password Resets Table ---
export const passwordResets = pgTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),

export const authors = pgTable('authors', {
  id: text('id').primaryKey(),
  penName: text('pen_name').notNull().unique(), // 'Slayer'
  fullName: text('full_name').notNull(), // 'Medicharla Ravi Kiran'
  roleTitle: text('role_title').notNull(),
  bio: text('bio').notNull(),
  educationDegree: text('education_degree').notNull(),
  educationInstitution: text('education_institution').notNull(),
  githubUrl: text('github_url').notNull(),
  linkedinUrl: text('linkedin_url').notNull(),
  email: text('email').notNull(),
  projectsCount: integer('projects_count').default(10).notNull(),
  githubContributions: integer('github_contributions').default(1250).notNull(),
  writingPhilosophy: jsonb('writing_philosophy')
    .$type<Array<{ title: string; description: string }>>()
    .default([])
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Books Table ---
export const books = pgTable('books', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  description: text('description').notNull(),
  synopsis: text('synopsis').notNull(),
  authorName: text('author_name').default('Slayer').notNull(),
  authorId: text('author_id').references(() => authors.id, { onDelete: 'set null' }),
  coverImageUrl: text('cover_image_url').notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  edition: text('edition').notNull(),
  publishedYear: integer('published_year').default(2026).notNull(),
  status: text('status').default('Available Free').notNull(),
  isFree: boolean('is_free').default(true).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  totalChapters: integer('total_chapters').default(0).notNull(),
  estimatedReadingTimeMinutes: integer('estimated_reading_time_minutes').default(0).notNull(),
  allowPdfDownload: boolean('allow_pdf_download').default(false).notNull(),
  originalPdfUrl: text('original_pdf_url'),
  originalPdfPath: text('original_pdf_path'),
  license: text('license').default('All Rights Reserved').notNull(),
  licenseUrl: text('license_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Chapters Table ---
export const chapters = pgTable(
  'chapters',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary').notNull(),
    content: jsonb('content')
      .$type<
        Array<{
          title: string;
          content: string;
          codeSnippet?: { language: string; code: string };
          callout?: { type: 'tip' | 'note' | 'concept'; text: string };
        }>
      >()
      .notNull(),
    estimatedReadingTimeMinutes: integer('estimated_reading_time_minutes').default(0).notNull(),
    isPublished: boolean('is_published').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('book_chapter_num_idx').on(table.bookId, table.chapterNumber),
    uniqueIndex('book_chapter_slug_idx').on(table.bookId, table.slug),
  ]
);

// --- Chapter Comments ---
// Comments are tied to both a book and chapter so discussions never leak across books.
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    bookId: text('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentCommentId: text('parent_comment_id'),
    content: text('content').notNull(),
    status: text('status').default('published').notNull(), // published | hidden
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('comments_id_book_chapter_idx').on(table.id, table.bookId, table.chapterId),
  ]
);

export const commentVotes = pgTable(
  'comment_votes',
  {
    id: text('id').primaryKey(),
    commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('comment_vote_user_idx').on(table.commentId, table.userId)]
);

export const commentReports = pgTable(
  'comment_reports',
  {
    id: text('id').primaryKey(),
    commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    details: text('details'),
    status: text('status').default('open').notNull(), // open | reviewed | dismissed
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('comment_report_user_idx').on(table.commentId, table.userId)]
);

// --- Rate Limits Table (Shared Multi-Instance Persistence) ---
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').default(1).notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Reading Progress Table ---
export const readingProgress = pgTable(
  'reading_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    lastReadAnchor: text('last_read_anchor'),
    progressPercentage: integer('progress_percentage').default(0).notNull(),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Enforce exactly one progress record per user and book
    uniqueIndex('user_book_progress_idx').on(table.userId, table.bookId),
  ]
);

// --- Bookmarks Table ---
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: text('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    chapterId: text('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    anchor: text('anchor'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_book_chapter_bookmark_idx').on(
      table.userId,
      table.bookId,
      table.chapterId
    ),
  ]
);

// --- Reader Preferences Table ---
export const readerPreferences = pgTable('reader_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  fontSize: integer('font_size').default(18).notNull(),
  lineHeight: real('line_spacing').default(1.75).notNull(),
  readingTheme: text('reading_theme').default('light').notNull(),
  fontFamily: text('font_family').default('serif').notNull(),
  distractionFree: boolean('distraction_free').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Relations ---
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  readingProgress: many(readingProgress),
  bookmarks: many(bookmarks),
  comments: many(comments),
  commentVotes: many(commentVotes),
  commentReports: many(commentReports),
  preferences: one(readerPreferences, {
    fields: [users.id],
    references: [readerPreferences.userId],
  }),
}));

export const booksRelations = relations(books, ({ many, one }) => ({
  author: one(authors, {
    fields: [books.authorId],
    references: [authors.id],
  }),
  chapters: many(chapters),
  readingProgress: many(readingProgress),
  bookmarks: many(bookmarks),
  comments: many(comments),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  book: one(books, { fields: [comments.bookId], references: [books.id] }),
  chapter: one(chapters, { fields: [comments.chapterId], references: [chapters.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  votes: many(commentVotes),
  reports: many(commentReports),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, { fields: [commentVotes.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentVotes.userId], references: [users.id] }),
}));

export const commentReportsRelations = relations(commentReports, ({ one }) => ({
  comment: one(comments, { fields: [commentReports.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentReports.userId], references: [users.id] }),
}));
