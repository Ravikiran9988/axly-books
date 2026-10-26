import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { splitMarkdownIntoChapters } from '@/lib/markdownImport';

const MAX_MARKDOWN_SIZE = 2 * 1024 * 1024;
function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}
function field(form: FormData, key: string, fallback = ''): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!isDatabaseConfigured() || !db) {
    return NextResponse.json({ error: 'Markdown import requires the configured persistent database. Database setup is managed separately.' }, { status: 503 });
  }
  try {
    const form = await request.formData();
    const fileValue = form.get('file');
    if (!fileValue || typeof fileValue === 'string') return NextResponse.json({ error: 'Choose a Markdown (.md) file.' }, { status: 400 });
    const file = fileValue as File;
    if (!file.size) return NextResponse.json({ error: 'The Markdown file is empty.' }, { status: 400 });
    if (file.size > MAX_MARKDOWN_SIZE) return NextResponse.json({ error: 'Markdown files must be 2 MB or smaller.' }, { status: 413 });
    if (!/\.md$/i.test(file.name)) {
      return NextResponse.json({ error: 'Upload a file with the .md extension.' }, { status: 400 });
    }
    const markdown = await file.text();
    if (!markdown.trim()) return NextResponse.json({ error: 'The Markdown file contains no readable text.' }, { status: 400 });
    const title = field(form, 'title') || file.name.replace(/\.md$/i, '').replace(/[_-]+/g, ' ').trim();
    const parsedChapters = splitMarkdownIntoChapters(markdown, title);
    if (parsedChapters.length > 100) return NextResponse.json({ error: 'A book can contain at most 100 sections/chapters.' }, { status: 413 });
    const slug = slugify(field(form, 'slug') || title);
    const subtitle = field(form, 'subtitle');
    const category = field(form, 'category', 'General') || 'General';
    const description = field(form, 'description') || 'A free book published for online reading on AXLY Books.';
    const synopsis = field(form, 'synopsis') || description;
    const edition = field(form, 'edition', 'First Edition (2026)') || 'First Edition (2026)';
    const yearInput = Number(field(form, 'publishedYear', String(new Date().getFullYear())));
    const publishedYear = Number.isInteger(yearInput) && yearInput >= 2000 && yearInput <= 2100 ? yearInput : new Date().getFullYear();
    const tags = field(form, 'tags').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20);
    const license = field(form, 'license') === 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)'
      ? 'Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)' : 'All Rights Reserved';
    const licenseUrl = license.includes('CC BY-NC 4.0') ? 'https://creativecommons.org/licenses/by-nc/4.0/' : null;
    if (title.length < 2 || title.length > 150 || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: 'Provide a title (2–150 characters) and valid URL slug.' }, { status: 400 });
    }
    if (description.length < 10 || description.length > 2000 || synopsis.length < 10 || synopsis.length > 10000) {
      return NextResponse.json({ error: 'Description must be 10–2,000 characters and synopsis 10–10,000 characters.' }, { status: 400 });
    }
    const duplicate = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.slug, slug)).limit(1);
    if (duplicate.length) return NextResponse.json({ error: 'A book with that slug already exists.' }, { status: 409 });

    const now = new Date();
    const bookId = 'book_' + crypto.randomUUID();
    await db.insert(schema.books).values({
      id: bookId, slug, title, subtitle, description, synopsis, authorName: 'Slayer',
      coverImageUrl: '/images/ml-deep-learning-cover.jpg', category, tags, edition, publishedYear,
      status: 'Draft', isFree: true, isPublished: false, totalChapters: parsedChapters.length,
      estimatedReadingTimeMinutes: Math.max(1, Math.ceil(markdown.split(/\s+/).length / 200)),
      allowPdfDownload: false, license, licenseUrl, createdAt: now, updatedAt: now,
    });
    const taken = new Set<string>();
    try {
      await db.insert(schema.chapters).values(parsedChapters.map((chapter, index) => {
        const base = slugify(chapter.title) || 'section-' + (index + 1);
        let chapterSlug = base;
        let suffix = 2;
        while (taken.has(chapterSlug)) chapterSlug = base + '-' + suffix++;
        taken.add(chapterSlug);
        const wordCount = chapter.content.split(/\s+/).filter(Boolean).length;
        return {
          id: 'ch_' + crypto.randomUUID(), bookId, chapterNumber: index + 1, title: chapter.title.slice(0, 180),
          slug: chapterSlug, summary: chapter.content.replace(/[#>*_`\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 220) || 'Imported from Markdown.',
          content: [{ title: 'Content', content: chapter.content }],
          estimatedReadingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200)), isPublished: false, createdAt: now, updatedAt: now,
        };
      }));
    } catch (error) {
      await db.delete(schema.books).where(eq(schema.books.id, bookId));
      throw error;
    }
    const chapters = await db.select({
      id: schema.chapters.id, chapterNumber: schema.chapters.chapterNumber, title: schema.chapters.title,
      slug: schema.chapters.slug, summary: schema.chapters.summary,
      estimatedReadingTimeMinutes: schema.chapters.estimatedReadingTimeMinutes,
    }).from(schema.chapters).where(eq(schema.chapters.bookId, bookId)).orderBy(asc(schema.chapters.chapterNumber));
    return NextResponse.json({
      success: true, book: { id: bookId, slug, title, allowPdfDownload: false, isPublished: false },
      chapters: chapters.map((chapter, index) => ({ ...chapter, wordCount: parsedChapters[index].content.split(/\s+/).filter(Boolean).length })),
      importedTextCharacters: markdown.length,
      message: 'Markdown manuscript imported as an unpublished online-reading draft. Review the generated chapter/section titles before publishing.',
    }, { status: 201 });
  } catch (error) {
    console.error('Markdown import error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected Markdown import failure.' }, { status: 422 });
  }
}
