export interface ChapterOrderItem {
  id: string;
  chapterNumber: number;
}

/**
 * Require a complete permutation of the chapter list numbered 1..N.
 * Partial updates are unsafe with the unique (book_id, chapter_number) index.
 */
export function validateCompleteChapterOrder(
  existingChapterIds: string[],
  requestedOrder: ChapterOrderItem[]
): void {
  if (requestedOrder.length !== existingChapterIds.length) {
    throw new Error('Every chapter must be included exactly once.');
  }

  const expectedIds = new Set(existingChapterIds);
  const requestedIds = requestedOrder.map((item) => item.id);
  const requestedNumbers = requestedOrder.map((item) => item.chapterNumber);

  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new Error('A chapter cannot appear more than once.');
  }
  if (requestedIds.some((id) => !expectedIds.has(id))) {
    throw new Error('The order contains a chapter that does not belong to this book.');
  }
  if (new Set(requestedNumbers).size !== requestedNumbers.length) {
    throw new Error('Chapter numbers must be unique.');
  }
  for (let number = 1; number <= existingChapterIds.length; number++) {
    if (!requestedNumbers.includes(number)) {
      throw new Error('Chapter numbers must be consecutive starting at 1.');
    }
  }
}
