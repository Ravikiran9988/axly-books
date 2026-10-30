import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { chaptersReorderSchema } from '@/lib/validations';
import { validateCompleteChapterOrder } from '@/lib/chapterOrdering';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { bookId } = await params;
    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json(
        { error: 'Persistent database service is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = chaptersReorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid reorder array.' },
        { status: 400 }
      );
    }

    const [book] = await db
      .select({ id: schema.books.id })
      .from(schema.books)
      .where(or(eq(schema.books.id, bookId), eq(schema.books.slug, bookId)))
      .limit(1);
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const existingChapters = await db
      .select({ id: schema.chapters.id, chapterNumber: schema.chapters.chapterNumber })
      .from(schema.chapters)
      .where(eq(schema.chapters.bookId, book.id));

    const order = parsed.data.order;
    try {
      validateCompleteChapterOrder(existingChapters.map((chapter) => chapter.id), order);
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid chapter order.' },
        { status: 400 }
      );
    }

    // Move rows to a collision-free temporary range before assigning final
    // numbers. Direct swaps otherwise violate the unique (book_id, chapter_number)
    // index during the first update.
    const maxChapterNumber = existingChapters.reduce(
      (maximum, chapter) => Math.max(maximum, chapter.chapterNumber), 0
    );
    const temporaryBase = maxChapterNumber + existingChapters.length + 1;
    const now = new Date();

    await db.transaction(async (tx) => {
      for (let index = 0; index < order.length; index++) {
        await tx
          .update(schema.chapters)
          .set({ chapterNumber: temporaryBase + index, updatedAt: now })
          .where(and(
            eq(schema.chapters.id, order[index].id),
            eq(schema.chapters.bookId, book.id)
          ));
      }

      for (const item of order) {
        await tx
          .update(schema.chapters)
          .set({ chapterNumber: item.chapterNumber, updatedAt: now })
          .where(and(
            eq(schema.chapters.id, item.id),
            eq(schema.chapters.bookId, book.id)
          ));
      }
    });

    return NextResponse.json({ success: true, message: 'Chapters reordered successfully.' });
  } catch (error: unknown) {
    console.error('Reorder chapters error:', error);
    return NextResponse.json({ error: 'Failed to reorder chapters.' }, { status: 500 });
  }
}
