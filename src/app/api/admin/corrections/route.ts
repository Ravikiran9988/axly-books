import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
export async function GET(request: Request) {
 const auth = await requireAdmin(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Correction review requires the database.' }, { status: 503 });
 const status = new URL(request.url).searchParams.get('status');
 const rows = await db.select({ id: schema.correctionSubmissions.id, quote: schema.correctionSubmissions.quote, suggestion: schema.correctionSubmissions.suggestion, details: schema.correctionSubmissions.details, status: schema.correctionSubmissions.status, adminResponse: schema.correctionSubmissions.adminResponse, createdAt: schema.correctionSubmissions.createdAt, bookTitle: schema.books.title, bookSlug: schema.books.slug, chapterTitle: schema.chapters.title, chapterSlug: schema.chapters.slug, userId: schema.users.id, readerName: schema.users.displayName }).from(schema.correctionSubmissions).innerJoin(schema.books, eq(schema.correctionSubmissions.bookId, schema.books.id)).innerJoin(schema.chapters, eq(schema.correctionSubmissions.chapterId, schema.chapters.id)).innerJoin(schema.users, eq(schema.correctionSubmissions.userId, schema.users.id)).where(status === 'pending' || status === 'accepted' || status === 'rejected' ? eq(schema.correctionSubmissions.status, status) : undefined).orderBy(desc(schema.correctionSubmissions.createdAt)).limit(100);
 return NextResponse.json({ corrections: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
}
export async function PATCH(request: Request) {
 const auth = await requireAdmin(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Correction review requires the database.' }, { status: 503 });
 const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown; response?: unknown } | null;
 if (typeof body?.id !== 'string' || !['accepted', 'rejected', 'pending'].includes(String(body.status))) return NextResponse.json({ error: 'Correction id and valid status are required.' }, { status: 400 });
 const response = typeof body.response === 'string' ? body.response.trim().slice(0, 1000) : null;
 const [row] = await db.update(schema.correctionSubmissions).set({ status: body.status as 'accepted' | 'rejected' | 'pending', adminResponse: response, reviewedAt: body.status === 'pending' ? null : new Date(), reviewedBy: body.status === 'pending' ? null : auth.user.id, updatedAt: new Date() }).where(eq(schema.correctionSubmissions.id, body.id)).returning({ id: schema.correctionSubmissions.id, userId: schema.correctionSubmissions.userId, bookSlug: schema.books.slug });
 if (!row) return NextResponse.json({ error: 'Correction submission not found.' }, { status: 404 });
 if (body.status !== 'pending') await db.insert(schema.readerNotifications).values({ id: 'ntf_' + crypto.randomUUID(), userId: row.userId, type: 'correction_update', title: 'Correction reviewed', message: body.status === 'accepted' ? 'The author accepted your correction suggestion for follow-up.' : 'The author reviewed your correction suggestion.', href: '/books/' + row.bookSlug });
 return NextResponse.json({ success: true, status: body.status });
}
