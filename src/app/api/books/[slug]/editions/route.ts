import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, { params }: Context) {
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ editions: [] });
 const { slug } = await params;
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const editions = await db.select({ id: schema.bookEditions.id, edition: schema.bookEditions.edition, changeSummary: schema.bookEditions.changeSummary, publishedAt: schema.bookEditions.publishedAt }).from(schema.bookEditions).where(eq(schema.bookEditions.bookId, book.id)).orderBy(desc(schema.bookEditions.publishedAt)).limit(30);
 return NextResponse.json({ editions: editions.map((e) => ({ ...e, publishedAt: e.publishedAt.toISOString() })) });
}
