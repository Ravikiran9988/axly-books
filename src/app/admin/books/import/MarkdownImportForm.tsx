'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import styles from '../../admin.module.css';

interface ImportResult {
  success: boolean;
  book: { id: string; slug: string; title: string; isPublished: boolean };
  chapters: Array<{ id: string; chapterNumber: number; title: string; slug: string; summary: string; estimatedReadingTimeMinutes: number; wordCount: number }>;
  importedTextCharacters: number;
  message: string;
}
function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function MarkdownImportForm() {
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
  const [license, setLicense] = useState('All Rights Reserved');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  function selectFile(next: File | null) {
    setFile(next); setError(''); setResult(null);
    if (!next) return;
    const derived = next.name.replace(/\.(md|zip)$/i, '').replace(/[_-]+/g, ' ').trim();
    if (!title.trim()) setTitle(derived);
    if (!slugEdited) setSlug(slugify(derived));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError('Select a Markdown (.md) file or ZIP archive first.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.set('file', file); form.set('title', title); form.set('slug', slug);
      form.set('subtitle', subtitle); form.set('category', category);
      form.set('description', description); form.set('synopsis', synopsis);
      form.set('edition', edition); form.set('publishedYear', publishedYear);
      form.set('tags', tags); form.set('license', license);
      const response = await fetch('/api/admin/books/import-markdown', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Markdown import failed.');
      setResult(payload as ImportResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error while importing Markdown.');
    } finally { setBusy(false); }
  }

  return <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '900px' }}>
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <UploadCloud size={24} color="var(--color-brand-cyan)" />
        <div><h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Upload Markdown manuscript</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Upload one .md manuscript or a ZIP containing multiple .md files. ZIP files are extracted safely, Markdown files are sorted by filename, and headings create draft chapters. Review the draft before publishing.</p>
        </div>
      </div>
      {error && <div className={styles.alertBox + ' ' + styles.alertError} role="alert" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /><span>{error}</span></div>}
      {result ? <div>
        <div className={styles.alertBox + ' ' + styles.alertSuccess} role="status" style={{ marginBottom: '1.25rem' }}><CheckCircle2 size={18} /><span>{result.message}</span></div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>{result.book.title}</h3>
        <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 1rem', fontSize: '0.9rem' }}>{result.chapters.length} draft chapters/sections · {result.importedTextCharacters.toLocaleString()} characters imported</p>
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1.25rem' }}>
          {result.chapters.map(chapter => <div key={chapter.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <FileText size={16} color="var(--color-brand-cyan)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <div><div style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{chapter.chapterNumber}. {chapter.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{chapter.wordCount.toLocaleString()} words · ~{chapter.estimatedReadingTimeMinutes} min</div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{chapter.summary.slice(0, 180)}</p>
            </div>
          </div>)}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={'/admin/books/' + result.book.id + '/chapters'} className="btn btn-primary btn-sm">Review draft</Link>
          <Link href="/admin/books" className="btn btn-ghost btn-sm">Back to book list</Link>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>This book is still a draft. It will not be visible to readers until you publish it.</p>
      </div> : <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
        <div className="form-group"><label className="form-label" htmlFor="md-file">Markdown manuscript (.md or .zip) *</label><input id="md-file" type="file" accept=".md,.zip,text/markdown,text/plain,application/zip,application/x-zip-compressed" required onChange={e => selectFile(e.target.files?.[0] ?? null)} className="form-input" />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Single .md: maximum 2 MB. ZIP: maximum 10 MB, up to 100 entries, 25 MB extracted Markdown total. Non-Markdown files are ignored.</p>
          {file && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
        </div>
        <div className={styles.formGrid}>
          <div className="form-group"><label className="form-label" htmlFor="md-title">Book title *</label><input id="md-title" className="form-input" required minLength={2} maxLength={150} value={title} onChange={e => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-slug">URL slug *</label><input id="md-slug" className="form-input" required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true); }} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-subtitle">Subtitle</label><input id="md-subtitle" className="form-input" maxLength={200} value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-category">Category *</label><input id="md-category" className="form-input" required minLength={2} maxLength={100} value={category} onChange={e => setCategory(e.target.value)} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-edition">Edition</label><input id="md-edition" className="form-input" maxLength={120} value={edition} onChange={e => setEdition(e.target.value)} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-year">Publication year</label><input id="md-year" className="form-input" type="number" min={2000} max={2100} value={publishedYear} onChange={e => setPublishedYear(e.target.value)} /></div>
          <div className="form-group"><label className="form-label" htmlFor="md-license">Book license *</label><select id="md-license" className="form-input" value={license} onChange={e => setLicense(e.target.value)}><option value="All Rights Reserved">All Rights Reserved</option><option value="Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)">CC BY-NC 4.0 (Attribution, Non-Commercial)</option></select></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="md-description">Short description *</label><textarea id="md-description" className="form-input" rows={3} required minLength={10} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="md-synopsis">Synopsis *</label><textarea id="md-synopsis" className="form-input" rows={4} required minLength={10} maxLength={10000} value={synopsis} onChange={e => setSynopsis(e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label" htmlFor="md-tags">Tags (comma-separated)</label><input id="md-tags" className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="Python, Machine Learning, Beginners" /></div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !file} style={{ width: 'fit-content' }}><UploadCloud size={16} />{busy ? 'Importing Markdown…' : 'Import as reading draft'}</button>
      </form>}
    </section>
  </div>;
}
