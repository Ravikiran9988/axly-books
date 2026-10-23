import { get } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Book storage is unavailable.' }, { status: 503 });
    const { slug } = await params;
    const user = await getCurrentUser(request);
    const isAdmin = user?.role === 'admin';
    const [book] = await db.select().from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book || (!book.isPublished && !isAdmin)) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    if (!isAdmin && !book.allowPdfDownload) return NextResponse.json({ error: 'PDF download is not enabled for this book.' }, { status: 404 });
    if (!book.originalPdfPath) return NextResponse.json({ error: 'An original PDF is not attached to this book.' }, { status: 404 });

    const token = process.env.PDF_BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({ error: 'Private PDF storage is not configured.' }, { status: 503 });
    const blob = await get(book.originalPdfPath, { access: 'private', token });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: 'The original PDF could not be found in private storage.' }, { status: 404 });

    const filename = (book.slug || 'axly-book').replace(/[^a-z0-9-]/gi, '-') + '.pdf';
    return new Response(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Original PDF delivery failed:', error);
    return NextResponse.json({ error: 'The original PDF could not be delivered.' }, { status: 500 });
  }
}
