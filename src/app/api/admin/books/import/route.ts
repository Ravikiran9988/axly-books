import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { bookCreateSchema, chapterCreateSchema } from '@/lib/validations';

const MAX_CHAPTERS = 100;

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'A configured persistent database is required to import a book.' }, { status: 503 });
  }

  let createdBookId: string | null = null;
  let uploadedBlobUrl: string | null = null;
  try {
    const body = await request.json().catch(() => null) as {
      book?: unknown;
      chapters?: unknown;
      originalPdfUrl?: unknown;
    } | null;
    if (!body || typeof body !== 'object' || !body.book || !Array.isArray(body.chapters) || typeof body.originalPdfUrl !== 'string') {
      return NextResponse.json({ error: 'Provide book metadata, extracted chapters, and the uploaded PDF URL.' }, { status: 400 });
    }

    let originalPdfUrl: URL;
    try {
      originalPdfUrl = new URL(body.originalPdfUrl);
    } catch {
      return NextResponse.json({ error: 'The uploaded PDF URL is invalid.' }, { status: 400 });
    }
    if (
      originalPdfUrl.protocol !== 'https:' ||
      !(originalPdfUrl.hostname.endsWith('.public.blob.vercel-storage.com') || originalPdfUrl.hostname.endsWith('.blob.vercel-storage.com')) ||
      !originalPdfUrl.pathname.toLowerCase().endsWith('.pdf')
    ) {
      return NextResponse.json({ error: 'The PDF must be uploaded to the configured Vercel Blob public store.' }, { status: 400 });
    }

    const bookInput = body.book;
    const chapterInput = body.chapters;

    const parsedBook = bookCreateSchema.safeParse(bookInput);
    if (!parsedBook.success) {
      return NextResponse.json({ error: parsedBook.error.issues[0]?.message || 'Book metadata is invalid.' }, { status: 400 });
    }
    if (!Array.isArray(chapterInput) || chapterInput.length < 1 || chapterInput.length > MAX_CHAPTERS) {
      return NextResponse.json({ error: 'Import must contain between 1 and 100 chapters.' }, { status: 400 });
    }

    const parsedChapters = chapterInput.map((chapter) => chapterCreateSchema.safeParse(chapter));
    const invalidChapter = parsedChapters.findIndex((result) => !result.success);
    if (invalidChapter !== -1) {
      const result = parsedChapters[invalidChapter];
      return NextResponse.json({
        error: `Chapter ${invalidChapter + 1}: ${result.success ? '' : result.error.issues[0]?.message || 'Invalid chapter data.'}`,
      }, { status: 400 });
    }
    const chapters = parsedChapters.map((result) => (result.success ? result.data : null)).filter((value) => value !== null);
    const chapterNumbers = chapters.map((chapter) => chapter.chapterNumber);
    const chapterSlugs = chapters.map((chapter) => chapter.slug);
    if (new Set(chapterNumbers).size !== chapterNumbers.length) {
      return NextResponse.json({ error: 'Chapter numbers must be unique.' }, { status: 400 });
    }
    if (new Set(chapterSlugs).size !== chapterSlugs.length) {
      return NextResponse.json({ error: 'Chapter slugs must be unique.' }, { status: 400 });
    }
    const totalCharacters = chapters.reduce((sum, chapter) => sum + chapter.content.reduce((sectionSum, section) => sectionSum + section.content.length, 0), 0);
    if (totalCharacters > 1_000_000) {
      return NextResponse.json({ error: 'The import is limited to 1,000,000 characters. Split the book into smaller imports.' }, { status: 413 });
    }
    const data = parsedBook.data;
    if (data.isPublished && !chapters.some((chapter) => chapter.isPublished)) {
      return NextResponse.json(
        { error: 'The imported book must include at least one published chapter before it can be published.' },
        { status: 400 }
      );
    }

    const existing = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, data.slug)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: `A book with slug "${data.slug}" already exists.` }, { status: 409 });
    }

    uploadedBlobUrl = originalPdfUrl.toString();

    const now = new Date();
    createdBookId = `book_${crypto.randomUUID()}`;
    const totalReadingMinutes = chapters.reduce((sum, chapter) => sum + chapter.estimatedReadingTimeMinutes, 0);

    await db.insert(schema.books).values({
      id: createdBookId,
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
      totalChapters: chapters.length,
      estimatedReadingTimeMinutes: totalReadingMinutes,
      allowPdfDownload: data.allowPdfDownload,
      originalPdfUrl: uploadedBlobUrl,
      createdAt: now,
      updatedAt: now,
    });

    for (const chapter of chapters) {
      await db.insert(schema.chapters).values({
        id: `ch_${crypto.randomUUID()}`,
        bookId: createdBookId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        slug: chapter.slug,
        summary: chapter.summary,
        content: chapter.content,
        estimatedReadingTimeMinutes: chapter.estimatedReadingTimeMinutes,
        isPublished: chapter.isPublished && data.isPublished,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      bookId: createdBookId,
      slug: data.slug,
      originalPdfUrl: uploadedBlobUrl,
      chaptersImported: chapters.length,
      message: `Imported "${data.title}" with ${chapters.length} chapters. Review the chapters before publishing.`,
    }, { status: 201 });
  } catch (error) {
    if (createdBookId && db) {
      try {
        await db.delete(schema.books).where(eq(schema.books.id, createdBookId));
      } catch (cleanupError) {
        console.error('PDF import database cleanup failed:', cleanupError);
      }
    }
    if (uploadedBlobUrl) {
      try {
        await del(uploadedBlobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (cleanupError) {
        console.error('PDF import blob cleanup failed:', cleanupError);
      }
    }
    console.error('PDF book import failed:', error);
    return NextResponse.json({ error: 'The PDF could not be imported. Check storage/database configuration and try again.' }, { status: 500 });
  }
}
