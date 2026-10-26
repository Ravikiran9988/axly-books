import assert from 'node:assert/strict';
import { splitMarkdownIntoChapters } from '../src/lib/markdownImport';

const h1Manuscript = `# Preface

A brief **opening** that should remain intact.

# Chapter 1: Foundations

The first paragraph.

## Attention

This heading is part of the chapter body.

- first item
- second item

\`\`\`python
print("hello")
\`\`\`

# Chapter 2: Applications

[Read more](https://example.com)
`;
const parsed = splitMarkdownIntoChapters(h1Manuscript);
assert.equal(parsed.length, 3, 'H1 headings should define chapters and preserve preface content as its own section');
assert.equal(parsed[0].title, 'Preface');
assert.match(parsed[0].content, /\*\*opening\*\*/);
assert.equal(parsed[1].title, 'Chapter 1: Foundations');
assert.match(parsed[1].content, /## Attention/, 'H2 subheadings must be preserved inside the chapter body');
assert.match(parsed[1].content, /- first item/);
assert.match(parsed[1].content, /\x60\x60\x60python/);
assert.equal(parsed[2].title, 'Chapter 2: Applications');
assert.match(parsed[2].content, /\[Read more\]\(https:\/\/example.com\)/);

// When no H1 exists, H2 headings provide useful chapter boundaries.
const h2Only = splitMarkdownIntoChapters('## Section One\n\nFirst body\n\n## Section Two\n\nSecond body');
assert.equal(h2Only.length, 2);
assert.equal(h2Only[0].title, 'Section One');
assert.equal(h2Only[1].title, 'Section Two');

// A matching H1 document title should not become a duplicate reader chapter.
const titledManuscript = splitMarkdownIntoChapters(
  '# Deep Learning Handbook\n\nShort opening text.\n\n## Chapter 1\n\nChapter one.\n\n## Chapter 2\n\nChapter two.',
  'Deep Learning Handbook'
);
assert.equal(titledManuscript.length, 3);
assert.equal(titledManuscript[0].title, 'Introduction');
assert.equal(titledManuscript[1].title, 'Chapter 1');
assert.equal(titledManuscript[2].title, 'Chapter 2');

// Heading-looking code comments must not split a manuscript.
const fencedHeading = splitMarkdownIntoChapters(
  '# First Chapter\n\n```python\n# This is a code comment, not a chapter\nprint(1)\n```\n\n# Second Chapter\n\nText.',
);
assert.equal(fencedHeading.length, 2);
assert.match(fencedHeading[0].content, /# This is a code comment, not a chapter/);

// If a manuscript has no headings, do not fabricate chapter divisions.
const fullBook = splitMarkdownIntoChapters('Plain manuscript text.\n\nSecond paragraph.');
assert.deepEqual(fullBook, [{ title: 'Full Book', content: 'Plain manuscript text.\n\nSecond paragraph.' }]);
assert.deepEqual(splitMarkdownIntoChapters('   '), []);
console.log('Markdown import tests passed.');
