import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { bookCreateSchema } from '@/lib/validations';
import { PUBLISHED_BOOKS } from '@/data/booksData';

export async function GET() {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    if (isDatabaseConfigured() && db) {
      const booksList = await db
        .select()
        .from(schema.books)
        .orderBy(desc(schema.books.createdAt));

      return NextResponse.json({
        success: true,
        books: booksList,
      });
    }

    return NextResponse.json({
      success: true,
      books: PUBLISHED_BOOKS,
    });
  } catch (err: unknown) {
    console.error('Admin fetch books error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading books.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = bookCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid book data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parseResult.data;
    const now = new Date();
    const bookId = `book_${crypto.randomUUID()}`;

    if (isDatabaseConfigured() && db) {
      // Check duplicate slug
      const existing = await db
        .select({ id: schema.books.id })
        .from(schema.books)
        .where(eq(schema.books.slug, data.slug))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: `A book with slug "${data.slug}" already exists. Please choose a unique slug.` },
          { status: 409 }
        );
      }

      await db.insert(schema.books).values({
        id: bookId,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        synopsis: data.synopsis,
        authorName: data.authorName,
        coverImageUrl: data.coverImageUrl,
        category: data.category,
        tags: data.tags,
        edition: data.edition,
        publishedYear: data.publishedYear,
        status: data.isPublished ? 'Available Free' : 'Draft',
        isFree: data.isFree,
        isPublished: data.isPublished,
        totalChapters: 0,
        estimatedReadingTimeMinutes: 0,
        allowPdfDownload: data.allowPdfDownload,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json(
        {
          success: true,
          book: {
            id: bookId,
            ...data,
            totalChapters: 0,
            estimatedReadingTimeMinutes: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    // In-memory fallback
    return NextResponse.json(
      {
        success: true,
        book: {
          id: bookId,
          ...data,
          totalChapters: 0,
          estimatedReadingTimeMinutes: 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Admin create book error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the book.' },
      { status: 500 }
    );
  }
}
