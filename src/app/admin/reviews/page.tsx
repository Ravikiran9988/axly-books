'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, MessageSquareText, RefreshCw, Star, Trash2 } from 'lucide-react';
import styles from '../admin.module.css';

type ModerationReview = {
  id: string; rating: number; title: string | null; content: string; status: 'published' | 'hidden';
  createdAt: string; author: string; authorIsAdmin: boolean; bookTitle: string; bookSlug: string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reviews${filter === 'all' ? '' : `?status=${filter}`}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load reviews.');
      setReviews(data.reviews);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load reviews.'); }
    finally { setLoading(false); }
  }, [filter]);

  // Reload the queue when the selected filter changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function moderate(review: ModerationReview, action: 'hide' | 'restore' | 'delete') {
    if (action === 'delete' && !window.confirm('Permanently delete this review? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/books/${encodeURIComponent(review.bookSlug)}/reviews/${encodeURIComponent(review.id)}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: action === 'delete' ? undefined : { 'content-type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify({ status: action === 'hide' ? 'hidden' : 'published' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Moderation action failed.');
      setNotice(action === 'hide' ? 'Review hidden from public pages.' : action === 'restore' ? 'Review restored.' : 'Review permanently deleted.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Moderation action failed.'); }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.pageTitle}>Book Reviews</h1>
          <p className={styles.pageDesc}>Moderate ratings and reader feedback across published books.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className={styles.toolbarRow}>
        <div className={styles.filterTabs} aria-label="Filter reviews">
          {(['all', 'published', 'hidden'] as const).map((value) => <button key={value} type="button" className={`${styles.filterTab} ${filter === value ? styles.filterTabActive : ''}`} onClick={() => setFilter(value)}>{value === 'all' ? 'All reviews' : value === 'published' ? 'Visible' : 'Hidden'}</button>)}
        </div>
        <span className={styles.pageDesc}>{reviews.length} shown · maximum 100</span>
      </div>
      {notice && <div className={`${styles.alertBox} ${styles.alertSuccess}`}><CheckCircle2 size={17} />{notice}</div>}
      {error && <div className={`${styles.alertBox} ${styles.alertError}`}><AlertTriangle size={17} />{error}</div>}
      {loading ? <p className={styles.pageDesc}>Loading reviews…</p> : reviews.length === 0 ? (
        <div className={styles.tableWrapper} style={{ padding: '3rem', textAlign: 'center' }}><MessageSquareText size={28} /><p>No reviews in this view.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {reviews.map((review) => (
            <article key={review.id} className={styles.tableWrapper} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{review.author}</strong>
                    {review.authorIsAdmin && <span className={styles.badgePublished}>Author · Slayer</span>}
                    <span className={review.status === 'published' ? styles.badgePublished : styles.badgeDraft}>{review.status}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem', color: '#d97706', fontWeight: 700 }}><Star size={14} fill="currentColor" /> {review.rating}/5</span>
                    <span className={styles.pageDesc}>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.pageDesc}>Book: <Link href={`/books/${review.bookSlug}`} target="_blank">{review.bookTitle}</Link></p>
                  {review.title && <h3 style={{ margin: '.65rem 0 .35rem', color: 'var(--text-primary)' }}>{review.title}</h3>}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.7 }}>{review.content}</p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {review.status === 'published' ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void moderate(review, 'hide')}><EyeOff size={14} /> Hide</button>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void moderate(review, 'restore')}><Eye size={14} /> Restore</button>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => void moderate(review, 'delete')}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
