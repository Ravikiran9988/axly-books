export interface MarkdownChapterDraft {
  title: string;
  content: string;
}

/**
 * Split a single Markdown manuscript into reader chapters without rewriting its content.
 * H1 headings take priority; if the manuscript has no H1 headings, H2 headings are used.
 * If there are no headings, the entire manuscript becomes one full-book section.
 */
export function splitMarkdownIntoChapters(markdown: string): MarkdownChapterDraft[] {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const h1Pattern = /^#\s+(.+?)\s*#*\s*$/gm;
  const h1Headings = [...normalized.matchAll(h1Pattern)];
  const headingPattern = h1Headings.length ? h1Pattern : /^##\s+(.+?)\s*#*\s*$/gm;
  const headings = [...normalized.matchAll(headingPattern)];

  if (!headings.length) {
    return [{ title: 'Full Book', content: normalized }];
  }

  const chapters: MarkdownChapterDraft[] = [];
  const firstHeadingIndex = headings[0].index ?? 0;
  const frontMatter = normalized.slice(0, firstHeadingIndex).trim();
  if (frontMatter) chapters.push({ title: 'Introduction', content: frontMatter });

  headings.forEach((heading, index) => {
    const headingIndex = heading.index ?? 0;
    const bodyStart = headingIndex + heading[0].length;
    const bodyEnd = index + 1 < headings.length
      ? (headings[index + 1].index ?? normalized.length)
      : normalized.length;
    const body = normalized.slice(bodyStart, bodyEnd).trim();
    // Preserve even short chapters such as a copyright page or an author's note.
    chapters.push({ title: heading[1].trim(), content: body });
  });

  return chapters.length ? chapters : [{ title: 'Full Book', content: normalized }];
}
