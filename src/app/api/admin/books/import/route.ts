import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

const MAX_PDF_SIZE = 4 * 1024 * 1024;

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}
function field(form: FormData, key: string, fallback = ''): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'PDF import needs the persistent Neon database. Configure DATABASE_URL and run the database migrations first.' }, { status: 503 });
  }
  const storageToken = process.env.PDF_BLOB_READ_WRITE_TOKEN;
  if (!storageToken) {
    return NextResponse.json({ error: 'Private PDF storage is not configured. Create a Private Vercel Blob store and set PDF_BLOB_READ_WRITE_TOKEN in this deployment.' }, { status: 503 });
  }

  let uploadedPath: string | null = null;
  let createdBookId: string | null = null;
  try {
    const form = await request.formData();
    const fileValue = form.get('file');
    if (!fileValue || typeof fileValue === 'string') return NextResponse.json({ error: 'Choose a PDF file to import.' }, { status: 400 });
    const file = fileValue as File;
    if (!file.size) return NextResponse.json({ error: 'The selected PDF is empty.' }, { status: 400 });
    if (file.size > MAX_PDF_SIZE) return NextResponse.json({ error: 'PDFs must be 4 MB or smaller for this server-side import. Compress the PDF or split it into smaller files.' }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 8 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'The file does not have a valid PDF signature.' }, { status: 400 });

    const title = field(form, 'title') || file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    const slug = slugify(field(form, 'slug') || title);
    const subtitle = field(form, 'subtitle');
    const category = field(form, 'category', 'General') || 'General';
    const description = field(form, 'description') || 'A free book provided as a downloadable original PDF.';
    const synopsis = field(form, 'synopsis') || description;
    const edition = field(form, 'edition', 'First Edition (2026)') || 'First Edition (2026)';
    const requestedYear = Number(field(form, 'publishedYear', String(new Date().getFullYear())));
    const publishedYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : new Date().getFullYear();
    const tags = field(form, 'tags').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
    // This route is explicitly the PDF-download-only import option; downloads must be enabled.
    const allowPdfDownload = true;
    const license = field(form, 'license') === 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)'
      ? 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)'
      : 'All Rights Reserved';
    const licenseUrl = license.includes('CC BY-NC 4.0')
      ? 'https://creativecommons.org/licenses/by-nc/4.0/'
      : null;

    if (title.length < 2 || title.length > 150) return NextResponse.json({ error: 'Book title must be between 2 and 150 characters.' }, { status: 400 });
    if (!slug || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: 'Provide a valid URL slug using lowercase letters, numbers and hyphens.' }, { status: 400 });
    if (description.length < 10 || description.length > 2000 || synopsis.length < 10 || synopsis.length > 10000) return NextResponse.json({ error: 'Description must be 10–2,000 characters and synopsis must be 10–10,000 characters.' }, { status: 400 });
    if (category.length < 2 || category.length > 100) return NextResponse.json({ error: 'Category must be between 2 and 100 characters.' }, { status: 400 });

    const duplicate = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (duplicate.length) return NextResponse.json({ error: 'A book with that slug already exists. Choose a different URL slug.' }, { status: 409 });

    const now = new Date();
    createdBookId = 'book_' + crypto.randomUUID();
    const intendedPath = 'original-pdfs/' + crypto.randomUUID() + '.pdf';
    const blob = await put(intendedPath, bytes, {
      access: 'private', token: storageToken, contentType: 'application/pdf', addRandomSuffix: false, cacheControlMaxAge: 0,
    });
    if (!blob?.pathname) throw new Error('Private Blob storage did not return a file path.');
    uploadedPath = blob.pathname;

    await db.insert(schema.books).values({
      id: createdBookId, slug, title, subtitle, description, synopsis, authorName: 'Slayer',
      coverImageUrl: '/images/ml-deep-learning-cover.jpg', category, tags, edition, publishedYear,
      status: 'Draft', isFree: true, isPublished: false, totalChapters: 0,
      estimatedReadingTimeMinutes: 0,
      allowPdfDownload, license, licenseUrl, originalPdfPath: uploadedPath, createdAt: now, updatedAt: now,
    });




    return NextResponse.json({
      success: true,
      book: { id: createdBookId, slug, title, allowPdfDownload, isPublished: false },
      pageCount: 0, importedTextCharacters: 0,
      chapters: [],
      message: 'PDF saved as a downloadable draft. No online-reading chapters were created. Publish the book when ready.',
    }, { status: 201 });
  } catch (error: unknown) {
    if (createdBookId) {
      try { await db.delete(schema.books).where(eq(schema.books.id, createdBookId)); }
      catch (cleanupError) { console.error('PDF import database cleanup failed:', cleanupError); }
    }
    if (uploadedPath) {
      try { await del(uploadedPath, { token: storageToken }); }
      catch (cleanupError) { console.error('PDF import Blob cleanup failed:', cleanupError); }
    }
    const message = error instanceof Error ? error.message : 'Unexpected PDF import failure.';
    console.error('PDF import error:', error);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
