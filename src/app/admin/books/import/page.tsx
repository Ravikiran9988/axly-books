import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PdfImportForm from './PdfImportForm';
import styles from '../../admin.module.css';

export const metadata = {
  title: 'Import PDF Book — AXLY Admin',
  description: 'Import a PDF into an editable book draft on AXLY Books.',
};

export default function AdminPdfImportPage() {
  return (
    <div>
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <Link href="/admin/books" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }}>
            <ArrowLeft size={16} /> Back to Books
          </Link>
          <h1 className={styles.pageTitle}>Import a PDF Book</h1>
          <p className={styles.pageDesc}>Upload your existing manuscript, extract its text and chapters, then review the draft before publishing.</p>
        </div>
      </header>
      <PdfImportForm />
    </div>
  );
}
