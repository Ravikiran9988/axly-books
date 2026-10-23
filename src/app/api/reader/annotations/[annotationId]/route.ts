import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';
type Context = { params: Promise<{ annotationId: string }> };
export async function PATCH(request: Request, { params }: Context) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Annotations unavailable.' }, { status: 503 });
 const { annotationId } = await params; const body = await request.json().catch(() => null) as { note?: unknown } | null;
 const note = typeof body?.note === 'string' ? body.note.trim() : '';
 if (note.length > 2000) return NextResponse.json({ error: 'Note is too long.' }, { status: 400 });
 const [annotation] = await db.update(schema.readerAnnotations).set({ note, updatedAt: new Date() }).where(and(eq(schema.readerAnnotations.id, annotationId), eq(schema.readerAnnotations.userId, auth.user.id))).returning();
 if (!annotation) return NextResponse.json({ error: 'Annotation not found.' }, { status: 404 });
 return NextResponse.json({ annotation });
}
export async function DELETE(request: Request, { params }: Context) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Annotations unavailable.' }, { status: 503 });
 const { annotationId } = await params;
 const rows = await db.delete(schema.readerAnnotations).where(and(eq(schema.readerAnnotations.id, annotationId), eq(schema.readerAnnotations.userId, auth.user.id))).returning({ id: schema.readerAnnotations.id });
 if (!rows.length) return NextResponse.json({ error: 'Annotation not found.' }, { status: 404 });
 return NextResponse.json({ success: true });
}
