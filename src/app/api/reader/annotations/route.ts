import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Annotations unavailable.' }, { status: 503 });
 const url = new URL(request.url), bookSlug = url.searchParams.get('book'), chapterSlug = url.searchParams.get('chapter');
 if (!bookSlug || !chapterSlug) return NextResponse.json({ error: 'Book and chapter are required.' }, { status: 400 });
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, bookSlug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const [chapter] = await db.select({ id: schema.chapters.id, published: schema.chapters.isPublished }).from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1);
 if (!chapter?.published) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
 const annotations = await db.select().from(schema.readerAnnotations).where(and(eq(schema.readerAnnotations.userId, auth.user.id), eq(schema.readerAnnotations.bookId, book.id), eq(schema.readerAnnotations.chapterId, chapter.id))).orderBy(asc(schema.readerAnnotations.createdAt));
 return NextResponse.json({ annotations });
}
export async function POST(request: Request) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Annotations unavailable.' }, { status: 503 });
 const body = await request.json().catch(() => null) as { bookSlug?: unknown; chapterSlug?: unknown; quote?: unknown; note?: unknown; anchor?: unknown } | null;
 const bookSlug = typeof body?.bookSlug === 'string' ? body.bookSlug : '', chapterSlug = typeof body?.chapterSlug === 'string' ? body.chapterSlug : '';
 const quote = typeof body?.quote === 'string' ? body.quote.trim() : '', note = typeof body?.note === 'string' ? body.note.trim() : '', anchor = typeof body?.anchor === 'string' ? body.anchor.slice(0, 200) : null;
 if (!bookSlug || !chapterSlug || quote.length < 1 || quote.length > 1000 || note.length > 2000) return NextResponse.json({ error: 'Passage or note is invalid.' }, { status: 400 });
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, bookSlug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const [chapter] = await db.select({ id: schema.chapters.id, published: schema.chapters.isPublished }).from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1);
 if (!chapter?.published) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
 const [annotation] = await db.insert(schema.readerAnnotations).values({ id: 'ann_' + crypto.randomUUID(), userId: auth.user.id, bookId: book.id, chapterId: chapter.id, quote, note, anchor }).returning();
 return NextResponse.json({ annotation }, { status: 201 });
}
