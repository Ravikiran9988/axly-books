/**
 * Create a stable, URL-safe slug from a book title.
 * Unicode combining marks are removed without stripping ordinary ASCII letters.
 */
export function slugifyBookTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}
