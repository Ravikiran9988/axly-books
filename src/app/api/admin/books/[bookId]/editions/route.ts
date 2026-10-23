import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
type Context = { params: Promise<{ bookId: string }> };
export async function GET(_request: Request, { params }: Context) {
 const auth = await requireAdmin(_request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Edition history requires the database.' }, { status: 503 });
 const { bookId } = await params;
 const editions = await db.select().from(schema.bookEditions).where(eq(schema.bookEditions.bookId, bookId)).orderBy(desc(schema.bookEditions.publishedAt));
 return NextResponse.json({ editions });
}
export async function POST(request: Request, { params }: Context) {
 const auth = await requireAdmin(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Edition history requires the database.' }, { status: 503 });
 const { bookId } = await params; const body = await request.json().catch(() => null) as { edition?: unknown; changeSummary?: unknown } | null;
 const edition = typeof body?.edition === 'string' ? body.edition.trim().slice(0, 80) : '', changeSummary = typeof body?.changeSummary === 'string' ? body.changeSummary.trim().slice(0, 2000) : '';
 if (!edition || changeSummary.length < 3) return NextResponse.json({ error: 'Edition label and a change summary are required.' }, { status: 400 });
 const [book] = await db.select({ id: schema.books.id, slug: schema.books.slug, title: schema.books.title }).from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
 if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const [record] = await db.insert(schema.bookEditions).values({ id: 'edn_' + crypto.randomUUID(), bookId, edition, changeSummary, createdBy: auth.user.id }).onConflictDoNothing().returning();
 if (!record) return NextResponse.json({ error: 'That edition label already exists for this book.' }, { status: 409 });
 const readers = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, 'reader')).limit(5000);
 if (readers.length) await db.insert(schema.readerNotifications).values(readers.map((reader) => ({ id: 'ntf_' + crypto.randomUUID(), userId: reader.id, type: 'edition_update', title: 'A book has been updated', message: book.title + ' — ' + edition + ': ' + changeSummary, href: '/books/' + book.slug })));
 return NextResponse.json({ edition: record, notifiedReaders: readers.length }, { status: 201 });
}
