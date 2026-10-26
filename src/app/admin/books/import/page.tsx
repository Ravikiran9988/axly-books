import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileDown, BookOpenText } from 'lucide-react';
import styles from '../../admin.module.css';

export const metadata = {
  title: 'Import a Book — AXLY Admin',
  description: 'Choose PDF download-only or Markdown online reading for AXLY Books.',
};

export default function AdminBookImportPage() {
  return <div>
    <header className={styles.pageHeader}>
      <div className={styles.headerTitleBox}>
        <Link href="/admin/books" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back to Books
        </Link>
        <h1 className={styles.pageTitle}>Import a Book</h1>
        <p className={styles.pageDesc}>Choose one of the two supported upload formats.</p>
      </div>
    </header>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', maxWidth: '900px' }}>
      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <FileDown size={28} color="var(--color-brand-cyan)" />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.75rem' }}>1. PDF — Download only</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>Store the original PDF privately. No chapters or online reader are generated. Enable downloads when publishing.</p>
        <Link href="/admin/books/import/pdf" className="btn btn-primary btn-sm">Upload PDF</Link>
      </section>
      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <BookOpenText size={28} color="var(--color-brand-cyan)" />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.75rem' }}>2. Markdown — Read online</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>Upload one .md manuscript. Headings create draft chapters or sections that can be reviewed before publication.</p>
        <Link href="/admin/books/import/markdown" className="btn btn-primary btn-sm">Upload Markdown</Link>
      </section>
    </div>
  </div>;
}
