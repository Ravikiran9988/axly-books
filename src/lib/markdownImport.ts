export interface MarkdownChapterDraft {
  title: string;
  content: string;
}

interface MarkdownHeading {
  level: 1 | 2;
  title: string;
  start: number;
  bodyStart: number;
}

function findMarkdownHeadings(source: string): MarkdownHeading[] {
  const lines = source.split('\n');
  const headings: MarkdownHeading[] = [];
  let offset = 0;
  let fenceCharacter: '`' | '~' | null = null;
  let fenceLength = 0;

  for (const line of lines) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const character = fence[1][0] as '`' | '~';
      if (!fenceCharacter) {
        fenceCharacter = character;
        fenceLength = fence[1].length;
      } else if (character === fenceCharacter && fence[1].length >= fenceLength) {
        fenceCharacter = null;
        fenceLength = 0;
      }
      offset += line.length + 1;
      continue;
    }

    if (!fenceCharacter) {
      const heading = /^ {0,3}(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        headings.push({
          level: heading[1].length as 1 | 2,
          title: heading[2].trim(),
          start: offset,
          bodyStart: offset + line.length + 1,
        });
      }
    }
    offset += line.length + 1;
  }
  return headings;
}

/**
 * Split a single Markdown manuscript into reader chapters without rewriting its content.
 * H1 headings take priority; if the manuscript has no H1 headings, H2 headings are used.
 * Fenced code blocks are ignored while finding headings. If there are no headings,
 * the entire manuscript becomes one full-book section.
 */
function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Split a single Markdown manuscript into reader chapters without rewriting its content.
 * H1 headings take priority, unless the only H1 is the document title matching bookTitle;
 * in that case H2 headings provide chapter boundaries. Fenced code is ignored while
 * detecting headings. If there are no headings, keep the whole manuscript as one section.
 */
export function splitMarkdownIntoChapters(markdown: string, bookTitle?: string): MarkdownChapterDraft[] {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const allHeadings = findMarkdownHeadings(normalized);
  const levelOne = allHeadings.filter((heading) => heading.level === 1);
  const levelTwo = allHeadings.filter((heading) => heading.level === 2);
  const onlyH1IsDocumentTitle = levelOne.length === 1
    && Boolean(bookTitle?.trim())
    && normalizeTitle(levelOne[0].title) === normalizeTitle(bookTitle!);

  let headings: MarkdownHeading[];
  let contentStart = 0;
  if (onlyH1IsDocumentTitle) {
    contentStart = levelOne[0].bodyStart;
    headings = levelTwo;
    if (!headings.length) {
      const content = normalized.slice(contentStart).trim();
      return [{ title: 'Full Book', content: content || normalized }];
    }
  } else {
    headings = levelOne.length ? levelOne : levelTwo;
  }

  if (!headings.length) {
    return [{ title: 'Full Book', content: normalized }];
  }

  const chapters: MarkdownChapterDraft[] = [];
  const frontMatter = normalized.slice(contentStart, headings[0].start).trim();
  if (frontMatter) chapters.push({ title: 'Introduction', content: frontMatter });

  headings.forEach((heading, index) => {
    const nextHeadingStart = headings[index + 1]?.start ?? normalized.length;
    const body = normalized.slice(heading.bodyStart, nextHeadingStart).trim();
    // Preserve even short chapters such as a copyright page or an author's note.
    chapters.push({ title: heading.title, content: body });
  });

  return chapters.length ? chapters : [{ title: 'Full Book', content: normalized }];
}
