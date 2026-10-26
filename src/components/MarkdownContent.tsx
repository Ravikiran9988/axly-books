import React, { type ReactNode } from 'react';

type Block =
  | { type: 'heading'; level: number; text: string; key: number }
  | { type: 'paragraph'; text: string; key: number }
  | { type: 'quote'; text: string; key: number }
  | { type: 'ul' | 'ol'; items: string[]; key: number }
  | { type: 'code'; language: string; text: string; key: number }
  | { type: 'hr'; key: number }
  | { type: 'table'; headers: string[]; rows: string[][]; key: number };

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let escaped = false;
  for (const character of trimmed) {
    if (character === '|' && !escaped) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
    if (character === '\\' && !escaped) escaped = true;
    else escaped = false;
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) { index++; continue; }

    const fence = /^\s*\x60\x60\x60\s*([\w.+-]*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1] || 'text';
      const code: string[] = [];
      index++;
      while (index < lines.length && !/^\s*\x60\x60\x60\s*$/.test(lines[index])) {
        code.push(lines[index++]);
      }
      if (index < lines.length) index++;
      blocks.push({ type: 'code', language, text: code.join('\n'), key: key++ });
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(trimmed);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2], key: key++ });
      index++;
      continue;
    }

    // GitHub-flavoured Markdown tables.
    if (index + 1 < lines.length && line.includes('|') && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        const cells = splitTableRow(lines[index++]);
        rows.push(headers.map((_, cellIndex) => cells[cellIndex] ?? ''));
      }
      blocks.push({ type: 'table', headers, rows, key: key++ });
      continue;
    }

    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
      blocks.push({ type: 'hr', key: key++ });
      index++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index++].replace(/^\s*>\s?/, ''));
      }
      blocks.push({ type: 'quote', text: quote.join('\n'), key: key++ });
      continue;
    }

    const isOrdered = /^\s*\d+[.)]\s+/.test(line);
    const isUnordered = /^\s*[-*+]\s+/.test(line);
    if (isOrdered || isUnordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index];
        const match = isOrdered
          ? /^\s*\d+[.)]\s+(.+)$/.exec(itemLine)
          : /^\s*[-*+]\s+(.+)$/.exec(itemLine);
        if (!match) break;
        items.push(match[1]);
        index++;
      }
      blocks.push({ type: isOrdered ? 'ol' : 'ul', items, key: key++ });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (paragraph.length > 0 && (
        /^\s*\x60\x60\x60/.test(lines[index]) ||
        /^\s*#{1,6}\s+/.test(lines[index]) ||
        /^\s*>/.test(lines[index]) ||
        /^\s*[-*+]\s+/.test(lines[index]) ||
        /^\s*\d+[.)]\s+/.test(lines[index]) ||
        /^([-*_])(?:\s*\1){2,}\s*$/.test(lines[index].trim())
      )) break;
      paragraph.push(lines[index].trimEnd());
      index++;
    }
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join('\n'), key: key++ });
    else index++;
  }

  return blocks;
}

function safeHref(candidate: string): string | null {
  try {
    const url = new URL(candidate, 'https://axly.invalid');
    if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:') return candidate;
  } catch {
    return null;
  }
  return null;
}

