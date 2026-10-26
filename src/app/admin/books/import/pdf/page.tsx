import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PdfImportForm from '../PdfImportForm';
import styles from '../../../admin.module.css';

export const metadata = {
  title: 'Import PDF — AXLY Admin',
  description: 'Upload a PDF for download-only distribution on AXLY Books.',
};

export default function AdminPdfImportPage() {
  return <div>
    <header className={styles.pageHeader}>
      <div className={styles.headerTitleBox}>
        <Link href="/admin/books/import" className="btn btn-ghost btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back to import options
        </Link>
        <h1 className={styles.pageTitle}>Import a PDF (Download Only)</h1>
        <p className={styles.pageDesc}>The original PDF is stored privately. This option does not create an online reader.</p>
      </div>
    </header>
    <PdfImportForm />
  </div>;
}
