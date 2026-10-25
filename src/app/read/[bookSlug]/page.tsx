import React, { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { getServerBookBySlug } from '@/services/serverBookService';
import InteractiveReader from './InteractiveReader';

// This reader loads database-backed content at request time. With Cache Components
// enabled, opt out of prerendering this route so runtime data does not block the build.
export const instant = false;

interface ReaderPageProps {
  params: Promise<{ bookSlug: string }>;
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { bookSlug } = await params;

  // Book metadata comes from the database at request time, not during prerendering.
  await connection();
  const book = await getServerBookBySlug(bookSlug);

  if (!book) return { title: 'Book Reader · AXLY' };

  return {
    title: `${book.title} — AXLY Interactive Reader`,
    description: book.description,
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  // The reader is database-backed and must render on request rather than during build.
  await connection();

  const { bookSlug } = await params;
  const book = await getServerBookBySlug(bookSlug);

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
