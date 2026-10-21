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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>;
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
