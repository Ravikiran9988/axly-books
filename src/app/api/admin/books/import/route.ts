import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { bookCreateSchema, chapterCreateSchema } from '@/lib/validations';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_CHAPTERS = 100;

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'A configured persistent database is required to import a book.' }, { status: 503 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return NextResponse.json({ error: 'PDF storage is not configured. Set BLOB_READ_WRITE_TOKEN before importing books.' }, { status: 503 });
  }

  let createdBookId: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const rawBook = form.get('book');
    const rawChapters = form.get('chapters');

    if (!(file instanceof File) || typeof rawBook !== 'string' || typeof rawChapters !== 'string') {
      return NextResponse.json({ error: 'Upload a PDF and provide book metadata and extracted chapters.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF must be between 1 byte and 25 MB.' }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return NextResponse.json({ error: 'The selected file does not have a valid PDF signature.' }, { status: 400 });
    }

    let bookInput: unknown;
    let chapterInput: unknown;
    try {
      bookInput = JSON.parse(rawBook);
      chapterInput = JSON.parse(rawChapters);
    } catch {
      return NextResponse.json({ error: 'Book metadata or chapter data is not valid JSON.' }, { status: 400 });
    }

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
    const data = parsedBook.data;

    const existing = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, data.slug)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: `A book with slug "${data.slug}" already exists.` }, { status: 409 });
    }

    const safeName = file.name.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'book';
    const blob = await put(`books/originals/${safeName}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}.pdf`, bytes, {
      access: 'public',
      token: blobToken,
      contentType: 'application/pdf',
      addRandomSuffix: false,
    });

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
      originalPdfUrl: blob.url,
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
      originalPdfUrl: blob.url,
      chaptersImported: chapters.length,
      message: `Imported "${data.title}" with ${chapters.length} chapters. Review the chapters before publishing.`,
    }, { status: 201 });
  } catch (error) {
    if (createdBookId && db) {
      try {
        await db.delete(schema.books).where(eq(schema.books.id, createdBookId));
      } catch (cleanupError) {
        console.error('PDF import cleanup failed:', cleanupError);
      }
    }
    console.error('PDF book import failed:', error);
    return NextResponse.json({ error: 'The PDF could not be imported. Check storage/database configuration and try again.' }, { status: 500 });
  }
}
