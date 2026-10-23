import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: Request, { params }: Context) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Author questions unavailable.' }, { status: 503 });
 const { slug } = await params; const chapterSlug = new URL(request.url).searchParams.get('chapter');
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const conditions = [eq(schema.authorQuestions.bookId, book.id), eq(schema.authorQuestions.userId, auth.user.id)];
 if (chapterSlug) { const [chapter] = await db.select({ id: schema.chapters.id }).from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1); if (!chapter) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 }); conditions.push(eq(schema.authorQuestions.chapterId, chapter.id)); }
 const questions = await db.select({ id: schema.authorQuestions.id, question: schema.authorQuestions.question, status: schema.authorQuestions.status, answer: schema.authorQuestions.answer, createdAt: schema.authorQuestions.createdAt, answeredAt: schema.authorQuestions.answeredAt, chapterTitle: schema.chapters.title }).from(schema.authorQuestions).innerJoin(schema.chapters, eq(schema.authorQuestions.chapterId, schema.chapters.id)).where(and(...conditions)).orderBy(desc(schema.authorQuestions.createdAt)).limit(50);
 return NextResponse.json({ questions });
}
export async function POST(request: Request, { params }: Context) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Author questions unavailable.' }, { status: 503 });
 const { slug } = await params; const body = await request.json().catch(() => null) as { chapterSlug?: unknown; question?: unknown } | null;
 const chapterSlug = typeof body?.chapterSlug === 'string' ? body.chapterSlug : '', question = typeof body?.question === 'string' ? body.question.trim() : '';
 if (!chapterSlug || question.length < 5 || question.length > 1500) return NextResponse.json({ error: 'Question must be between 5 and 1,500 characters.' }, { status: 400 });
 const [book] = await db.select({ id: schema.books.id, published: schema.books.isPublished }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
 if (!book?.published) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
 const [chapter] = await db.select({ id: schema.chapters.id, published: schema.chapters.isPublished }).from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1);
 if (!chapter?.published) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });
 const [record] = await db.insert(schema.authorQuestions).values({ id: 'ask_' + crypto.randomUUID(), bookId: book.id, chapterId: chapter.id, userId: auth.user.id, question }).returning();
 return NextResponse.json({ question: record }, { status: 201 });
}
