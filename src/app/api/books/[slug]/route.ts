import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getBookBySlug } from '@/data/booksData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (isDatabaseConfigured() && db) {
      const bookRecords = await db
        .select()
        .from(schema.books)
        .where(eq(schema.books.slug, slug))
        .limit(1);

      if (bookRecords.length === 0) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      const book = bookRecords[0];
      const chaptersList = await db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.bookId, book.id))
        .orderBy(asc(schema.chapters.chapterNumber));

      return NextResponse.json({
        success: true,
        book: {
          ...book,
          chapters: chaptersList,
        },
      });
    }

    // Fallback to verified local book record
    const book = getBookBySlug(slug);
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      book,
    });
  } catch (err: any) {
    console.error('Fetch book by slug error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading the publication.' },
      { status: 500 }
    );
  }
}
