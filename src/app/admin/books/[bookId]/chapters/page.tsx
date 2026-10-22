import React from 'react';
import { notFound } from 'next/navigation';
import { eq, or, asc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getBookBySlug, PUBLISHED_BOOKS } from '@/data/booksData';
import ChaptersManager from './ChaptersManager';

export const instant = false;

export const metadata = {
  title: 'Manage Chapters — AXLY Admin',
  description: 'Manage book chapters, sections, and technical listings on AXLY Books.',
};

export default async function AdminChaptersPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  let bookDetails: {
    id: string;
    slug: string;
    title: string;
    totalChapters: number;
  } | null = null;

  let chaptersList: Array<{
    id: string;
    bookId: string;
    chapterNumber: number;
    title: string;
    slug: string;
    summary: string;
    content: Array<{
      title: string;
      content: string;
      codeSnippet?: { language: string; code: string };
      callout?: { type: 'tip' | 'note' | 'concept'; text: string };
    }>;
    estimatedReadingTimeMinutes: number;
    isPublished: boolean;
  }> = [];

  if (isDatabaseConfigured() && db) {
    const bookRecords = await db
      .select()
      .from(schema.books)
      .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
      .limit(1);

    if (bookRecords.length === 0) {
      notFound();
    }

    const b = bookRecords[0];
    bookDetails = {
      id: b.id,
      slug: b.slug,
      title: b.title,
      totalChapters: b.totalChapters,
    };

    const rawChapters = await db
      .select()
      .from(schema.chapters)
      .where(eq(schema.chapters.bookId, b.id))
      .orderBy(asc(schema.chapters.chapterNumber));

    chaptersList = rawChapters.map((c) => ({
      id: c.id,
      bookId: c.bookId,
      chapterNumber: c.chapterNumber,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      content: c.content || [],
      estimatedReadingTimeMinutes: c.estimatedReadingTimeMinutes,
      isPublished: c.isPublished,
    }));
  } else {
    // Development fallback
    const found =
      PUBLISHED_BOOKS.find((b) => b.id === bookId || b.slug === bookId) ||
      getBookBySlug(bookId);

    if (!found) {
      notFound();
    }

    bookDetails = {
      id: found.id,
      slug: found.slug,
      title: found.title,
      totalChapters: found.totalChapters,
    };

    chaptersList = found.chapters.map((c) => ({
      id: c.id,
      bookId: found.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
      slug: c.slug,
      summary: c.summary,
      content: c.sections,
      estimatedReadingTimeMinutes: c.readingTimeMinutes,
      isPublished: c.isPublished ?? true,
    }));
  }

  return <ChaptersManager book={bookDetails} initialChapters={chaptersList} />;
}
