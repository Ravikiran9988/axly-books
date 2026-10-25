import React from 'react';
import { connection } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import BooksManager from './BooksManager';

export const instant = false;

export const metadata = {
  title: 'Manage Books — AXLY Admin',
  description: 'Create, edit, publish, and delete digital books on AXLY Books.',
};

export default async function AdminBooksPage() {
  await connection();
  let booksList: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    synopsis: string;
    category: string;
    tags: string[];
    edition: string;
    publishedYear: number;
    coverImageUrl: string;
    isPublished: boolean;
    totalChapters: number;
  }> = [];

  if (isDatabaseConfigured() && db) {
    const rawBooks = await db
      .select()
      .from(schema.books)
      .orderBy(desc(schema.books.createdAt));

    booksList = rawBooks.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      synopsis: b.synopsis,
      category: b.category,
      tags: b.tags,
      edition: b.edition,
      publishedYear: b.publishedYear,
      coverImageUrl: b.coverImageUrl,
      isPublished: b.isPublished,
      totalChapters: b.totalChapters,
    }));
  } else {
    booksList = PUBLISHED_BOOKS.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      synopsis: b.synopsis,
      category: b.category,
      tags: b.tags,
      edition: b.edition,
      publishedYear: b.publishedYear,
      coverImageUrl: b.coverImage,
      isPublished: b.isPublished ?? true,
      totalChapters: b.totalChapters,
    }));
  }

  return <BooksManager initialBooks={booksList} />;
}
