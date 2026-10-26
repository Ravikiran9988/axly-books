import assert from 'node:assert/strict';
import { isBookPublishable } from '../src/lib/publicationRules';

assert.equal(isBookPublishable({
  totalChapters: 1,
  hasPublishedChapter: true,
  allowPdfDownload: false,
  originalPdfPath: null,
}), true, 'An online-reading book with a published chapter can publish');

assert.equal(isBookPublishable({
  totalChapters: 0,
  hasPublishedChapter: false,
  allowPdfDownload: true,
  originalPdfPath: 'original-pdfs/example.pdf',
}), true, 'A download-only book can publish when a private PDF exists and downloads are enabled');

assert.equal(isBookPublishable({
  totalChapters: 0,
  hasPublishedChapter: false,
  allowPdfDownload: false,
  originalPdfPath: 'original-pdfs/example.pdf',
}), false, 'A PDF book with downloads disabled cannot publish without chapters');

assert.equal(isBookPublishable({
  totalChapters: 0,
  hasPublishedChapter: false,
  allowPdfDownload: true,
  originalPdfPath: null,
}), false, 'A PDF-only book without a stored file cannot publish');

assert.equal(isBookPublishable({
  totalChapters: 1,
  hasPublishedChapter: false,
  allowPdfDownload: true,
  originalPdfPath: 'original-pdfs/example.pdf',
}), true, 'A private PDF with downloads enabled can publish even when chapters are still drafts');
console.log('Publication rules tests passed.');


assert.equal(isBookPublishable({
  totalChapters: 3,
  hasPublishedChapter: false,
  allowPdfDownload: true,
  originalPdfPath: 'original-pdfs/example.pdf',
}), true, 'A private downloadable PDF can publish without published chapters even when draft chapters exist');
