import { NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getBookBySlug } from '@/data/booksData';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser(request);
    const isAdmin = user?.role === 'admin';

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

      // If unpublished and requesting user is NOT an admin, hide book (404)
      if (!book.isPublished && !isAdmin) {
        return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
      }

      // Query chapters: if not admin, only return published chapters
      const chaptersList = await db
        .select()
        .from(schema.chapters)
        .where(
          isAdmin
            ? eq(schema.chapters.bookId, book.id)
            : and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.isPublished, true))
        )
        .orderBy(asc(schema.chapters.chapterNumber));

      return NextResponse.json({
        success: true,
        book: {
          ...book,
          // Never serialize the private Blob pathname into a public-facing response.
          originalPdfPath: undefined,
          coverImage: book.coverImageUrl || '/images/ml-deep-learning-cover.jpg',
          author: book.authorName || 'Slayer',
          publicationStatus: book.status || 'Available Free',
          chapters: chaptersList,
        },
      });
    }

    // Fallback to local verified book record
    const book = getBookBySlug(slug);
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    if (book.isPublished === false && !isAdmin) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      book,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    console.error('Fetch book by slug error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading the publication.' },
      { status: 500 }
    );
  }
}
