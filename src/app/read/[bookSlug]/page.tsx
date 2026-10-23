import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getServerBookBySlug } from '@/services/serverBookService';
import { PUBLISHED_BOOKS } from '@/data/booksData';
import InteractiveReader from './InteractiveReader';

export function generateStaticParams() {
  return PUBLISHED_BOOKS.map((b) => ({
    bookSlug: b.slug,
  }));
}

interface ReaderPageProps {
  params: Promise<{ bookSlug: string }>;
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { bookSlug } = await params;
  const book = await getServerBookBySlug(bookSlug);
  if (!book) return { title: 'Book Reader · AXLY' };

  return {
    title: `${book.title} — AXLY Interactive Reader`,
    description: book.description,
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookSlug } = await params;
  const book = await bookService.getBookBySlug(bookSlug);

  if (!book) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Preparing reading canvas...
        </div>
      }
    >
      <InteractiveReader book={book} />
    </Suspense>
  );
}
