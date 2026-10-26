import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MarkdownImportForm from '../MarkdownImportForm';
import styles from '../../../admin.module.css';

export const metadata = {
  title: 'Import Markdown Book — AXLY Admin',
  description: 'Import a Markdown manuscript for online reading on AXLY Books.',
};

export default function AdminMarkdownImportPage() {
  return <div>
    <header className={styles.pageHeader}>
      <div className={styles.headerTitleBox}>
        <Link href="/admin/books/import" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back to import options
        </Link>
        <h1 className={styles.pageTitle}>Import a Markdown Book</h1>
        <p className={styles.pageDesc}>Upload one .md manuscript or a ZIP of chapter Markdown files, review the generated reading sections, then publish for online reading.</p>
      </div>
    </header>
    <MarkdownImportForm />
  </div>;
}
