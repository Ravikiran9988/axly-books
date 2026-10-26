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

```python
print("hello")
```

# Chapter 2: Applications

[Read more](https://example.com)
`;
const parsed = splitMarkdownIntoChapters(h1Manuscript);
assert.equal(parsed.length, 3, 'H1 headings should define chapters and preserve preface content as its own section');
assert.equal(parsed[0].title, 'Introduction');
assert.match(parsed[0].content, /\*\*opening\*\*/);
assert.equal(parsed[1].title, 'Preface');
assert.match(parsed[1].content, /## Attention/, 'H2 subheadings must be preserved inside the chapter body');
assert.match(parsed[1].content, /- first item/);
assert.match(parsed[1].content, /\x60\x60\x60python/);
assert.equal(parsed[2].title, 'Chapter 1: Foundations');
assert.match(parsed[2].content, /Chapter 2: Applications/);

// When no H1 exists, H2 headings provide useful chapter boundaries.
const h2Only = splitMarkdownIntoChapters('## Section One\n\nFirst body\n\n## Section Two\n\nSecond body');
assert.equal(h2Only.length, 2);
assert.equal(h2Only[0].title, 'Section One');
assert.equal(h2Only[1].title, 'Section Two');

// If a manuscript has no headings, do not fabricate chapter divisions.
const unheaded = '# not a level-one heading?';
const fullBook = splitMarkdownIntoChapters('Plain manuscript text.\n\nSecond paragraph.');
assert.deepEqual(fullBook, [{ title: 'Full Book', content: 'Plain manuscript text.\n\nSecond paragraph.' }]);
assert.deepEqual(splitMarkdownIntoChapters('   '), []);
console.log('Markdown import tests passed.');
