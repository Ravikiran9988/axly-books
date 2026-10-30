import assert from 'node:assert/strict';
import { validateCompleteChapterOrder } from '../src/lib/chapterOrdering';

const ids = ['chapter-a', 'chapter-b', 'chapter-c'];
assert.doesNotThrow(() => validateCompleteChapterOrder(ids, [
  { id: 'chapter-c', chapterNumber: 1 },
  { id: 'chapter-a', chapterNumber: 2 },
  { id: 'chapter-b', chapterNumber: 3 },
]), 'a complete swap/reorder should be valid');

assert.throws(() => validateCompleteChapterOrder(ids, [
  { id: 'chapter-a', chapterNumber: 1 },
]), /Every chapter/, 'partial reorders must be rejected');
assert.throws(() => validateCompleteChapterOrder(ids, [
  { id: 'chapter-a', chapterNumber: 1 },
  { id: 'chapter-a', chapterNumber: 2 },
  { id: 'chapter-c', chapterNumber: 3 },
]), /more than once/, 'duplicate chapter IDs must be rejected');
assert.throws(() => validateCompleteChapterOrder(ids, [
  { id: 'chapter-a', chapterNumber: 1 },
  { id: 'chapter-b', chapterNumber: 1 },
  { id: 'chapter-c', chapterNumber: 3 },
]), /unique/, 'duplicate chapter numbers must be rejected');
assert.throws(() => validateCompleteChapterOrder(ids, [
  { id: 'chapter-a', chapterNumber: 1 },
  { id: 'chapter-b', chapterNumber: 2 },
  { id: 'foreign-chapter', chapterNumber: 3 },
]), /does not belong/, 'foreign chapter IDs must be rejected');

console.log('Chapter ordering regression tests passed.');
