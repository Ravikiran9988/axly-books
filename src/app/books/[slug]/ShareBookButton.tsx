'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';

export default function ShareBookButton({ title }: { title: string }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: title + ' · AXLY Books', text: 'Read this free book on AXLY Books', url });
        setMessage('Share sheet opened.');
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setMessage('Book link copied. You can paste it anywhere.');
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setMessage('Book link copied. You can paste it anywhere.');
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        setMessage('Could not share automatically. Copy the page URL from your browser.');
      }
    }
  };

  return (
    <div>
      <button type="button" className="btn btn-secondary" onClick={() => void share()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }} aria-label={`Share ${title}`}>
        {copied ? <Check size={16} /> : (message.includes('copied') ? <Copy size={16} /> : <Share2 size={16} />)}
        {copied ? 'Link copied' : 'Share book'}
      </button>
      {message && <p role="status" aria-live="polite" style={{ fontSize: '0.8rem', margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>{message}</p>}
    </div>
  );
}