/** Inline Markdown is converted to React elements; raw HTML is never executed. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\x60([^\x60]+)\x60|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(...renderTextWithBreaks(text.slice(lastIndex, match.index), keyPrefix + '-' + tokenIndex++));
    }
    const key = keyPrefix + '-' + tokenIndex++;
    if (match[1] !== undefined && match[2] !== undefined) {
      const href = safeHref(match[2]);
      result.push(href
        ? <a key={key} href={href} rel="noopener noreferrer" target="_blank">{match[1]}</a>
        : <span key={key}>{match[1]}</span>);
    } else if (match[3] !== undefined) {
      result.push(<code key={key} style={{ padding: '0.08em 0.3em', borderRadius: '0.25rem', background: 'var(--reader-code-bg, rgba(127,127,127,0.12))', fontSize: '0.9em' }}>{match[3]}</code>);
    } else if (match[4] !== undefined || match[5] !== undefined) {
      result.push(<strong key={key}>{match[4] ?? match[5]}</strong>);
    } else if (match[6] !== undefined || match[7] !== undefined) {
      result.push(<em key={key}>{match[6] ?? match[7]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push(...renderTextWithBreaks(text.slice(lastIndex), keyPrefix + '-' + tokenIndex));
  }
  return result;
}

function renderTextWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  return text.split('\n').flatMap((part, index) => index === 0
    ? [part]
    : [<br key={keyPrefix + '-br-' + index} />, part]);
}

export default function MarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return <div className="axly-markdown-content">
    {blocks.map((block) => {
      const key = 'md-' + block.key;
      if (block.type === 'heading') {
        const style = { margin: '1.4em 0 0.5em', lineHeight: 1.3 } as const;
        const children = renderInline(block.text, key);
        switch (block.level) {
          case 1: return <h1 key={key} style={style}>{children}</h1>;
          case 2: return <h2 key={key} style={style}>{children}</h2>;
          case 3: return <h3 key={key} style={style}>{children}</h3>;
          case 4: return <h4 key={key} style={style}>{children}</h4>;
          case 5: return <h5 key={key} style={style}>{children}</h5>;
          default: return <h6 key={key} style={style}>{children}</h6>;
        }
      }
      if (block.type === 'paragraph') {
        return <p key={key} style={{ margin: '0 0 1em', whiteSpace: 'normal' }}>{renderInline(block.text, key)}</p>;
      }
      if (block.type === 'quote') {
        return <blockquote key={key} style={{ margin: '1em 0', padding: '0.25em 1em', borderLeft: '3px solid var(--color-brand-cyan, #0891b2)', opacity: 0.9 }}>
          {block.text.split('\n').map((line, index) => <p key={index} style={{ margin: '0.35em 0' }}>{renderInline(line, key + '-' + index)}</p>)}
        </blockquote>;
      }
      if (block.type === 'ul' || block.type === 'ol') {
        const ListTag = block.type === 'ul' ? 'ul' : 'ol';
        return <ListTag key={key} style={{ margin: '0 0 1em', paddingLeft: '1.6em' }}>
          {block.items.map((item, index) => <li key={index} style={{ paddingLeft: '0.2em', marginBottom: '0.25em' }}>{renderInline(item, key + '-' + index)}</li>)}
        </ListTag>;
      }
      if (block.type === 'table') {
        const cellStyle: React.CSSProperties = {
          border: '1px solid var(--border-subtle, rgba(127,127,127,0.3))',
          padding: '0.55em 0.7em',
          textAlign: 'left',
          verticalAlign: 'top',
        };
        return <div key={key} style={{ margin: '1em 0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead><tr>{block.headers.map((header, index) =>
              <th key={index} scope="col" style={{ ...cellStyle, fontWeight: 700, background: 'var(--reader-code-bg, rgba(127,127,127,0.08))' }}>
                {renderInline(header, key + '-head-' + index)}
              </th>
            )}</tr></thead>
            <tbody>{block.rows.map((row, rowIndex) =>
              <tr key={rowIndex}>{row.map((cell, cellIndex) =>
                <td key={cellIndex} style={cellStyle}>{renderInline(cell, key + '-' + rowIndex + '-' + cellIndex)}</td>
              )}</tr>
            )}</tbody>
          </table>
        </div>;
      }
      if (block.type === 'code') {
        return <div key={key} style={{ margin: '1em 0' }}>
          <div style={{ fontSize: '0.75em', color: 'var(--reader-subtle, #666)', marginBottom: '0.35em' }}>{block.language}</div>
          <pre style={{ whiteSpace: 'pre', overflowX: 'auto', padding: '1em', borderRadius: '0.6rem', background: 'var(--reader-code-bg, rgba(127,127,127,0.12))', fontSize: '0.85em' }}><code>{block.text}</code></pre>
        </div>;
      }
      return <hr key={key} style={{ margin: '1.5em 0', opacity: 0.35 }} />;
    })}
  </div>;
}
