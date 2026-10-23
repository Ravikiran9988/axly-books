'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, MessageCircle, RefreshCw, Trash2 } from 'lucide-react';
import styles from '../admin.module.css';

type ModerationComment = {
  id: string; content: string; status: string; createdAt: string; author: string; authorIsAdmin: boolean;
  bookTitle: string; bookSlug: string; chapterTitle: string; chapterSlug: string; reportCount: number;
  reports: Array<{ reason: string; details: string | null; status: string }>;
};

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/comments${filter === 'all' ? '' : `?status=${filter}`}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load comments.');
      setComments(data.comments);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load comments.'); }
    finally { setLoading(false); }
  }, [filter]);

  // Fetch moderation data when the selected filter changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function moderate(comment: ModerationComment, action: 'hide' | 'restore' | 'delete') {
    if (action === 'delete' && !window.confirm('Permanently delete this comment? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: action === 'delete' ? undefined : { 'content-type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify({ status: action === 'hide' ? 'hidden' : 'published' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Moderation action failed.');
      setNotice(action === 'hide' ? 'Comment hidden from readers.' : action === 'restore' ? 'Comment restored.' : 'Comment deleted.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Moderation action failed.'); }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.pageTitle}>Reader Comments</h1>
          <p className={styles.pageDesc}>Review discussions, reports, and remove abusive or spam content.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button>
      </div>
      <div className={styles.toolbarRow}>
        <div className={styles.filterTabs} aria-label="Filter comments">
          {(['all', 'published', 'hidden'] as const).map((value) => <button key={value} type="button" className={`${styles.filterTab} ${filter === value ? styles.filterTabActive : ''}`} onClick={() => setFilter(value)}>{value === 'all' ? 'All comments' : value === 'published' ? 'Visible' : 'Hidden'}</button>)}
        </div>
        <span className={styles.pageDesc}>{comments.length} shown · maximum 100</span>
      </div>
      {notice && <div className={`${styles.alertBox} ${styles.alertSuccess}`}><CheckCircle2 size={17} />{notice}</div>}
      {error && <div className={`${styles.alertBox} ${styles.alertError}`}><AlertTriangle size={17} />{error}</div>}
      {loading ? <p className={styles.pageDesc}>Loading moderation queue…</p> : comments.length === 0 ? (
        <div className={styles.tableWrapper} style={{ padding: '3rem', textAlign: 'center' }}><MessageCircle size={28} /><p>No comments in this view.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {comments.map((comment) => (
            <article key={comment.id} className={styles.tableWrapper} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{comment.author}</strong>
                    {comment.authorIsAdmin && <span className={styles.badgePublished}>Author · Slayer</span>}
                    <span className={comment.status === 'published' ? styles.badgePublished : styles.badgeDraft}>{comment.status}</span>
                    {comment.reportCount > 0 && <span className={styles.badgeDraft}><AlertTriangle size={13} /> {comment.reportCount} open report(s)</span>}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65 }}>{comment.content}</p>
                  <p className={styles.pageDesc}>{new Date(comment.createdAt).toLocaleString()} · {comment.bookTitle} / {comment.chapterTitle}</p>
                  {comment.reports?.length > 0 && <details style={{ marginTop: '.75rem' }}><summary style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600 }}>View reports ({comment.reports.length})</summary><ul>{comment.reports.map((report, index) => <li key={index} style={{ marginTop: '.5rem', color: 'var(--text-secondary)' }}><strong>{report.reason}</strong> — {report.status}{report.details ? `: ${report.details}` : ''}</li>)}</ul></details>}
                </div>
                <div className={styles.actionButtonGroup}>
                  <Link href={`/read/${comment.bookSlug}?chapter=${comment.chapterSlug}`} className={styles.btnAction} target="_blank"><Eye size={14} /> View chapter</Link>
                  {comment.status === 'published' ? <button type="button" className={`${styles.btnAction} ${styles.btnActionDanger}`} onClick={() => void moderate(comment, 'hide')}><EyeOff size={14} /> Hide</button> : <button type="button" className={styles.btnAction} onClick={() => void moderate(comment, 'restore')}><CheckCircle2 size={14} /> Restore</button>}
                  <button type="button" className={`${styles.btnAction} ${styles.btnActionDanger}`} onClick={() => void moderate(comment, 'delete')}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
