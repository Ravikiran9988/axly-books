import assert from 'node:assert/strict';
import { extractPdfPages, slugifyImportedChapter, splitPdfIntoChapters } from '../src/lib/pdfImport';

function minimalPdf(): Buffer {
  const stream = 'BT /F1 12 Tf 72 720 Td (Chapter 1: Introduction) Tj T* (This is a useful paragraph for a reader test with enough words.) Tj ET';
  return Buffer.from([
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /Resources 4 0 R /Contents 5 0 R >> endobj',
    '4 0 obj << /Font << /F1 6 0 R >> >> endobj',
    '5 0 obj << /Length ' + Buffer.byteLength(stream, 'latin1') + ' >> stream\n' + stream + '\nendstream endobj',
    '6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n'), 'latin1');
}
const pages = extractPdfPages(minimalPdf());
assert.equal(pages.length, 1);
assert.match(pages[0], /Chapter 1: Introduction/);
assert.match(pages[0], /useful paragraph/);
assert.equal(splitPdfIntoChapters(pages).length, 1);
assert.match(slugifyImportedChapter('Foundations & Basics', 2), /^chapter-2-foundations-basics$/);
assert.throws(() => splitPdfIntoChapters(['']), /scanned\/image-only PDF/);
console.log('PDF import parser tests passed.');
