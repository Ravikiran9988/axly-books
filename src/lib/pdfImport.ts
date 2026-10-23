import { inflateSync } from 'node:zlib';

export interface ExtractedPdfChapter {
  title: string;
  text: string;
  wordCount: number;
  estimatedReadingTimeMinutes: number;
}

type PdfObject = { id: number; body: string };
type CMap = Map<string, string>;

function decodeStream(body: string): string {
  const start = /stream(?:\r\n|\n|\r)/.exec(body);
  if (!start) return '';
  const from = start.index + start[0].length;
  const to = body.indexOf('endstream', from);
  if (to < 0) return '';
  const encoded = body.slice(from, to).replace(/(?:\r\n|\n|\r)+$/, '');
  if (/\/FlateDecode\b/.test(body.slice(0, start.index))) {
    try { return inflateSync(Buffer.from(encoded, 'latin1')).toString('latin1'); }
    catch { return ''; }
  }
  return encoded;
}

function unicodeFromHex(value: string): string {
  let result = '';
  const hex = value.replace(/\s/g, '');
  for (let i = 0; i + 3 < hex.length; i += 4) result += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return result;
}

function readCMap(source: string): CMap {
  const result: CMap = new Map();
  for (const block of source.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>/gi)) result.set(pair[1].toUpperCase(), unicodeFromHex(pair[2]));
  }
  for (const block of source.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const match of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*(<([0-9a-f]+)>|\[([^\]]*)\])/gi)) {
      const first = parseInt(match[1], 16);
      const last = parseInt(match[2], 16);
      if (!Number.isFinite(first) || !Number.isFinite(last) || last < first || last - first > 2048) continue;
      if (match[4]) {
        const dest = parseInt(match[4], 16);
        for (let n = first; n <= last; n++) {
          result.set(n.toString(16).toUpperCase().padStart(match[1].length, '0'),
            unicodeFromHex((dest + n - first).toString(16).toUpperCase().padStart(match[4].length, '0')));
        }
      } else {
        const dests = [...(match[5] ?? '').matchAll(/<([0-9a-f]+)>/gi)].map((m) => m[1]);
        for (let n = 0; n < dests.length && n <= last - first; n++) {
          result.set((first + n).toString(16).toUpperCase().padStart(match[1].length, '0'), unicodeFromHex(dests[n]));
        }
      }
    }
  }
  return result;
}

function fallbackByte(value: number): string {
  const windows: Record<number, string> = {
    128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡',
    136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž', 145: '‘',
    146: '’', 147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜',
    153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ',
  };
  return windows[value] ?? String.fromCharCode(value);
}

function decodeByteSequence(bytes: number[], cmap: CMap): string {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let value = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) value += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return value;
  }
  const widths = [...new Set([...cmap.keys()].map((key) => key.length))].sort((a, b) => b - a);
  let output = '';
  for (let i = 0; i < bytes.length;) {
    let found = false;
    for (const width of widths) {
      const count = width / 2;
      if (i + count > bytes.length) continue;
      const key = bytes.slice(i, i + count).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const mapped = cmap.get(key);
      if (mapped !== undefined) { output += mapped; i += count; found = true; break; }
    }
    if (!found) { output += fallbackByte(bytes[i]); i++; }
  }
  return output;
}

function decodeHex(value: string, cmap: CMap): string {
  const hex = value.replace(/\s/g, '');
  const bytes: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  if (hex.length % 2) bytes.push(parseInt(hex.slice(-1) + '0', 16));
  return decodeByteSequence(bytes, cmap);
}

function decodeLiteral(value: string, cmap: CMap): string {
  const input = value.slice(1, -1);
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== '\\') { bytes.push(input.charCodeAt(i) & 255); continue; }
    const next = input[++i];
    if (next === undefined) break;
    const simple: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
    if (next in simple) bytes.push(simple[next]);
    else if (next === '\n') continue;
    else if (next === '\r') { if (input[i + 1] === '\n') i++; }
    else if (/[0-7]/.test(next)) {
      let digits = next;
      for (let j = 0; j < 2 && /[0-7]/.test(input[i + 1] ?? ''); j++) digits += input[++i];
      bytes.push(parseInt(digits, 8) & 255);
    } else bytes.push(next.charCodeAt(0) & 255);
  }
  return decodeByteSequence(bytes, cmap);
}

