'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import styles from '../../admin.module.css';

interface ImportedChapter {
  id: string; chapterNumber: number; title: string; slug: string; summary: string;
  estimatedReadingTimeMinutes: number; wordCount: number;
}
interface ImportResult {
  success: boolean;
  book: { id: string; slug: string; title: string; allowPdfDownload: boolean; isPublished: boolean };
  pageCount: number; importedTextCharacters: number; chapters: ImportedChapter[]; message: string;
}
function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function PdfImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Technology');
  const [description, setDescription] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [edition, setEdition] = useState('First Edition (2026)');
  const [publishedYear, setPublishedYear] = useState(String(new Date().getFullYear()));
  const [tags, setTags] = useState('');
  const [allowPdfDownload, setAllowPdfDownload] = useState(false);
  const [license, setLicense] = useState('All Rights Reserved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFileSelected = (next: File | null) => {
    setFile(next); setError(''); setResult(null);
    if (!next) return;
    const derived = next.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    if (!title.trim()) setTitle(derived);
    if (!slugEdited) setSlug(slugify(derived));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError('Select a PDF file first.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.set('file', file); form.set('title', title); form.set('slug', slug);
      form.set('subtitle', subtitle); form.set('category', category);
      form.set('description', description); form.set('synopsis', synopsis);
      form.set('edition', edition); form.set('publishedYear', publishedYear);
      form.set('tags', tags); form.set('allowPdfDownload', String(allowPdfDownload));
      form.set('license', license);
      const response = await fetch('/api/admin/books/import', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'PDF import failed.');
      setResult(payload as ImportResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error while importing the PDF.');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '900px' }}>
      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <UploadCloud size={24} color="var(--color-brand-cyan)" />
          <div><h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Upload and import</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>PDF is stored privately for reader downloads only. No online-reading chapters are generated.</p>
          </div>
        </div>
        {error && <div className={styles.alertBox + ' ' + styles.alertError} role="alert" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /><span>{error}</span></div>}
        {result ? (
          <div>
            <div className={styles.alertBox + ' ' + styles.alertSuccess} role="status" style={{ marginBottom: '1.25rem' }}><CheckCircle2 size={18} /><span>{result.message}</span></div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>{result.book.title}</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 1rem', fontSize: '0.9rem' }}>Download-only PDF · {result.book.allowPdfDownload ? 'PDF downloads enabled' : 'PDF downloads disabled until enabled'}</p>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1.25rem' }}>
              {result.chapters.map((chapter) => (
                <div key={chapter.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <FileText size={16} color="var(--color-brand-cyan)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{chapter.chapterNumber}. {chapter.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{chapter.wordCount.toLocaleString()} words · ~{chapter.estimatedReadingTimeMinutes} min</div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{chapter.summary.slice(0, 180)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {result.chapters.length > 0 && <Link href={'/admin/books/' + result.book.id + '/chapters'} className="btn btn-primary btn-sm">Review and edit chapters</Link>}
              <Link href="/admin/books" className="btn btn-ghost btn-sm">Back to book list</Link>
              <a href={'/api/books/' + encodeURIComponent(result.book.slug) + '/pdf'} className="btn btn-ghost btn-sm">Download original PDF (admin)</a>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>The book is a draft. Nothing is visible to readers until you publish it and enable PDF downloads.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pdf-file">Original PDF *</label>
              <input id="pdf-file" type="file" accept="application/pdf,.pdf" required onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)} className="form-input" />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Maximum 4 MB. Text-based PDFs work best. Scanned/image-only PDFs require OCR first.</p>
              {file && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
            </div>
            <div className={styles.formGrid}>
              <div className="form-group"><label className="form-label" htmlFor="pdf-title">Book title *</label><input id="pdf-title" className="form-input" required minLength={2} maxLength={150} value={title} onChange={(e) => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-slug">URL slug *</label><input id="pdf-slug" className="form-input" required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-subtitle">Subtitle</label><input id="pdf-subtitle" className="form-input" maxLength={200} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-category">Category *</label><input id="pdf-category" className="form-input" required minLength={2} maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-edition">Edition</label><input id="pdf-edition" className="form-input" value={edition} maxLength={120} onChange={(e) => setEdition(e.target.value)} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-year">Publication year</label><input id="pdf-year" className="form-input" type="number" min={2000} max={2100} value={publishedYear} onChange={(e) => setPublishedYear(e.target.value)} /></div>
              <div className="form-group"><label className="form-label" htmlFor="pdf-license">Book license *</label><select id="pdf-license" className="form-input" value={license} onChange={(e) => setLicense(e.target.value)}><option value="All Rights Reserved">All Rights Reserved</option><option value="Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)">CC BY-NC 4.0 (Attribution, Non-Commercial)</option></select><p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Choose the license that applies to your manuscript.</p></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="pdf-description">Short description *</label><textarea id="pdf-description" className="form-input" rows={3} required minLength={10} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what readers will learn from this book." /></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="pdf-synopsis">Synopsis *</label><textarea id="pdf-synopsis" className="form-input" rows={4} required minLength={10} maxLength={10000} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="A longer overview for the book detail page." /></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="pdf-tags">Tags (comma-separated)</label><input id="pdf-tags" className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Python, Machine Learning, Beginners" /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}><input type="checkbox" checked={allowPdfDownload} onChange={(e) => setAllowPdfDownload(e.target.checked)} style={{ marginTop: '0.25rem' }} />Allow readers to download the original PDF after publication</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>The original PDF is stored privately. This importer creates a draft; it never publishes extracted text automatically.</p>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ justifySelf: 'start' }}><UploadCloud size={16} />{busy ? 'Importing PDF…' : 'Import PDF and create draft'}</button>
          </form>
        )}
      </section>
      <section style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', background: 'var(--bg-surface)' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>What gets imported?</h2>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.75 }}>
          <li>Selectable text and detected chapter headings</li><li>Editable chapter drafts, summaries and estimated reading times</li>
          <li>Original PDF stored privately for later download</li><li>Image and diagram extraction is not included in this first importer version</li>
          <li>Scanned PDFs need OCR before upload</li>
        </ul>
      </section>
    </div>
  );
}
