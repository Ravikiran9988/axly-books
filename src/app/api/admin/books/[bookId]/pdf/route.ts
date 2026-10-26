import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';

const MAX_PDF_SIZE = 4 * 1024 * 1024;
export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Persistent database service is not configured.' }, { status: 503 });
  const token = process.env.PDF_BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ error: 'Private PDF storage is not configured. Set PDF_BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
  let uploadedPath: string | null = null;
  try {
    const { bookId } = await params;
    const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    const form = await request.formData();
    const value = form.get('file');
    if (!value || typeof value === 'string') return NextResponse.json({ error: 'Choose a PDF file to attach.' }, { status: 400 });
    const file = value as File;
    if (!file.size) return NextResponse.json({ error: 'The selected PDF is empty.' }, { status: 400 });
    if (file.size > MAX_PDF_SIZE) return NextResponse.json({ error: 'PDFs must be 4 MB or smaller.' }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 8 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'The file does not have a valid PDF signature.' }, { status: 400 });
    const blob = await put('original-pdfs/' + crypto.randomUUID() + '.pdf', bytes, { access: 'private', token, contentType: 'application/pdf', addRandomSuffix: false, cacheControlMaxAge: 0 });
    if (!blob?.pathname) throw new Error('Private Blob storage did not return a file path.');
    uploadedPath = blob.pathname;
    await db.update(schema.books).set({ originalPdfPath: uploadedPath, originalPdfUrl: null, allowPdfDownload: true, updatedAt: new Date() }).where(eq(schema.books.id, book.id));
    const previousPath = book.originalPdfPath;
    if (previousPath && previousPath !== uploadedPath && previousPath.startsWith('original-pdfs/')) {
      try { await del(previousPath, { token }); } catch (e) { console.error('Previous private PDF cleanup failed:', e); }
    }
    return NextResponse.json({ success: true, originalPdfPath: uploadedPath, allowPdfDownload: true });
  } catch (error) {
    if (uploadedPath) { try { await del(uploadedPath, { token }); } catch (e) { console.error('Private PDF cleanup failed:', e); } }
    console.error('Private PDF attachment failed:', error);
    return NextResponse.json({ error: 'The private PDF could not be attached. Check storage configuration and try again.' }, { status: 500 });
  }
}