function textFromStream(stream: string, fonts: Map<string, CMap>): string {
  const parts: string[] = [];
  let font = '';
  const operators = /\/([A-Za-z0-9_.+#-]+)\s+[-+]?(?:\d*\.)?\d+\s+Tf|(\((?:\\.|[^\\)])*\))\s*Tj|(<[0-9a-f\s]+>)\s*Tj|(\[[\s\S]*?\])\s*TJ|(?:[-+]?(?:\d*\.)?\d+\s+){1,2}(?:Td|TD)|\bT\*|\bET\b/gi;
  for (const match of stream.matchAll(operators)) {
    const token = match[0];
    if (match[1]) { font = match[1]; continue; }
    if (/\b(?:Td|TD|T\*|ET)\b/.test(token)) { if (parts.length && parts[parts.length - 1] !== '\n') parts.push('\n'); continue; }
    const cmap = fonts.get(font) ?? new Map<string, string>();
    if (match[2]) parts.push(decodeLiteral(match[2], cmap));
    else if (match[3]) parts.push(decodeHex(match[3].slice(1, -1), cmap));
    else if (match[4]) {
      const tokens = match[4].slice(1, -1).matchAll(/\((?:\\.|[^\\)])*\)|<[0-9a-f\s]+>|[-+]?(?:\d*\.)?\d+/gi);
      for (const part of tokens) {
        if (part[0].startsWith('(')) parts.push(decodeLiteral(part[0], cmap));
        else if (part[0].startsWith('<')) parts.push(decodeHex(part[0].slice(1, -1), cmap));
        else if (Number(part[0]) < -120) parts.push(' ');
      }
    }
  }
  return parts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function getRefs(value: string): number[] {
  return [...value.matchAll(/(\d+)\s+\d+\s+R/g)].map((match) => Number(match[1]));
}

function findDictionary(value: string, offset: number): string {
  const start = value.indexOf('<<', offset);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < value.length - 1; i++) {
    if (value.slice(i, i + 2) === '<<') { depth++; i++; }
    else if (value.slice(i, i + 2) === '>>') { depth--; i++; if (!depth) return value.slice(start, i + 1); }
  }
  return '';
}

function pageResources(page: string, objects: Map<number, PdfObject>): string {
  let body = page;
  const seen = new Set<number>();
  while (body) {
    const reference = /\/Resources\s+(\d+)\s+\d+\s+R/.exec(body);
    if (reference) return objects.get(Number(reference[1]))?.body ?? '';
    const offset = body.indexOf('/Resources');
    if (offset >= 0) return findDictionary(body, offset);
    const parent = /\/Parent\s+(\d+)\s+\d+\s+R/.exec(body);
    if (!parent || seen.has(Number(parent[1]))) break;
    seen.add(Number(parent[1]));
    body = objects.get(Number(parent[1]))?.body ?? '';
  }
  return '';
}

function pageFonts(page: string, objects: Map<number, PdfObject>): Map<string, CMap> {
  const result = new Map<string, CMap>();
  const resources = pageResources(page, objects);
  const fontRef = /\/Font\s+(\d+)\s+\d+\s+R/.exec(resources);
  const fontDict = fontRef ? objects.get(Number(fontRef[1]))?.body ?? '' : findDictionary(resources, resources.indexOf('/Font'));
  for (const entry of fontDict.matchAll(/\/([A-Za-z0-9_.+#-]+)\s+(\d+)\s+\d+\s+R/g)) {
    const font = objects.get(Number(entry[2]))?.body ?? '';
    const cmapRef = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(font);
    result.set(entry[1], cmapRef ? readCMap(decodeStream(objects.get(Number(cmapRef[1]))?.body ?? '')) : new Map<string, string>());
  }
  return result;
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/([A-Za-z])-\n([a-z])/g, '$1$2')
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => !/^(?:page\s+)?\d{1,4}$/i.test(line))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractPdfPages(buffer: Buffer): string[] {
  const source = buffer.toString('latin1');
  if (!source.startsWith('%PDF-')) throw new Error('This file does not have a valid PDF signature.');
  if (/\/Encrypt\b/.test(source.slice(0, 100_000))) throw new Error('Encrypted PDFs are not supported. Upload an unlocked PDF.');

  const objects = new Map<number, PdfObject>();
  for (const match of source.matchAll(/(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj/g)) {
    objects.set(Number(match[1]), { id: Number(match[1]), body: match[2] });
  }
  const pages = [...objects.values()].filter((object) => /\/Type\s*\/Page\b/.test(object.body));
  if (!pages.length) throw new Error('No readable PDF pages were found. The file may use a PDF object structure this importer cannot parse.');
  if (pages.length > 600) throw new Error('This PDF is larger than the 600-page import limit. Split it into smaller files.');

  return pages.map((page) => {
    const fonts = pageFonts(page.body, objects);
    const content = /\/Contents\s*(\[[\s\S]*?\]|\d+\s+\d+\s+R)/.exec(page.body);
    const ids = getRefs(content?.[1] ?? '');
    return normalizeText(ids.map((id) => textFromStream(decodeStream(objects.get(id)?.body ?? ''), fonts)).filter(Boolean).join('\n\n'));
  });
}

function isHeading(line: string): boolean {
  const value = line.trim();
  if (value.length < 4 || value.length > 140) return false;
  if (/^(?:chapter|chap\.?|unit|module|lesson|day|part|section)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(value)) return true;
  return /^\d{1,2}\s*[.):]\s+[A-Z][A-Za-z0-9 ,:;'"’()&/-]{4,100}$/.test(value);
}

function createChapter(title: string, raw: string): ExtractedPdfChapter | null {
  const text = normalizeText(raw);
  if (text.length < 40) return null;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { title: title.slice(0, 200), text, wordCount, estimatedReadingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)) };
}

function toSlug(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'imported';
}

export function slugifyImportedChapter(title: string, number: number): string {
  return 'chapter-' + number + '-' + toSlug(title).slice(0, 80);
}

export function splitPdfIntoChapters(pages: string[]): ExtractedPdfChapter[] {
  const normalized = pages.map(normalizeText);
  const lines = normalized.join('\n\n').split('\n');
  const starts: Array<{ index: number; title: string }> = [];
  lines.forEach((line, index) => { if (isHeading(line)) starts.push({ index, title: line.trim() }); });

  const result: ExtractedPdfChapter[] = [];
  if (starts.length >= 2) {
    const introduction = createChapter('Introduction', lines.slice(0, starts[0].index).join('\n'));
    if (introduction && introduction.wordCount >= 100) result.push(introduction);
    starts.forEach((heading, index) => {
      const end = starts[index + 1]?.index ?? lines.length;
      const chapter = createChapter(heading.title, lines.slice(heading.index + 1, end).join('\n'));
      if (chapter) result.push(chapter);
    });
  }

  if (!result.length) {
    const nonEmpty = normalized.map((text, index) => ({ text, index })).filter((page) => page.text.length > 0);
    if (!nonEmpty.length) throw new Error('No selectable text was found. This appears to be a scanned/image-only PDF; OCR is not configured in this importer yet. Run OCR or export a searchable PDF, then upload it again.');
    const pagesPerPart = Math.max(8, Math.ceil(nonEmpty.length / 12));
    for (let offset = 0; offset < nonEmpty.length; offset += pagesPerPart) {
      const batch = nonEmpty.slice(offset, offset + pagesPerPart);
      const title = nonEmpty.length <= pagesPerPart ? 'Imported Content' : 'Imported Part ' + (result.length + 1) + ' (pages ' + (batch[0].index + 1) + '–' + (batch[batch.length - 1].index + 1) + ')';
      const chapter = createChapter(title, batch.map((page) => page.text).join('\n\n'));
      if (chapter) result.push(chapter);
    }
  }
  if (!result.length) throw new Error('The PDF text could not be converted to chapters. Try exporting it again from the original document.');
  if (result.length > 80) throw new Error('More than 80 chapters were detected. Split the PDF into smaller files.');
  return result;
}
