import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';

interface SearchResult {
  type: 'book' | 'chapter';
  title: string;
  sub: string;
  url: string;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase().slice(0, 120) || '';
  const results: SearchResult[] = [];

  if (isDatabaseConfigured() && db) {
    const publishedBooks = await db.select().from(schema.books)
      .where(eq(schema.books.isPublished, true))
      .orderBy(desc(schema.books.createdAt))
      .limit(500);

    for (const book of publishedBooks) {
      const matches = !query || [
        book.title, book.subtitle, book.description, book.synopsis, book.category,
        ...(Array.isArray(book.tags) ? book.tags : []),
      ].some((value) => value?.toLowerCase().includes(query));
      if (matches) {
        results.push({
          type: 'book',
          title: book.title,
          sub: 'Book · ' + book.category,
          url: '/books/' + book.slug,
        });
      }
    }

    if (query) {
      const chapterRows = await db.select({
        bookSlug: schema.books.slug,
        bookTitle: schema.books.title,
        chapterTitle: schema.chapters.title,
        chapterSlug: schema.chapters.slug,
        chapterNumber: schema.chapters.chapterNumber,
        summary: schema.chapters.summary,
        estimatedReadingTimeMinutes: schema.chapters.estimatedReadingTimeMinutes,
      })
        .from(schema.chapters)
        .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
        .where(and(
          eq(schema.books.isPublished, true),
          eq(schema.chapters.isPublished, true),
          or(
            ilike(schema.chapters.title, `%${query}%`),
            ilike(schema.chapters.summary, `%${query}%`),
            sql`strpos(lower(${schema.chapters.content}::text), ${query}) > 0`
          )
        ))
        .orderBy(desc(schema.chapters.createdAt))
        .limit(30);

      for (const chapter of chapterRows) {
        results.push({
            type: 'chapter',
            title: 'Ch ' + chapter.chapterNumber + ': ' + chapter.chapterTitle,
            sub: chapter.bookTitle + ' · ' + chapter.estimatedReadingTimeMinutes + ' min read',
            url: '/read/' + chapter.bookSlug + '?chapter=' + chapter.chapterSlug,
          });
      }
    }
  } else {
    for (const book of PUBLISHED_BOOKS.filter((candidate) => candidate.isPublished !== false)) {
      const matches = !query || [
        book.title, book.subtitle, book.description, book.category, ...book.tags,
      ].some((value) => value?.toLowerCase().includes(query));
      if (matches) {
        results.push({ type: 'book', title: book.title, sub: 'Book · ' + book.category, url: '/books/' + book.slug });
      }
      if (query) {
        for (const chapter of book.chapters) {
          if ([chapter.title, chapter.summary, ...chapter.sections.map((section) => section.title)]
            .some((value) => value.toLowerCase().includes(query))) {
            results.push({
              type: 'chapter',
              title: 'Ch ' + chapter.chapterNumber + ': ' + chapter.title,
              sub: book.title + ' · ' + chapter.readingTimeMinutes + ' min read',
              url: '/read/' + book.slug + '?chapter=' + chapter.slug,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 8) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
