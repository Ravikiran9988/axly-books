import { asc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getBookBySlug as getStaticBookBySlug } from '@/data/booksData';
import type { Book } from '@/types/book';

/**
 * Server-side book lookup so books created through the admin CMS (including PDF imports)
 * can be rendered by the server-rendered detail and reader routes.
 */
export async function getServerBookBySlug(slug: string): Promise<Book | null> {
  if (isDatabaseConfigured() && db) {
    const records = await db.select().from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    const record = records[0];
    if (record) {
      if (!record.isPublished) return null;
      const chapterRows = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, record.id))
        .orderBy(asc(schema.chapters.chapterNumber));
      const visibleChapters = chapterRows.filter((chapter) => chapter.isPublished);
      let authorRealName = 'Medicharla Ravi Kiran';
      let authorSlug = 'slayer';
      if (record.authorId) {
        const authorRows = await db.select().from(schema.authors).where(eq(schema.authors.id, record.authorId)).limit(1);
        if (authorRows[0]) {
          authorRealName = authorRows[0].fullName;
          authorSlug = authorRows[0].penName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
      }
      return {
        id: record.id,
        slug: record.slug,
        title: record.title,
        subtitle: record.subtitle,
        author: record.authorName || 'Slayer',
        authorRealName,
        authorSlug,
        coverImage: record.coverImageUrl || '/images/ml-deep-learning-cover.jpg',
        description: record.description,
        synopsis: record.synopsis,
        category: record.category,
        tags: record.tags || [],
        edition: record.edition,
        publishedYear: record.publishedYear,
        publicationStatus: record.status === 'Draft' ? 'Upcoming' : 'Available Free',
        totalChapters: visibleChapters.length,
        estimatedReadingTimeMinutes: visibleChapters.reduce((sum, chapter) => sum + chapter.estimatedReadingTimeMinutes, 0),
        isFree: record.isFree,
        isPublished: record.isPublished,
        allowPdfDownload: record.allowPdfDownload,
        originalPdfUrl: record.originalPdfUrl,
        copyrightNotice: `© ${record.publishedYear} ${record.authorName || 'Slayer'}`,
        license: 'CC BY-NC 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
        chapters: visibleChapters.map((chapter) => ({
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          slug: chapter.slug,
          readingTimeMinutes: chapter.estimatedReadingTimeMinutes,
          summary: chapter.summary,
          isPublished: chapter.isPublished,
          sections: chapter.content,
        })),
      };
    }
  }
  return getStaticBookBySlug(slug) || null;
}
