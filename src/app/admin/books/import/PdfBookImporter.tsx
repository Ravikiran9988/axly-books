'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { ArrowLeft, FileUp, LoaderCircle, Plus, Trash2, UploadCloud } from 'lucide-react';
import styles from '../../admin.module.css';

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (options: { data: Uint8Array }) => { promise: Promise<{
        numPages: number;
        getPage: (page: number) => Promise<{
          getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
        }>;
      }> };
    };
  }
}

type DraftChapter = { title: string; content: string };
type Notice = { type: 'success' | 'error' | 'info'; text: string };

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

function loadPdfJs(): Promise<NonNullable<Window['pdfjsLib']>> {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-axly-pdfjs]');
    const finish = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else reject(new Error('The PDF reader library did not load. Check your connection and try again.'));
    };
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load the PDF reader library.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.dataset.axlyPdfjs = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Could not load the PDF reader library. Check your internet connection.'));
    document.head.appendChild(script);
  });
}

function cleanExtractedText(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
  const frequency = new Map<string, number>();
  lines.filter(Boolean).forEach((line) => { if (line.length <= 90) frequency.set(line, (frequency.get(line) ?? 0) + 1); });
  return lines.filter((line) => {
    if (!line || /^\s*(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i.test(line)) return false;
    if (line.length <= 90 && (frequency.get(line) ?? 0) >= 4) return false;
    return true;
  }).join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitIntoChapters(text: string): DraftChapter[] {
  const normalized = cleanExtractedText(text);
  const lines = normalized.split('\n');
  const headingPattern = /^\s*((?:chapter|unit|lesson|part|section)\s+(?:(?:no\.?\s*)?\d+[a-z]?|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b[^\n]{0,140}|(?:introduction|preface|foreword|prologue|conclusion|epilogue|appendix(?:\s+[a-z0-9]+)?|acknowledgements?|references|bibliography|about the author|getting started|final thoughts|exercises|solutions))\s*[:.]?\s*$/i;
  const starts: Array<{ index: number; title: string }> = [];
  lines.forEach((line, index) => { const trimmed = line.trim(); if (trimmed && trimmed.length <= 150 && headingPattern.test(trimmed)) starts.push({ index, title: trimmed }); });
  const counts = new Map<string, number>();
  starts.forEach(({ title }) => counts.set(title.toLowerCase(), (counts.get(title.toLowerCase()) ?? 0) + 1));
  const unique = starts.filter((entry, index) => (index === 0 || entry.index !== starts[index - 1].index) && counts.get(entry.title.toLowerCase()) === 1);
  if (!unique.length) return [{ title: 'Full Book', content: normalized }];
  const result: DraftChapter[] = [];
  if (unique[0].index > 0) { const frontMatter = lines.slice(0, unique[0].index).join('\n').trim(); if (frontMatter.length > 250) result.push({ title: 'Introduction', content: frontMatter }); }
  unique.forEach((heading, index) => {
    const end = unique[index + 1]?.index ?? lines.length;
    const body = lines.slice(heading.index + 1, end).join('\n').trim();
    if (body.length > 30) result.push({ title: heading.title.replace(/[:.]$/, ''), content: body });
  });
  return result.length ? result : [{ title: 'Full Book', content: normalized }];
}
export default function PdfBookImporter() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [needsOcr, setNeedsOcr] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [book, setBook] = useState({
    title: '', slug: '', subtitle: '', description: '', synopsis: '',
    category: 'General', tags: '', edition: 'First Edition (2026)',
    publishedYear: new Date().getFullYear(), coverImageUrl: '/images/ml-deep-learning-cover.jpg',
    isPublished: false, allowPdfDownload: false,
  });

  const totalCharacters = useMemo(() => chapters.reduce((sum, chapter) => sum + chapter.content.length, 0), [chapters]);

  const updateBook = (field: keyof typeof book, value: string | number | boolean) => {
    setBook((previous) => ({ ...previous, [field]: value }));
  };

  async function extractPdf(selectedFile: File, useOcr = false) {
    if (selectedFile.size > 25 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'PDF must be 25 MB or smaller.' });
      return;
    }
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setNotice({ type: 'error', text: 'Choose a PDF file.' });
      return;
    }
    setFile(selectedFile);
    setChapters([]);
    setNeedsOcr(false);
    const defaultTitle = selectedFile.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    setBook((previous) => ({
      ...previous,
      title: previous.title || defaultTitle,
      slug: previous.slug || slugify(defaultTitle),
      description: previous.description || `A free digital book: ${defaultTitle}.`,
      synopsis: previous.synopsis || `Read ${defaultTitle} online for free on AXLY Books.`,
    }));
    setIsExtracting(true);
    setProgress('Loading PDF reader…');
    setNotice(null);
    try {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await selectedFile.arrayBuffer()) }).promise;
      const pageTexts: string[] = [];
      let pagesWithText = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setProgress(`Extracting text from page ${pageNumber} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const items = textContent.items.filter((item) => typeof item.str === 'string' && item.str.trim());
        const grouped: Array<{ y: number; text: string }> = [];
        for (const item of items) {
          const y = item.transform?.[5] ?? 0;
          const previousLine = grouped.find((line) => Math.abs(line.y - y) < 3);
          if (previousLine) previousLine.text += ` ${item.str}`;
          else grouped.push({ y, text: item.str || '' });
        }
        grouped.sort((a, b) => b.y - a.y);
        const pageText = grouped.map((line) => line.text.trim()).filter(Boolean).join('\n');
        pageTexts.push(pageText);
        if (pageText.length > 20) pagesWithText += 1;
      }
      let extractedText = pageTexts.join('\n\n').trim();
      if (useOcr || extractedText.length < 100 || pagesWithText < Math.max(1, Math.ceil(pdf.numPages * 0.25))) {
        const tesseract = await loadTesseract();
        const ocrTexts: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          setProgress(`OCR scanning page ${pageNumber} of ${pdf.numPages}…`);
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Your browser could not prepare a canvas for OCR.');
          await page.render({ canvasContext: context, viewport }).promise;
          const result = await tesseract.recognize(canvas, 'eng', {
            logger: (message) => { if (message.status === 'recognizing text' && typeof message.progress === 'number') setProgress(`OCR page ${pageNumber}/${pdf.numPages}: ${Math.round(message.progress * 100)}%…`); },
          });
          ocrTexts.push(result.data.text.trim());
          canvas.width = 0; canvas.height = 0;
        }
        const ocrText = ocrTexts.filter(Boolean).join('\n\n');
        if (ocrText.length > extractedText.length) extractedText = ocrText;
      }
      if (extractedText.length < 100) {
        setNeedsOcr(true);
        setNotice({ type: 'error', text: 'Not enough text could be recovered. The PDF may be low quality, protected, or use a language other than English. Try a clearer or searchable PDF.' });
        setProgress(''); return;
      }
      const detected = splitIntoChapters(extractedText);
      setChapters(detected);
      setProgress('');
      setNotice({ type: 'info', text: `Extracted ${extractedText.length.toLocaleString()} characters from ${pdf.numPages} pages and detected ${detected.length} chapter section(s). Page numbers and repeated short headers/footers were filtered heuristically. Review every chapter before importing.` });
    } catch (error) {
      setNeedsOcr(true);
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Could not read this PDF.' });
      setProgress('');
    } finally {
      setIsExtracting(false);
    }
  }

  function updateChapter(index: number, field: keyof DraftChapter, value: string) {
    setChapters((previous) => previous.map((chapter, current) => current === index ? { ...chapter, [field]: value } : chapter));
  }

  function removeChapter(index: number) {
    setChapters((previous) => previous.filter((_, current) => current !== index));
  }

  function addChapter() {
    setChapters((previous) => [...previous, { title: `Chapter ${previous.length + 1}`, content: '' }]);
  }

  async function importBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || chapters.length === 0) {
      setNotice({ type: 'error', text: 'Choose a PDF and extract its text before importing.' });
      return;
    }
    if (chapters.some((chapter) => chapter.title.trim().length < 2 || chapter.content.trim().length < 30)) {
      setNotice({ type: 'error', text: 'Each chapter needs a title and at least 30 characters of content.' });
      return;
    }
    if (chapters.length > 100 || totalCharacters > 1_000_000) {
      setNotice({ type: 'error', text: 'The import limit is 100 chapters and 1,000,000 extracted characters. Split larger books into smaller PDFs.' });
      return;
    }
    setIsImporting(true);
    setNotice(null);
    try {
      const payload = {
        title: book.title.trim(), slug: slugify(book.slug), subtitle: book.subtitle.trim(),
        description: book.description.trim(), synopsis: book.synopsis.trim(),
        category: book.category.trim(), tags: book.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        edition: book.edition.trim(), publishedYear: Number(book.publishedYear),
        coverImageUrl: book.coverImageUrl.trim(), isPublished: book.isPublished,
        allowPdfDownload: book.allowPdfDownload, isFree: true, status: book.isPublished ? 'Available Free' : 'Draft',
        authorName: 'Slayer',
      };
      const chapterPayload = chapters.map((chapter, index) => {
        const content = chapter.content.trim();
        const words = content.split(/\s+/).filter(Boolean).length;
        return {
          chapterNumber: index + 1,
          title: chapter.title.trim(),
          slug: `${slugify(chapter.title).slice(0, 108) || 'chapter'}-${index + 1}`,
          summary: content.slice(0, 180).trim().slice(0, 175) + (content.length > 175 ? '…' : ''),
          content: [{ title: chapter.title.trim(), content }],
          estimatedReadingTimeMinutes: Math.max(1, Math.ceil(words / 220)),
          isPublished: book.isPublished,
        };
      });
      setProgress('Uploading PDF directly to storage…');
      const uploaded = await upload(
        `books/originals/${slugify(file.name.replace(/\\.pdf$/i, '')).slice(0, 70) || 'book'}.pdf`,
        file,
        {
          access: 'public',
          handleUploadUrl: '/api/admin/books/upload',
          clientPayload: JSON.stringify({ purpose: 'book-original-pdf' }),
          onUploadProgress: ({ percentage }) => setProgress(`Uploading PDF… ${Math.round(percentage)}%`),
        },
      );
      setProgress('Saving book and chapters…');
      const response = await fetch('/api/admin/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: payload, chapters: chapterPayload, originalPdfUrl: uploaded.url }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Book import failed.');
      setNotice({ type: 'success', text: result.message || 'Book imported successfully.' });
      setProgress('');
      router.push(`/admin/books/${result.bookId}/chapters`);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Book import failed.' });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div>
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <Link href="/admin/books" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ArrowLeft size={15} /> Back to Books
          </Link>
          <h1 className={styles.pageTitle}>Import a Book from PDF</h1>
          <p className={styles.pageDesc}>Upload your existing manuscript, extract selectable text, review chapter splits, and import it without retyping.</p>
        </div>
      </header>

      {notice && <div role="status" className={`${styles.alertBox} ${notice.type === 'error' ? styles.alertError : styles.alertSuccess}`} style={{ marginBottom: 20 }}>{notice.text}</div>}

      <form onSubmit={importBook}>
        <section className={styles.modalContent} style={{ maxWidth: 'none', marginBottom: 24 }}>
          <h2 className={styles.modalTitle}>1. Choose your PDF</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>PDF only · Maximum 25 MB · Text extraction runs in your browser. Import uploads directly to Blob storage to avoid server request-size limits. Original PDFs use public Blob URLs; disabling the download link does not make the URL private.</p>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void extractPdf(selected); }} disabled={isExtracting || isImporting} style={{ display: 'none' }} />
          <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={isExtracting || isImporting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            {isExtracting ? <LoaderCircle size={17} className="animate-spin" /> : <FileUp size={17} />}
            {file ? 'Choose a different PDF' : 'Select PDF'}
          </button>
          {file && <p style={{ marginTop: 12, fontWeight: 600 }}>{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
          {progress && <p style={{ marginTop: 12 }}><LoaderCircle size={15} style={{ display: 'inline', marginRight: 6 }} />{progress}</p>}
        </section>

        <section className={styles.modalContent} style={{ maxWidth: 'none', marginBottom: 24 }}>
          <h2 className={styles.modalTitle}>2. Book details</h2>
          <div className={styles.formGrid} style={{ marginTop: 16 }}>
            <label className={styles.formGroup}>Book title<input required minLength={2} maxLength={150} value={book.title} onChange={(e) => { updateBook('title', e.target.value); if (!book.slug) updateBook('slug', slugify(e.target.value)); }} /></label>
            <label className={styles.formGroup}>URL slug<input required value={book.slug} onChange={(e) => updateBook('slug', slugify(e.target.value))} /></label>
            <label className={styles.formGroup}>Subtitle<input value={book.subtitle} maxLength={200} onChange={(e) => updateBook('subtitle', e.target.value)} /></label>
            <label className={styles.formGroup}>Category<input required value={book.category} onChange={(e) => updateBook('category', e.target.value)} /></label>
            <label className={styles.formGroup}>Tags (comma-separated)<input value={book.tags} onChange={(e) => updateBook('tags', e.target.value)} /></label>
            <label className={styles.formGroup}>Edition<input required value={book.edition} onChange={(e) => updateBook('edition', e.target.value)} /></label>
            <label className={styles.formGroup}>Publication year<input type="number" min={2000} max={2100} required value={book.publishedYear} onChange={(e) => updateBook('publishedYear', Number(e.target.value))} /></label>
            <label className={styles.formGroup}>Cover image URL<input required value={book.coverImageUrl} onChange={(e) => updateBook('coverImageUrl', e.target.value)} /></label>
            <label className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>Description<textarea required minLength={10} rows={3} value={book.description} onChange={(e) => updateBook('description', e.target.value)} /></label>
            <label className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>Synopsis<textarea required minLength={10} rows={3} value={book.synopsis} onChange={(e) => updateBook('synopsis', e.target.value)} /></label>
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={book.isPublished} onChange={(e) => updateBook('isPublished', e.target.checked)} /> Publish immediately (otherwise save as draft)</label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={book.allowPdfDownload} onChange={(e) => updateBook('allowPdfDownload', e.target.checked)} /> Allow readers to download the original PDF</label>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Author is set to Slayer. Keep publication disabled until you have reviewed the extracted content.</p>
        </section>

        <section className={styles.modalContent} style={{ maxWidth: 'none', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 className={styles.modalTitle}>3. Review extracted chapters</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>{chapters.length} chapters · {totalCharacters.toLocaleString()} characters</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addChapter} disabled={chapters.length >= 100}><Plus size={15} /> Add chapter</button>
          </div>
          {chapters.length === 0 ? <p style={{ marginTop: 18, color: 'var(--text-muted)' }}>Select a PDF to extract its text. Scanned/image-only PDFs need OCR before importing.</p> : (
            <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
              {chapters.map((chapter, index) => (
                <article key={index} style={{ border: '1px solid var(--border-subtle, #ddd)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <strong>Chapter {index + 1}</strong>
                    <button type="button" className={styles.btnAction} onClick={() => removeChapter(index)} aria-label={`Remove chapter ${index + 1}`}><Trash2 size={15} /> Remove</button>
                  </div>
                  <label className={styles.formGroup}>Chapter title<input required minLength={2} value={chapter.title} onChange={(e) => updateChapter(index, 'title', e.target.value)} /></label>
                  <label className={styles.formGroup} style={{ marginTop: 12 }}>Extracted text<textarea required rows={10} value={chapter.content} onChange={(e) => updateChapter(index, 'content', e.target.value)} /></label>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{chapter.content.length.toLocaleString()} characters · Edit out page numbers and headers/footers as needed.</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin/books" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={!file || chapters.length === 0 || isExtracting || isImporting} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {isImporting ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {isImporting ? 'Uploading & importing…' : 'Import Book'}
          </button>
        </div>
      </form>
    </div>
  );
}
