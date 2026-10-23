import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';
type Context = { params: Promise<{ slug: string }> };
export async function POST(request: Request, { params }: Context) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Correction submissions unavailable.' }, { status: 503 });
 const { slug } = await params; const body = await request.json().catch(() => null) as { chapterSlug?: unknown; quote?: unknown; suggestion?: unknown; details?: unknown } | null;
 const chapterSlug = typeof body?.chapterSlug === 'string' ? body.chapterSlug : '', quote = typeof body?.quote === 'string' ? body.quote.trim() : '', suggestion = typeof body?.suggestion === 'string' ? body.suggestion.trim() : '', details = typeof body?.details === 'string' ? body.details.trim().slice(0, 1000) : null;
 if (!chapterSlug || !quote || quote.length > 1000 || suggestion.length < 2 || suggestion.length > 2000) return NextResponse.json({ error: 'Provide the passage and a correction under 2,000 characters.' }, { status: 400 });
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const [chapter] = await db.select({ id: schema.chapters.id, published: schema.chapters.isPublished }).from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1);
 if (!chapter?.published) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
 const id = 'cor_' + crypto.randomUUID();
 await db.insert(schema.correctionSubmissions).values({ id, bookId: book.id, chapterId: chapter.id, userId: auth.user.id, quote, suggestion, details });
 return NextResponse.json({ success: true, id, message: 'Your correction was sent to the author for review.' }, { status: 201 });
}
