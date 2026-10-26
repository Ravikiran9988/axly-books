'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, FileArchive, FileText, UploadCloud } from 'lucide-react';
import styles from '../admin.module.css';

interface Props { bookId: string; bookSlug: string; bookTitle: string }
interface ImportedChapter { id: string; chapterNumber: number; title: string; slug: string; isPublished: boolean }

export default function ExistingBookMarkdownManager({ bookId, bookSlug, bookTitle }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [chapters, setChapters] = useState<ImportedChapter[]>([]);

  async function importFiles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError('Choose a .md file or ZIP archive first.'); return; }
    setBusy(true); setError(''); setMessage(''); setChapters([]);
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/admin/books/' + encodeURIComponent(bookId) + '/import-markdown', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Markdown import failed.');
      setChapters(payload.chapters || []);
      setMessage(payload.message || 'Markdown files imported as drafts.');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Network error while importing Markdown.');
    } finally { setBusy(false); }
  }

  return (
    <section style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1rem', background: 'var(--bg-surface)', display: 'grid', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <FileArchive size={22} color="var(--color-brand-cyan)" />
        <div>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>Add reading content to this PDF-only book</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '0.25rem' }}>Add Markdown to “{bookTitle}” without replacing its attached PDF. Imported sections remain drafts until you review and publish them.</p>
        </div>
      </div>
      <form onSubmit={importFiles} style={{ display: 'grid', gap: '0.7rem' }}>
        <label htmlFor="existing-book-markdown-upload" className="form-label">Markdown file or ZIP archive</label>
        <input ref={inputRef} id="existing-book-markdown-upload" type="file" accept=".md,text/markdown,.zip,application/zip,application/x-zip-compressed" className="form-input" onChange={e => { setFile(e.target.files?.[0] || null); setError(''); setMessage(''); }} disabled={busy} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Limits: .md up to 2 MB; ZIP up to 10 MB. ZIP extraction validates paths and file content.</p>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !file} style={{ justifySelf: 'start' }}><UploadCloud size={16} /> {busy ? 'Importing drafts…' : 'Add Markdown files'}</button>
      </form>
      {error && <div role="alert" className={styles.alertBox + ' ' + styles.alertError}><AlertCircle size={16} /><span>{error}</span></div>}
      {message && <div role="status" className={styles.alertBox + ' ' + styles.alertSuccess}><CheckCircle2 size={16} /><span>{message}</span></div>}
      {chapters.length > 0 && <div style={{ display: 'grid', gap: '0.4rem' }}>
        <p style={{ color: 'var(--text-primary)', fontWeight: 650 }}>Imported draft sections</p>
        {chapters.map(chapter => <div key={chapter.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0', borderTop: '1px solid var(--border-subtle)' }}>
          <FileText size={15} color="var(--color-brand-cyan)" />
          <span style={{ flex: 1, minWidth: 0, color: 'var(--text-primary)', fontSize: '0.86rem' }}>{chapter.chapterNumber}. {chapter.title}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{chapter.isPublished ? 'Published' : 'Draft'}</span>
        </div>)}
        <Link href={'/admin/books/' + encodeURIComponent(bookSlug) + '/chapters'} className="btn btn-secondary btn-sm" style={{ justifySelf: 'start', marginTop: '0.4rem' }}>Edit, remove or add chapters</Link>
      </div>}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Use chapter management to edit content, delete sections, reorder them, or add more chapters after import.</p>
    </section>
  );
}
