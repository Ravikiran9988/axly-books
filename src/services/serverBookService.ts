import { and, asc, eq } from 'drizzle-orm';
import { db, isDatabaseConfigured, schema } from '@/db';
import { getBookBySlug as getStaticBookBySlug } from '@/data/booksData';
import { getCurrentUser } from '@/lib/auth';
import type { Book, Chapter } from '@/types/book';

/**
 * Server-only book lookup for App Router pages. The client-side bookService uses
 * the HTTP API, but server-rendered pages must query Neon directly for books
 * that were created dynamically by the admin PDF importer.
 */
export async function getServerBookBySlug(slug: string): Promise<Book | null> {
  if (!isDatabaseConfigured() || !db) {
    return getStaticBookBySlug(slug) ?? null;
  }

  const staticPublication = getStaticBookBySlug(slug);
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [record] = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.slug, slug))
    .limit(1);

  if (!record || (!record.isPublished && !isAdmin)) return null;

  const conditions = [eq(schema.chapters.bookId, record.id)];
  if (!isAdmin) conditions.push(eq(schema.chapters.isPublished, true));
  const rawChapters = await db
    .select()
    .from(schema.chapters)
    .where(and(...conditions))
    .orderBy(asc(schema.chapters.chapterNumber));

  const chapters: Chapter[] = rawChapters.map((chapter) => ({
    id: chapter.id,
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    slug: chapter.slug,
    readingTimeMinutes: chapter.estimatedReadingTimeMinutes,
    summary: chapter.summary,
    isPublished: chapter.isPublished,
    sections: Array.isArray(chapter.content) ? chapter.content : [],
  }));

  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    subtitle: record.subtitle,
    author: record.authorName || 'Slayer',
    authorRealName: 'Medicharla Ravi Kiran',
    authorSlug: 'slayer',
    coverImage: record.coverImageUrl || '/images/ml-deep-learning-cover.jpg',
    description: record.description,
    synopsis: record.synopsis,
    category: record.category,
    tags: Array.isArray(record.tags) ? record.tags : [],
    edition: record.edition,
    publishedYear: record.publishedYear,
    publicationStatus: 'Available Free',
    totalChapters: chapters.length,
    estimatedReadingTimeMinutes: chapters.reduce((sum, chapter) => sum + chapter.readingTimeMinutes, 0),
    isFree: record.isFree,
    isPublished: record.isPublished,
    allowPdfDownload: record.allowPdfDownload,
    copyrightNotice: staticPublication?.copyrightNotice ?? `© ${record.publishedYear} Medicharla Ravi Kiran`,
    license: staticPublication?.license ?? record.license ?? 'All Rights Reserved',
    licenseUrl: staticPublication?.licenseUrl ?? record.licenseUrl ?? undefined,
    chapters,
  };
}
