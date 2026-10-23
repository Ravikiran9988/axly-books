'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Send, Trash2, Pencil, ChevronDown, MessageSquareText } from 'lucide-react';
import styles from './ReviewsPanel.module.css';

type Review = {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; displayName: string; isAuthor: boolean };
  canEdit: boolean;
};
type Summary = { averageRating: number; reviewCount: number; distribution: Record<number, number> };
type OwnReview = { id: string; rating: number; title: string | null; content: string; updatedAt: string } | null;

function Stars({ value, interactive = false, onChange }: { value: number; interactive?: boolean; onChange?: (rating: number) => void }) {
  return (
    <div className={styles.stars} role={interactive ? 'group' : 'img'} aria-label={interactive ? `Choose rating, currently ${value} out of 5` : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => interactive ? (
        <button key={star} type="button" className={star <= value ? styles.starActive : styles.star} onClick={() => onChange?.(star)} aria-label={`${star} star`} aria-pressed={star === value}>
          <Star size={22} fill={star <= value ? 'currentColor' : 'none'} />
        </button>
      ) : (
        <Star key={star} size={16} className={star <= value ? styles.starActive : styles.star} fill={star <= value ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function ReviewsPanel({ bookSlug }: { bookSlug: string }) {
  const endpoint = `/api/books/${encodeURIComponent(bookSlug)}/reviews`;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ averageRating: 0, reviewCount: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [myReview, setMyReview] = useState<OwnReview>(null);
  const [user, setUser] = useState<{ id: string; displayName: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadReviews = useCallback(async (reset = true) => {
    setBusy(true);
    try {
      const offset = reset ? 0 : nextOffset ?? 0;
      const response = await fetch(`${endpoint}?offset=${offset}&limit=8`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load reviews.');
      setSummary(data.summary);
      setMyReview(data.myReview);
      setReviews((previous) => reset ? data.reviews : [...previous, ...data.reviews.filter((review: Review) => !previous.some((old) => old.id === review.id))]);
      setNextOffset(data.nextOffset);
      if (reset && data.myReview) {
        setRating(data.myReview.rating);
        setTitle(data.myReview.title || '');
        setContent(data.myReview.content);
      }
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load reviews.');
    } finally {
      setBusy(false);
    }
  }, [endpoint, nextOffset]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      if (!cancelled) setUser(data.user ? { id: data.user.id, displayName: data.user.displayName } : null);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadReviews(true); }, [endpoint]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating, title, content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save review.');
      setNotice(data.updated ? 'Your review has been updated.' : 'Thanks for sharing your review.');
      setShowForm(false);
      await loadReviews(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save review.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteReview() {
    if (!myReview || !window.confirm('Delete your review? This cannot be undone.')) return;
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(myReview.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete review.');
      setMyReview(null);
      setRating(0);
      setTitle('');
      setContent('');
      setShowForm(false);
      setNotice('Your review was deleted.');
      await loadReviews(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="book-reviews-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>READER FEEDBACK</p>
          <h2 id="book-reviews-title"><MessageSquareText size={23} /> Ratings &amp; reviews</h2>
          <p className={styles.subtitle}>Help other readers decide if this book is right for them.</p>
        </div>
        <button type="button" className={styles.writeButton} onClick={() => {
          if (myReview) {
            setRating(myReview.rating);
            setTitle(myReview.title || '');
            setContent(myReview.content);
          }
          setShowForm((visible) => !visible);
        }}>
          <Pencil size={16} /> {myReview ? 'Edit your review' : 'Write a review'}
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.score}>
          <strong>{summary.reviewCount ? summary.averageRating.toFixed(1) : '—'}</strong>
          <Stars value={Math.round(summary.averageRating)} />
          <span>{summary.reviewCount} {summary.reviewCount === 1 ? 'review' : 'reviews'}</span>
        </div>
        <div className={styles.distribution}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.distribution[stars] || 0;
            const percentage = summary.reviewCount ? (count / summary.reviewCount) * 100 : 0;
            return <div className={styles.distributionRow} key={stars}>
              <span>{stars} <Star size={12} fill="currentColor" /></span>
              <div className={styles.track}><div className={styles.fill} style={{ width: `${percentage}%` }} /></div>
              <span>{count}</span>
            </div>;
          })}
        </div>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={submitReview}>
          <h3>{myReview ? 'Update your review' : 'Share your experience'}</h3>
          {!user && <p className={styles.loginPrompt}>You’ll need to <Link href={`/login?returnTo=${encodeURIComponent(`/books/${bookSlug}`)}`}>sign in</Link> before submitting a review.</p>}
          <label className={styles.ratingLabel}>Your rating <span aria-hidden="true">*</span></label>
          <Stars value={rating} interactive onChange={setRating} />
          <label htmlFor="review-title">Review title <span className={styles.optional}>(optional)</span></label>
          <input id="review-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Sum up your experience" />
          <label htmlFor="review-content">Your review <span aria-hidden="true">*</span></label>
          <textarea id="review-content" value={content} onChange={(event) => setContent(event.target.value)} minLength={10} maxLength={2000} rows={5} placeholder="What did you learn? Who would benefit from this book?" required />
          <div className={styles.formFooter}>
            <span>{content.length}/2000 · at least 10 characters</span>
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.submitButton} disabled={busy || rating < 1 || content.trim().length < 10}><Send size={15} /> {busy ? 'Saving…' : myReview ? 'Update review' : 'Publish review'}</button>
            </div>
          </div>
          <p className={styles.guideline}>Keep feedback constructive and focused on the book. Reviews are public and can be moderated.</p>
        </form>
      )}

      {myReview && !showForm && <div className={styles.ownReviewNotice}>You’ve reviewed this book. <button type="button" onClick={() => setShowForm(true)}>Edit</button><button type="button" onClick={deleteReview} disabled={busy}>Delete</button></div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.reviewList}>
        {reviews.map((review) => (
          <article className={styles.review} key={review.id}>
            <div className={styles.reviewTop}>
              <div className={styles.avatar} aria-hidden="true">{review.user.displayName.slice(0, 1).toUpperCase()}</div>
              <div className={styles.reviewer}>
                <strong>{review.user.displayName}</strong>
                {review.user.isAuthor && <span className={styles.authorBadge}>Author</span>}
                <time dateTime={review.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(review.createdAt))}</time>
              </div>
              <Stars value={review.rating} />
            </div>
            {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
            <p className={styles.reviewText}>{review.content}</p>
            {review.updatedAt !== review.createdAt && <span className={styles.edited}>Edited</span>}
          </article>
        ))}
        {!reviews.length && !busy && <div className={styles.empty}><Star size={24} /><strong>No reviews yet</strong><span>Be the first reader to share thoughtful feedback.</span></div>}
      </div>

      {nextOffset !== null && <button type="button" className={styles.loadMore} onClick={() => void loadReviews(false)} disabled={busy}><ChevronDown size={16} /> {busy ? 'Loading…' : 'Load more reviews'}</button>}
    </section>
  );
}
