import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Display name must be at least 2 characters.' })
    .max(60, { message: 'Display name cannot exceed 60 characters.' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .max(100, { message: 'Password is too long.' }),
  agreeTerms: z.literal(true, {
    message: 'You must agree to the Terms of Use and Privacy Notice.',
  }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Password is required.' }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please enter a valid email address.' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, { message: 'Invalid or missing recovery token.' }),
  newPassword: z
    .string()
    .min(8, { message: 'New password must be at least 8 characters.' })
    .max(100, { message: 'Password is too long.' }),
});

export const progressUpdateSchema = z.object({
  bookSlug: z.string().min(1, { message: 'Book identifier is required.' }),
  chapterSlug: z.string().min(1, { message: 'Chapter identifier is required.' }),
  chapterNumber: z.number().int().min(1, { message: 'Chapter number must be at least 1.' }),
  progressPercentage: z
    .number()
    .int()
    .min(0, { message: 'Progress cannot be negative.' })
    .max(100, { message: 'Progress cannot exceed 100%.' }),
  lastReadAnchor: z.string().optional(),
});

export const bookmarkCreateSchema = z.object({
  bookSlug: z.string().min(1),
  chapterSlug: z.string().min(1),
  chapterNumber: z.number().int().min(1),
  anchor: z.string().optional(),
  note: z.string().max(500, { message: 'Bookmark note cannot exceed 500 characters.' }).optional(),
});

export const preferencesUpdateSchema = z.object({
  fontSize: z.number().int().min(14).max(28).optional(),
  lineHeight: z.number().min(1.3).max(2.4).optional(),
  readingTheme: z.enum(['dark', 'light', 'sepia']).optional(),
  fontFamily: z.enum(['serif', 'sans', 'mono']).optional(),
  distractionFree: z.boolean().optional(),
});

// --- Content Management Schemas ---

export const chapterSectionSchema = z.object({
  title: z.string().trim().min(1, 'Section title is required.').max(200),
  content: z.string().trim().min(1, 'Section content cannot be empty.'),
  codeSnippet: z
    .object({
      language: z.string().default('python'),
      code: z.string(),
    })
    .optional(),
  callout: z
    .object({
      type: z.enum(['tip', 'note', 'concept']),
      text: z.string(),
    })
    .optional(),
});

export const bookCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.'),
  subtitle: z.string().trim().max(200).default(''),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.'),
  synopsis: z.string().trim().min(10, 'Synopsis must be at least 10 characters.'),
  authorName: z.string().trim().default('Slayer'),
  category: z.string().trim().min(2, 'Category is required.'),
  tags: z.array(z.string().trim()).default([]),
  edition: z.string().trim().default('First Edition (2026)'),
  publishedYear: z.number().int().min(2000).max(2100).default(2026),
  coverImageUrl: z.string().trim().min(1, 'Cover image URL is required.'),
  isPublished: z.boolean().default(false),
  status: z.string().default('Available Free'),
  isFree: z.boolean().default(true),
  allowPdfDownload: z.boolean().default(false),
  license: z.string().trim().max(200).default('All Rights Reserved'),
  licenseUrl: z.string().trim().url().nullable().optional(),
});

export const bookUpdateSchema = bookCreateSchema.partial();

export const chapterCreateSchema = z.object({
  chapterNumber: z.number().int().min(1, 'Chapter number must be at least 1.'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.'),
  summary: z.string().trim().min(5, 'Summary must be at least 5 characters.'),
  content: z.array(chapterSectionSchema).min(1, 'Chapter must have at least one content section.'),
  estimatedReadingTimeMinutes: z.number().int().min(0).default(10),
  isPublished: z.boolean().default(true),
});

export const chapterUpdateSchema = chapterCreateSchema.partial();

export const chaptersReorderSchema = z.object({
  order: z.array(
    z.object({
      id: z.string(),
      chapterNumber: z.number().int().min(1),
    })
  ).min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
export type BookCreateInput = z.infer<typeof bookCreateSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type ChapterCreateInput = z.infer<typeof chapterCreateSchema>;
export type ChapterUpdateInput = z.infer<typeof chapterUpdateSchema>;
