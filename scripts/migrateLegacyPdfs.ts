import crypto from 'node:crypto';
import * as dotenv from 'dotenv';
import { del, put } from '@vercel/blob';
import { eq, isNull } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MAX_LEGACY_PDF_BYTES = 50 * 1024 * 1024;
const applyChanges = process.argv.includes('--apply');

function isVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

async function main() {
  const { db, schema, isDatabaseConfigured } = await import('../src/db');
  if (!isDatabaseConfigured() || !db) {
    throw new Error('DATABASE_URL must point to the database containing the legacy PDF records.');
  }

  const publicToken = process.env.BLOB_READ_WRITE_TOKEN;
  const privateToken = process.env.PDF_BLOB_READ_WRITE_TOKEN;
  if (!publicToken || !privateToken) {
    throw new Error('Set BLOB_READ_WRITE_TOKEN for the legacy public store and PDF_BLOB_READ_WRITE_TOKEN for the separate private store.');
  }

  const legacyBooks = await db.select({
    id: schema.books.id,
    slug: schema.books.slug,
    originalPdfUrl: schema.books.originalPdfUrl,
  }).from(schema.books)
    .where(isNull(schema.books.originalPdfPath));

  const eligible = legacyBooks.filter((book) =>
    Boolean(book.originalPdfUrl && isVercelBlobUrl(book.originalPdfUrl))
  );

  console.log(`Found ${eligible.length} legacy public Vercel PDF URL(s) without a private path.`);
  for (const book of eligible) {
    console.log(` - ${book.slug}: ${new URL(book.originalPdfUrl!).hostname}`);
  }
  if (!applyChanges) {
    console.log('DRY RUN: no files or database records were changed.');
    console.log('Review the count, then re-run with --apply to copy PDFs to private storage and remove their public copies.');
    return;
  }

  for (const book of eligible) {
    const publicUrl = book.originalPdfUrl!;
    let privatePath: string | null = null;
    try {
      const response = await fetch(publicUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Public download failed with HTTP ${response.status}`);
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > MAX_LEGACY_PDF_BYTES) throw new Error('PDF exceeds the 50 MB migration safety limit.');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_LEGACY_PDF_BYTES) {
        throw new Error('Downloaded PDF is empty or exceeds the 50 MB migration safety limit.');
      }
      if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new Error('The legacy Blob URL did not return a PDF file.');
      }

      const blob = await put('legacy-imports/' + book.slug + '-' + crypto.randomUUID() + '.pdf', bytes, {
        access: 'private',
        token: privateToken,
        contentType: 'application/pdf',
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
      });
      if (!blob?.pathname) throw new Error('Private Blob storage did not return a pathname.');
      privatePath = blob.pathname;

      await db.update(schema.books).set({
        originalPdfPath: privatePath,
        originalPdfUrl: null,
        updatedAt: new Date(),
      }).where(eq(schema.books.id, book.id));

      try {
        await del(publicUrl, { token: publicToken });
        console.log(`Migrated and removed the public PDF for book ${book.slug}.`);
      } catch (deleteError) {
        console.error(
          `Private copy completed for ${book.slug}, but the legacy public copy may still be accessible. Remove it from the public Blob store manually or retry.`,
          deleteError instanceof Error ? deleteError.name : 'UnknownError'
        );
      }
    } catch (error) {
      if (privatePath) {
        try { await del(privatePath, { token: privateToken }); }
        catch { /* Keep the primary migration error; operator can inspect the private store. */ }
      }
      console.error(
        `Could not migrate legacy PDF for book ${book.slug}.`,
        error instanceof Error ? error.message : 'UnknownError'
      );
    }
  }
}

main().catch((error: unknown) => {
  console.error('Legacy PDF migration failed:', error instanceof Error ? error.message : 'UnknownError');
  process.exitCode = 1;
});
