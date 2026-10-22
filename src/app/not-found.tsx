import React from 'react';
import Link from 'next/link';
import { BookX, Home, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--header-height) - 180px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brand-cyan)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <BookX size={36} />
      </div>

      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--color-brand-cyan)',
          marginBottom: '0.5rem',
        }}
      >
        Error 404
      </span>

      <h1
        style={{
          fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: '1rem',
        }}
      >
        Page or Book Not Found
      </h1>

      <p
        style={{
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          maxWidth: '520px',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
      >
        The page, publication, or chapter you are searching for does not exist or may have been
        moved. Please browse the digital library catalogue or return home.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/books" className="btn btn-primary">
          <BookOpen size={16} />
          <span>Browse Library</span>
        </Link>
        <Link href="/" className="btn btn-secondary">
          <Home size={16} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
