import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser, requireAuth } from '@/lib/auth';

type RouteContext = { params: Promise<{ slug: string; chapterSlug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json({ error: 'Comments require the persistent database. Configure DATABASE_URL.' }, { status: 503 });
    }
    const { slug, chapterSlug } = await params;
    const bookRows = await db.select({ id: schema.books.id, isPublished: schema.books.isPublished })
      .from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!bookRows[0] || !bookRows[0].isPublished) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    const chapterRows = await db.select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
      .from(schema.chapters).where(and(eq(schema.chapters.bookId, bookRows[0].id), eq(schema.chapters.slug, chapterSlug))).limit(1);
    if (!chapterRows[0] || !chapterRows[0].isPublished) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });

    const url = new URL(request.url);
    const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(30, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const sort = url.searchParams.get('sort') === 'relevant' ? 'relevant' : 'newest';
    const currentUser = await getCurrentUser(request);
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(schema.comments).where(and(eq(schema.comments.bookId, bookRows[0].id), eq(schema.comments.chapterId, chapterRows[0].id), eq(schema.comments.status, 'published')));
    const order = sort === 'relevant'
      ? [desc(sql`(select count(*) from comment_votes where comment_id = ${schema.comments.id})`), desc(schema.comments.createdAt)]
      : [desc(schema.comments.createdAt)];

    const rows = await db.select({
      id: schema.comments.id,
      content: schema.comments.content,
      parentCommentId: schema.comments.parentCommentId,
      createdAt: schema.comments.createdAt,
      updatedAt: schema.comments.updatedAt,
      userId: schema.users.id,
      displayName: schema.users.displayName,
      role: schema.users.role,
      voteCount: sql<number>`(select count(*)::int from comment_votes where comment_id = ${schema.comments.id})`,
    })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(and(
        eq(schema.comments.bookId, bookRows[0].id),
        eq(schema.comments.chapterId, chapterRows[0].id),
        eq(schema.comments.status, 'published'),
      ))
      .orderBy(...order)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const ids = page.map((row) => row.id);
    const [votedRows, childCounts] = ids.length ? await Promise.all([
      currentUser
        ? db.select({ commentId: schema.commentVotes.commentId }).from(schema.commentVotes)
          .where(and(eq(schema.commentVotes.userId, currentUser.id), sql`${schema.commentVotes.commentId} = ANY(${ids})`))
        : Promise.resolve([]),
      db.select({
        parentCommentId: schema.comments.parentCommentId,
        count: sql<number>`count(*)::int`,
      }).from(schema.comments)
        .where(and(eq(schema.comments.status, 'published'), sql`${schema.comments.parentCommentId} = ANY(${ids})`))
        .groupBy(schema.comments.parentCommentId),
    ]) : [[], []];

    const voted = new Set(votedRows.map((row) => row.commentId));
    const replies = new Map(childCounts.map((row) => [row.parentCommentId, Number(row.count)]));
    return NextResponse.json({
      comments: page.map((row) => ({
        id: row.id,
        content: row.content,
        parentCommentId: row.parentCommentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        user: { id: row.userId, displayName: row.displayName, isAuthor: row.role === 'admin' },
        voteCount: Number(row.voteCount),
        hasVoted: voted.has(row.id),
        replyCount: replies.get(row.id) || 0,
        canEdit: currentUser?.id === row.userId,
        canModerate: currentUser?.role === 'admin',
      })),
      nextOffset: hasMore ? offset + limit : null,
      totalOnPage: page.length,
      totalCount: Number(countRow?.total ?? 0),
      sort,
    });
  } catch (error) {
    console.error('List chapter comments failed:', error);
    return NextResponse.json({ error: 'Could not load chapter comments.' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) return NextResponse.json({ error: 'Comments are temporarily unavailable.' }, { status: 503 });

  try {
    const { slug, chapterSlug } = await params;
    const body = await request.json().catch(() => null) as { content?: unknown; parentCommentId?: unknown } | null;
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const parentCommentId = typeof body?.parentCommentId === 'string' && body.parentCommentId ? body.parentCommentId : null;
    if (content.length < 2 || content.length > 2000) {
      return NextResponse.json({ error: 'Comment must be between 2 and 2,000 characters.' }, { status: 400 });
    }

    const [book] = await db.select({ id: schema.books.id, isPublished: schema.books.isPublished })
      .from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (!book?.isPublished) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
    const [chapter] = await db.select({ id: schema.chapters.id, isPublished: schema.chapters.isPublished })
      .from(schema.chapters).where(and(eq(schema.chapters.bookId, book.id), eq(schema.chapters.slug, chapterSlug))).limit(1);
    if (!chapter?.isPublished) return NextResponse.json({ error: 'Chapter not found.' }, { status: 404 });

    if (parentCommentId) {
      const [parent] = await db.select({ id: schema.comments.id, parentCommentId: schema.comments.parentCommentId })
        .from(schema.comments).where(and(
          eq(schema.comments.id, parentCommentId),
          eq(schema.comments.bookId, book.id),
          eq(schema.comments.chapterId, chapter.id),
          eq(schema.comments.status, 'published'),
        )).limit(1);
      if (!parent) return NextResponse.json({ error: 'The comment you are replying to is unavailable.' }, { status: 404 });
      if (parent.parentCommentId) return NextResponse.json({ error: 'Replies can be one level deep to keep discussions readable.' }, { status: 400 });
    }

    const id = `cmt_${crypto.randomUUID()}`;
    const now = new Date();
    await db.insert(schema.comments).values({
      id, bookId: book.id, chapterId: chapter.id, userId: auth.user.id,
      parentCommentId, content, status: 'published', createdAt: now, updatedAt: now,
    });
    return NextResponse.json({
      success: true,
      comment: {
        id, content, parentCommentId, createdAt: now.toISOString(), updatedAt: now.toISOString(),
        user: { id: auth.user.id, displayName: auth.user.role === 'admin' ? 'Slayer' : auth.user.displayName, isAuthor: auth.user.role === 'admin' },
        voteCount: 0, hasVoted: false, replyCount: 0, canEdit: true, canModerate: auth.user.role === 'admin',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create chapter comment failed:', error);
    return NextResponse.json({ error: 'Could not post your comment. Please try again.' }, { status: 500 });
  }
}
