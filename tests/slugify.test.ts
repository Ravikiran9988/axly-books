import assert from 'node:assert/strict';
import { slugifyBookTitle } from '../src/lib/slugify';

assert.equal(slugifyBookTitle('ML Deep Learning Fundamentals'), 'ml-deep-learning-fundamentals');
assert.equal(slugifyBookTitle('Café & AI — Beginner’s Guide'), 'cafe-ai-beginner-s-guide');
assert.equal(slugifyBookTitle('The Art of Overthinking'), 'the-art-of-overthinking');
assert.equal(slugifyBookTitle('   '), '');

console.log('Slug generation regression tests passed.');
