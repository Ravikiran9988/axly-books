import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
export async function GET(request: Request) {
 const auth = await requireAdmin(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Author Q&A requires the database.' }, { status: 503 });
 const status = new URL(request.url).searchParams.get('status');
 const questions = await db.select({ id: schema.authorQuestions.id, question: schema.authorQuestions.question, status: schema.authorQuestions.status, answer: schema.authorQuestions.answer, createdAt: schema.authorQuestions.createdAt, answeredAt: schema.authorQuestions.answeredAt, userId: schema.users.id, readerName: schema.users.displayName, bookTitle: schema.books.title, bookSlug: schema.books.slug, chapterTitle: schema.chapters.title, chapterSlug: schema.chapters.slug }).from(schema.authorQuestions).innerJoin(schema.users, eq(schema.authorQuestions.userId, schema.users.id)).innerJoin(schema.books, eq(schema.authorQuestions.bookId, schema.books.id)).innerJoin(schema.chapters, eq(schema.authorQuestions.chapterId, schema.chapters.id)).where(status === 'open' || status === 'answered' ? eq(schema.authorQuestions.status, status) : undefined).orderBy(desc(schema.authorQuestions.createdAt)).limit(100);
 return NextResponse.json({ questions });
}
export async function PATCH(request: Request) {
 const auth = await requireAdmin(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Author Q&A requires the database.' }, { status: 503 });
 const body = await request.json().catch(() => null) as { id?: unknown; answer?: unknown } | null;
 const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
 if (typeof body?.id !== 'string' || answer.length < 2 || answer.length > 2000) return NextResponse.json({ error: 'Question id and answer (2–2,000 characters) are required.' }, { status: 400 });
 const [existing] = await db.select({ id: schema.authorQuestions.id, userId: schema.authorQuestions.userId, bookId: schema.authorQuestions.bookId }).from(schema.authorQuestions).where(eq(schema.authorQuestions.id, body.id)).limit(1);
 if (!existing) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
 await db.update(schema.authorQuestions).set({ answer, status: 'answered', answeredAt: new Date(), answeredBy: auth.user.id, updatedAt: new Date() }).where(eq(schema.authorQuestions.id, body.id));
 const [book] = await db.select({ slug: schema.books.slug, title: schema.books.title }).from(schema.books).where(eq(schema.books.id, existing.bookId)).limit(1);
 await db.insert(schema.readerNotifications).values({ id: 'ntf_' + crypto.randomUUID(), userId: existing.userId, type: 'author_reply', title: 'Slayer replied to your question', message: answer, href: book ? '/books/' + book.slug : '/dashboard' });
 return NextResponse.json({ success: true });
}
