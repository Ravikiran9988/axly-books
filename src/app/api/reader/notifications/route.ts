import { NextResponse } from 'next/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAuth } from '@/lib/auth';
export async function GET(request: Request) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Notifications unavailable.' }, { status: 503 });
 const unreadOnly = new URL(request.url).searchParams.get('unread') === '1';
 const conditions = [eq(schema.readerNotifications.userId, auth.user.id)];
 if (unreadOnly) conditions.push(isNull(schema.readerNotifications.readAt));
 const notifications = await db.select().from(schema.readerNotifications).where(and(...conditions)).orderBy(desc(schema.readerNotifications.createdAt)).limit(50);
 return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.readAt).length });
}
export async function PATCH(request: Request) {
 const auth = await requireAuth(request); if ('errorResponse' in auth) return auth.errorResponse;
 if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Notifications unavailable.' }, { status: 503 });
 const body = await request.json().catch(() => null) as { id?: unknown; markAllRead?: unknown } | null;
 if (body?.markAllRead === true) { await db.update(schema.readerNotifications).set({ readAt: new Date() }).where(and(eq(schema.readerNotifications.userId, auth.user.id), isNull(schema.readerNotifications.readAt))); return NextResponse.json({ success: true }); }
 if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Notification id required.' }, { status: 400 });
 const rows = await db.update(schema.readerNotifications).set({ readAt: new Date() }).where(and(eq(schema.readerNotifications.id, body.id), eq(schema.readerNotifications.userId, auth.user.id))).returning({ id: schema.readerNotifications.id });
 if (!rows.length) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
 return NextResponse.json({ success: true });
}
