// Mock CSS module imports for pure Node/tsx environment
require.extensions['.css'] = (module) => {
  const proxy = new Proxy({}, { get: (_, prop) => String(prop) });
  module.exports = proxy;
  module.exports.default = proxy;
};



import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Book } from '../src/types/book';
import fs from 'node:fs';
import path from 'node:path';



const mockBookWithPdf: Book = {
  id: 'book-test-pdf',
  slug: 'deep-learning-mastery',
  title: 'Deep Learning Mastery',
  subtitle: 'From Perceptrons to Transformers',
  author: 'Medicharla Ravi Kiran',
  authorRealName: 'Ravi Kiran',
  authorSlug: 'slayer',
  coverImage: '/images/ml-deep-learning-cover.jpg',
  description: 'A comprehensive journey into deep neural network architectures.',
  synopsis: 'A comprehensive textbook on modern neural architectures.',
  category: 'Artificial Intelligence & Machine Learning',
  tags: ['AI', 'Deep Learning'],
  edition: '1st Edition (2026)',
  publishedYear: 2026,
  publicationStatus: 'Available Free',
  totalChapters: 12,
  estimatedReadingTimeMinutes: 240,
  isFree: true,
  isPublished: true,
  allowPdfDownload: true,
  originalPdfUrl: '/api/books/deep-learning-mastery/pdf',
  copyrightNotice: '© 2026 Medicharla Ravi Kiran',
  license: 'CC BY-NC 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  chapters: [],
};

const mockBookWithoutPdf: Book = {
  ...mockBookWithPdf,
  id: 'book-test-no-pdf',
  slug: 'machine-learning-basics',
  title: 'Machine Learning Basics',
  allowPdfDownload: false,
  originalPdfUrl: null,
};

const mockBookWithMissingPdfUrl: Book = {
  ...mockBookWithPdf,
  id: 'book-test-missing-url',
  slug: 'ai-ethics',
  title: 'AI Ethics',
  allowPdfDownload: true,
  originalPdfUrl: null,
};

async function runBookCardTests() {
  console.log('🧪 AXLY BOOKS — Book Card Actions & Cover Sizing Verification');

  const { default: BookCard } = await import('../src/components/BookCard');

  // Test 1: Book with downloadable PDF configured
  {
    const html = renderToString(React.createElement(BookCard, { book: mockBookWithPdf }));

    assert.ok(html.includes('href="/api/books/deep-learning-mastery/pdf"'), 'Download link must point to book.originalPdfUrl');
    assert.ok(html.includes('download=""') || html.includes('download'), 'Download link must contain the download attribute');
    assert.ok(html.includes('target="_blank"'), 'Download link must specify target="_blank"');
    assert.ok(html.includes('rel="noopener noreferrer"'), 'Download link must specify rel="noopener noreferrer"');
    assert.ok(html.includes('aria-label="Download PDF of Deep Learning Mastery"'), 'Download link must have accessible aria-label');
    console.log('  ✔ Download PDF action renders correctly when allowPdfDownload is true and originalPdfUrl is present.');
  }

  // Test 2: Book with PDF download disabled
  {
    const html = renderToString(React.createElement(BookCard, { book: mockBookWithoutPdf }));
    assert.ok(!html.includes('Download PDF of Machine Learning Basics'), 'Download button must NOT render when allowPdfDownload is false');
    assert.ok(!html.includes('/api/books/machine-learning-basics/pdf'), 'No PDF download link should exist');
    console.log('  ✔ Download PDF action is omitted when allowPdfDownload is false.');
  }

  // Test 3: Book with allowPdfDownload true but missing originalPdfUrl
  {
    const html = renderToString(React.createElement(BookCard, { book: mockBookWithMissingPdfUrl }));
    assert.ok(!html.includes('Download PDF of AI Ethics'), 'Download button must NOT render when originalPdfUrl is missing');
    console.log('  ✔ Download PDF action is omitted when originalPdfUrl is missing or null.');
  }

  // Test 4: Share button verification
  {
    const html = renderToString(React.createElement(BookCard, { book: mockBookWithPdf }));
    assert.ok(html.includes('aria-label="Share Deep Learning Mastery"'), 'Share button must have descriptive aria-label');
    assert.ok(html.includes('type="button"'), 'Share button must be type="button"');
    console.log('  ✔ Share button renders with accessible label and appropriate button semantics.');
  }

  // Test 5: Existing functionality preserved
  {
    const html = renderToString(React.createElement(BookCard, { book: mockBookWithPdf }));
    assert.ok(html.includes('Read Book'), 'Primary action "Read Book" must be present');
    assert.ok(html.includes('Free Online'), 'Badge "Free Online" must be present');
    assert.ok(html.includes('href="/books/deep-learning-mastery"'), 'Book details links must be present');
    assert.ok(/12.*Chapters/.test(html), 'Total chapters count must be present');
    assert.ok(/~.*4.*h read/.test(html), 'Reading time must be present');

    console.log('  ✔ Preserved Read Book CTA, details button, metadata, and Free Online badge.');

  }

  // Test 6: CSS Aspect-Ratio and Cover proportions verification
  {
    const cssPath = path.join(__dirname, '../src/components/BookCard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('aspect-ratio: 2 / 3'), 'Book cover frame must enforce 2 / 3 aspect ratio');
    assert.ok(cssContent.includes('object-fit: cover'), 'Cover image must use object-fit: cover');
    assert.ok(cssContent.includes('height: 220px') || cssContent.includes('max-height:'), 'Cover wrapper height must be controlled and reduced');
    assert.ok(!cssContent.includes('max-height: 380px'), 'Oversized 380px height must be eliminated');
    assert.ok(cssContent.includes('.secondaryActions'), 'Secondary actions styling container must be present');
    assert.ok(cssContent.includes('.shareToast'), 'Share feedback notification styles must be present');
    console.log('  ✔ CSS rules verify 2:3 aspect ratio, reduced cover height, and responsive secondary actions.');
  }

  console.log('🎉 ALL BOOK CARD ACTION & IMAGE PROPORTION TESTS PASSED!');
}

runBookCardTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
