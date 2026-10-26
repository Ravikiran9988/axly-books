import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { splitMarkdownIntoChapters } from '@/lib/markdownImport';
import { extractMarkdownFilesFromZip } from '@/lib/markdownZipImport';

const MAX_MARKDOWN_SIZE = 2 * 1024 * 1024;
const MAX_ZIP_SIZE = 10 * 1024 * 1024;
const MAX_BOOK_CHAPTERS = 100;

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

export async function POST(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'Adding Markdown files requires the configured persistent database.' }, { status: 503 });
  }

  let insertedIds: string[] = [];
  try {
    const { bookId } = await params;
    const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
    if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const form = await request.formData();
    const value = form.get('file');
    if (!value || typeof value === 'string') return NextResponse.json({ error: 'Choose a .md file or ZIP archive.' }, { status: 400 });
    const file = value as File;
    if (!file.size) return NextResponse.json({ error: 'The selected file is empty.' }, { status: 400 });
    const isZip = /\.zip$/i.test(file.name);
    const isMarkdown = /\.md$/i.test(file.name);
    if (!isZip && !isMarkdown) return NextResponse.json({ error: 'Upload a .md file or a ZIP archive containing Markdown files.' }, { status: 400 });
    if (isZip && file.size > MAX_ZIP_SIZE) return NextResponse.json({ error: 'ZIP archives must be 10 MB or smaller.' }, { status: 413 });
    if (isMarkdown && file.size > MAX_MARKDOWN_SIZE) return NextResponse.json({ error: 'Single Markdown files must be 2 MB or smaller.' }, { status: 413 });

    const files = isZip
      ? extractMarkdownFilesFromZip(Buffer.from(await file.arrayBuffer()))
      : [{ path: file.name, content: await file.text() }];
    if (files.some(item => !item.content.trim())) return NextResponse.json({ error: 'A Markdown file in the upload is empty.' }, { status: 400 });

    const existing = await db.select({
      id: schema.chapters.id,
      chapterNumber: schema.chapters.chapterNumber,
      slug: schema.chapters.slug,
    }).from(schema.chapters).where(eq(schema.chapters.bookId, book.id)).orderBy(asc(schema.chapters.chapterNumber));
    const drafts = files.flatMap(item => {
      const fileTitle = item.path.split('/').pop()!.replace(/\.md$/i, '').replace(/[_-]+/g, ' ').trim();
      return splitMarkdownIntoChapters(item.content, isZip ? fileTitle : book.title);
    });
    if (!drafts.length) return NextResponse.json({ error: 'No readable Markdown sections were found.' }, { status: 400 });
    if (existing.length + drafts.length > MAX_BOOK_CHAPTERS) {
      return NextResponse.json({ error: `This book can contain at most ${MAX_BOOK_CHAPTERS} chapters/sections. It currently has ${existing.length}; this upload adds ${drafts.length}.` }, { status: 413 });
    }

    const usedSlugs = new Set(existing.map(chapter => chapter.slug.toLowerCase()));
    let nextNumber = existing.reduce((max, chapter) => Math.max(max, chapter.chapterNumber), 0) + 1;
    const now = new Date();
    const newChapters = drafts.map(draft => {
      const base = slugify(draft.title) || 'section-' + nextNumber;
      let chapterSlug = base;
      let suffix = 2;
      while (usedSlugs.has(chapterSlug.toLowerCase())) chapterSlug = base + '-' + suffix++;
      usedSlugs.add(chapterSlug.toLowerCase());
      const wordCount = draft.content.split(/\s+/).filter(Boolean).length;
      const id = 'ch_' + crypto.randomUUID();
      insertedIds.push(id);
      return {
        id,
        bookId: book.id,
        chapterNumber: nextNumber++,
        title: draft.title.slice(0, 180),
        slug: chapterSlug,
        summary: draft.content.replace(/[#>*_`\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 220) || 'Imported from Markdown.',
        content: [{ title: 'Content', content: draft.content }],
        estimatedReadingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)),
        isPublished: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.insert(schema.chapters).values(newChapters);
    const stats = await db.select({
      totalChapters: sql<number>`count(*)`,
      totalTime: sql<number>`coalesce(sum(${schema.chapters.estimatedReadingTimeMinutes}), 0)`,
    }).from(schema.chapters).where(eq(schema.chapters.bookId, book.id));
    await db.update(schema.books).set({
      totalChapters: Number(stats[0]?.totalChapters || 0),
      estimatedReadingTimeMinutes: Number(stats[0]?.totalTime || 0),
      updatedAt: now,
    }).where(eq(schema.books.id, book.id));

    const chapters = await db.select().from(schema.chapters)
      .where(eq(schema.chapters.bookId, book.id)).orderBy(asc(schema.chapters.chapterNumber));
    const added = chapters.filter(chapter => insertedIds.includes(chapter.id));
    return NextResponse.json({
      success: true,
      chapters: added,
      message: `Added ${added.length} draft chapter/section${added.length === 1 ? '' : 's'} from ${files.length} Markdown file${files.length === 1 ? '' : 's'}. Review before publishing.`,
    }, { status: 201 });
  } catch (error) {
    if (insertedIds.length) {
      try { await db.delete(schema.chapters).where(sql`${schema.chapters.id} in (${sql.join(insertedIds.map(id => sql`${id}`), sql`, `)})`); }
      catch (cleanupError) { console.error('Failed to clean up partially imported Markdown chapters:', cleanupError); }
    }
    console.error('Add Markdown files error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not add Markdown files.' }, { status: 422 });
  }
}
