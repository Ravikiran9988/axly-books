import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { chaptersReorderSchema } from '@/lib/validations';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin();
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const { bookId } = await params;

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = chaptersReorderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid reorder array.' },
        { status: 400 }
      );
    }

    const { order } = parseResult.data;

    if (isDatabaseConfigured() && db) {
      // Execute within an atomic transaction to prevent inconsistent or duplicate chapter numbering
      await db.transaction(async (tx) => {
        const now = new Date();
        for (const item of order) {
          await tx
            .update(schema.chapters)
            .set({ chapterNumber: item.chapterNumber, updatedAt: now })
            .where(and(eq(schema.chapters.id, item.id), eq(schema.chapters.bookId, bookId)));
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Chapters reordered successfully.',
      });
    }

    return NextResponse.json({ success: true, message: 'Reordered in development.' });
  } catch (err: unknown) {
    console.error('Reorder chapters error:', err);
    return NextResponse.json({ error: 'Failed to reorder chapters.' }, { status: 500 });
  }
}
