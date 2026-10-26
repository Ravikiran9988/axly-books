'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

interface BookShareActionProps {
  title: string;
  slug: string;
  variant?: 'full' | 'compact';
}

export default function BookShareAction({ title, slug, variant = 'full' }: BookShareActionProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function handleShare() {
    setCopied(false);
    setError(false);

    const url = new URL(`/books/${encodeURIComponent(slug)}`, window.location.origin).toString();

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `Read "${title}" on AXLY Books`, url });
        return;
      } catch (reason) {
        if (reason instanceof Error && reason.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        textarea.remove();
        if (!success) throw new Error('Clipboard unavailable');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(true);
      window.setTimeout(() => setError(false), 2500);
    }
  }

  return (
    <div
      style={{
        marginTop: 0,
        display: variant === 'compact' ? 'flex' : 'block',
        width: variant === 'compact' ? '100%' : undefined,
        minWidth: 0,
      }}
    >
      <button
        type="button"
        onClick={handleShare}
        className={`btn btn-secondary ${variant === 'compact' ? 'btn-sm' : ''}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', width: '100%', minWidth: 0, boxSizing: 'border-box',
          whiteSpace: 'normal', flexShrink: 1, overflowWrap: 'anywhere',
        }}
        aria-live="polite"
        aria-label={copied ? 'Book link copied' : error ? 'Could not share book link' : `Share ${title}`}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        {variant === 'compact'
          ? copied ? 'Copied' : error ? 'Retry' : 'Share'
          : copied ? 'Link copied' : error ? 'Could not share link' : 'Share this book'}
      </button>
    </div>
  );
}
