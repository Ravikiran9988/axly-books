'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Flag, Heart, MessageCircle, Pencil, Reply, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import styles from './CommentsPanel.module.css';

type CommentItem = {
  id: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; displayName: string; isAuthor: boolean };
  voteCount: number;
  hasVoted: boolean;
  replyCount: number;
  canEdit: boolean;
  canModerate: boolean;
};
type CurrentUser = { id: string; displayName: string; role: 'admin' | 'reader' } | null;

export default function CommentsPanel({ bookSlug, chapterSlug }: { bookSlug: string; chapterSlug: string }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [user, setUser] = useState<CurrentUser>(null);
  const [loaded, setLoaded] = useState(false);
  const [offset, setOffset] = useState<number | null>(0);
  const [sort, setSort] = useState<'newest' | 'relevant'>('newest');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const displayComments = useMemo(() => {
    const roots = comments.filter((item) => !item.parentCommentId);
    const nested = roots.flatMap((root) => [root, ...comments.filter((item) => item.parentCommentId === root.id)]);
    const orphaned = comments.filter((item) => item.parentCommentId && !comments.some((parent) => parent.id === item.parentCommentId));
    return [...nested, ...orphaned.filter((item) => !nested.some((nestedItem) => nestedItem.id === item.id))];
  }, [comments]);

  const endpoint = useMemo(() => `/api/books/${encodeURIComponent(bookSlug)}/chapters/${encodeURIComponent(chapterSlug)}/comments`, [bookSlug, chapterSlug]);

  const load = useCallback(async (reset = false) => {
    setBusy(true);
    try {
      const nextOffset = reset ? 0 : offset ?? 0;
      const response = await fetch(`${endpoint}?offset=${nextOffset}&limit=20&sort=${sort}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load comments.');
      setComments((previous) => reset ? data.comments : [...previous, ...data.comments.filter((item: CommentItem) => !previous.some((old) => old.id === item.id))]);
      setTotalCount(Number(data.totalCount ?? 0));
      setOffset(data.nextOffset);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load comments.');
    } finally {
      setLoaded(true);
      setBusy(false);
    }
  }, [endpoint, offset, sort]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).then((data) => {
      if (!cancelled) setUser(data.user ? { id: data.user.id, displayName: data.user.displayName, role: data.user.role } : null);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { void load(true); }, [endpoint, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitComment(event: FormEvent, parentCommentId: string | null = null) {
    event.preventDefault();
    const content = parentCommentId ? replyDraft.trim() : draft.trim();
    if (content.length < 2) { setNotice('Write at least 2 characters.'); return; }
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, parentCommentId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not post comment.');
      if (parentCommentId) {
        setComments((items) => [...items, data.comment]);
        setReplyDraft('');
        setReplyTo(null);
      } else {
        setDraft('');
        setComments((items) => [data.comment, ...items]);
      }
      setNotice('Comment posted.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not post comment.'); }
    finally { setBusy(false); }
  }

  async function mutateComment(id: string, action: 'vote' | 'delete' | 'hide' | 'restore' | 'report', content?: string) {
    try {
      const url = action === 'vote' ? `/api/comments/${id}/vote` : action === 'report' ? `/api/comments/${id}/report` : `/api/comments/${id}`;
      const method = action === 'delete' ? 'DELETE' : action === 'hide' || action === 'restore' || content !== undefined ? 'PATCH' : 'POST';
      const body = action === 'hide' ? { status: 'hidden' } : action === 'restore' ? { status: 'published' } : action === 'report' ? { reason: reportReason, details: reportDetails } : content !== undefined ? { content } : undefined;
      const response = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Action failed.');
      if (action === 'delete' || action === 'hide') setComments((items) => items.filter((item) => item.id !== id));
      else if (action === 'restore') setNotice('Comment restored.');
      else if (action === 'vote') setComments((items) => items.map((item) => item.id === id ? { ...item, hasVoted: data.hasVoted, voteCount: Math.max(0, item.voteCount + (data.hasVoted ? 1 : -1)) } : item));
      else if (action === 'report') { setReporting(null); setReportDetails(''); setNotice('Thanks. Your report was sent to the moderators.'); return; }
      else if (content !== undefined) setComments((items) => items.map((item) => item.id === id ? { ...item, content, updatedAt: new Date().toISOString() } : item));
      setNotice('Changes saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Action failed.'); }
  }

  const formatDate = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date));

  return (
    <section className={styles.panel} aria-labelledby="chapter-discussion-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>READER COMMUNITY</p>
          <h2 id="chapter-discussion-title"><MessageCircle size={22} /> Chapter discussion <span className={styles.discussionCount}>{totalCount}</span></h2>
          <p className={styles.subhead}>Share what you learned, ask questions, and help other readers.</p>
        </div>
        <label className={styles.sortLabel}>Sort
          <select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'relevant')}>
            <option value="newest">Newest</option>
            <option value="relevant">Most helpful</option>
          </select>
        </label>
      </div>

      {user ? (
        <form className={styles.composer} onSubmit={(event) => submitComment(event)}>
          <div className={styles.avatar}>{(user.role === 'admin' ? 'S' : user.displayName).slice(0, 1).toUpperCase()}</div>
          <div className={styles.composeFields}>
            <label className={styles.srOnly} htmlFor="new-chapter-comment">Write a comment</label>
            <textarea id="new-chapter-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="What did you think about this chapter?" rows={3} />
            <div className={styles.composeFooter}><span>{draft.length}/2000</span><button type="submit" disabled={busy || draft.trim().length < 2}><Send size={15} /> Post comment</button></div>
          </div>
        </form>
      ) : (
        <div className={styles.loginPrompt}>Please <a href="/login">sign in</a> to join the discussion. You can read comments without an account.</div>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.commentList}>
        {loaded && comments.length === 0 && <div className={styles.empty}><MessageCircle size={25} /><strong>Start the discussion</strong><span>No comments yet. Be the first to share a thought.</span></div>}
        {displayComments.map((comment) => (
          <article key={comment.id} className={`${styles.comment} ${comment.parentCommentId ? styles.replyComment : ''}`}>
            <div className={styles.avatar}>{(comment.user.isAuthor ? 'S' : comment.user.displayName).slice(0, 1).toUpperCase()}</div>
            <div className={styles.commentBody}>
              <div className={styles.commentMeta}>
                <strong>{comment.user.isAuthor ? 'Slayer' : comment.user.displayName}</strong>
                {comment.user.isAuthor && <span className={styles.authorBadge}><BadgeCheck size={13} /> Author</span>}
                <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                {comment.updatedAt !== comment.createdAt && <span className={styles.edited}>edited</span>}
              </div>
              {editing === comment.id ? (
                <form onSubmit={(event) => { event.preventDefault(); void mutateComment(comment.id, 'edit', editDraft); setEditing(null); }}>
                  <textarea className={styles.editArea} value={editDraft} maxLength={2000} onChange={(event) => setEditDraft(event.target.value)} autoFocus />
                  <div className={styles.inlineActions}><button type="submit" disabled={editDraft.trim().length < 2}>Save</button><button type="button" className={styles.ghost} onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              ) : <p className={styles.commentText}>{comment.content}</p>}
              <div className={styles.actions}>
                <button type="button" className={comment.hasVoted ? styles.actionActive : ''} onClick={() => user ? void mutateComment(comment.id, 'vote') : setNotice('Sign in to vote on helpful comments.')}><Heart size={15} fill={comment.hasVoted ? 'currentColor' : 'none'} /> Helpful {comment.voteCount > 0 && <span>{comment.voteCount}</span>}</button>
                {!comment.parentCommentId && <button type="button" onClick={() => user ? (setReplyTo(replyTo === comment.id ? null : comment.id), setReplyDraft('')) : setNotice('Sign in to reply.')}><Reply size={15} /> Reply {comment.replyCount > 0 && <span>{comment.replyCount}</span>}</button>}
                {comment.canEdit && editing !== comment.id && <button type="button" onClick={() => { setEditing(comment.id); setEditDraft(comment.content); }}><Pencil size={14} /> Edit</button>}
                {comment.canEdit && <button type="button" onClick={() => { if (window.confirm('Delete this comment and its replies?')) void mutateComment(comment.id, 'delete'); }}><Trash2 size={14} /> Delete</button>}
                {user && !comment.canEdit && !comment.canModerate && <button type="button" onClick={() => setReporting(reporting === comment.id ? null : comment.id)}><Flag size={14} /> Report</button>}
                {comment.canModerate && <button type="button" onClick={() => void mutateComment(comment.id, 'hide')}><ShieldCheck size={14} /> Remove</button>}
              </div>
              {replyTo === comment.id && <form className={styles.replyComposer} onSubmit={(event) => submitComment(event, comment.id)}><textarea value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder={`Reply to ${comment.user.isAuthor ? 'Slayer' : comment.user.displayName}…`} maxLength={2000} rows={2} /><div className={styles.inlineActions}><button type="submit" disabled={busy || replyDraft.trim().length < 2}><Send size={14} /> Reply</button><button type="button" className={styles.ghost} onClick={() => setReplyTo(null)}><X size={14} /> Cancel</button></div></form>}
              {reporting === comment.id && <form className={styles.reportBox} onSubmit={(event) => { event.preventDefault(); void mutateComment(comment.id, 'report'); }}><label>Why are you reporting this?<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="hate">Hate or abuse</option><option value="misinformation">Misinformation</option><option value="other">Other</option></select></label><textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Optional details (max 500 characters)" maxLength={500} rows={2} /><div className={styles.inlineActions}><button type="submit">Send report</button><button type="button" className={styles.ghost} onClick={() => setReporting(null)}>Cancel</button></div></form>}
            </div>
          </article>
        ))}
      </div>
      {offset !== null && <button type="button" className={styles.loadMore} disabled={busy} onClick={() => void load(false)}>{busy ? 'Loading…' : 'Load more comments'}</button>}
    </section>
  );
}
