'use client';
/* eslint-disable react-hooks/set-state-in-effect -- synchronize reader tools with API data for the current chapter. */

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

type Annotation = { id: string; quote: string; note: string; anchor: string | null; createdAt: string };
type Edition = { id: string; edition: string; changeSummary: string; publishedAt: string };
type AuthorQuestion = { id: string; question: string; status: string; answer: string | null; createdAt: string; chapterTitle: string };

const panelStyle: CSSProperties = { maxWidth: 820, margin: '2rem auto', padding: '1.25rem', border: '1px solid var(--border-subtle, #ddd)', borderRadius: 14, background: 'var(--surface, #fff)', color: 'var(--text-primary, #222)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid #aaa', margin: '0.35rem 0 0.8rem', font: 'inherit', boxSizing: 'border-box' };

export default function ReaderToolsPanel({ bookSlug, chapterSlug }: { bookSlug: string; chapterSlug: string }) {
 const [tab, setTab] = useState<'notes' | 'correction' | 'questions' | 'editions'>('notes');
 const [annotations, setAnnotations] = useState<Annotation[]>([]);
 const [editions, setEditions] = useState<Edition[]>([]);
 const [questions, setQuestions] = useState<AuthorQuestion[]>([]);
 const [question, setQuestion] = useState('');
 const [quote, setQuote] = useState('');
 const [note, setNote] = useState('');
 const [suggestion, setSuggestion] = useState('');
 const [details, setDetails] = useState('');
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const loadAnnotations = useCallback(async () => {
  const res = await fetch('/api/reader/annotations?book=' + encodeURIComponent(bookSlug) + '&chapter=' + encodeURIComponent(chapterSlug));
  const data = await res.json().catch(() => ({}));
  if (res.ok) setAnnotations(data.annotations || []);
  else if (res.status === 401) setMessage('Sign in to save private highlights and notes.');
  else setMessage(data.error || 'Could not load private notes.');
 }, [bookSlug, chapterSlug]);
 useEffect(() => { void loadAnnotations(); }, [loadAnnotations]);
 useEffect(() => { if (tab === 'editions') fetch('/api/books/' + encodeURIComponent(bookSlug) + '/editions').then(r => r.json()).then(d => setEditions(d.editions || [])).catch(() => setEditions([])); if (tab === 'questions') fetch('/api/books/' + encodeURIComponent(bookSlug) + '/questions?chapter=' + encodeURIComponent(chapterSlug)).then(r => r.json()).then(d => { if (d.questions) setQuestions(d.questions); else if (d.error) setMessage(d.error); }).catch(() => setMessage('Could not load your questions.')); }, [tab, bookSlug, chapterSlug]);
 const saveAnnotation = async () => {
  setBusy(true); setMessage('');
  try {
   const res = await fetch('/api/reader/annotations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bookSlug, chapterSlug, quote, note }) });
   const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not save note.');
   setQuote(''); setNote(''); setMessage('Private note saved. Only you can see it.'); window.dispatchEvent(new Event('axly-annotations-updated')); await loadAnnotations();
  } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save note.'); } finally { setBusy(false); }
 };
 const submitCorrection = async () => {
  setBusy(true); setMessage('');
  try {
   const res = await fetch('/api/books/' + encodeURIComponent(bookSlug) + '/corrections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapterSlug, quote, suggestion, details }) });
   const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not submit correction.');
   setMessage(data.message || 'Correction submitted.'); setSuggestion(''); setDetails('');
  } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not submit correction.'); } finally { setBusy(false); }
 };
 const submitQuestion = async () => { setBusy(true); setMessage(''); try { const res = await fetch('/api/books/' + encodeURIComponent(bookSlug) + '/questions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapterSlug, question }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not send question.'); setQuestion(''); setMessage('Question sent privately to the author.'); setTab('questions'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not send question.'); } finally { setBusy(false); } };
 const useSelection = () => { const selected = window.getSelection()?.toString().trim(); if (selected) setQuote(selected.slice(0, 1000)); else setMessage('Select a passage in the chapter first, then tap “Use selected text”.'); };
 const removeAnnotation = async (id: string) => { const res = await fetch('/api/reader/annotations/' + encodeURIComponent(id), { method: 'DELETE' }); if (res.ok) { setAnnotations(items => items.filter(a => a.id !== id)); window.dispatchEvent(new Event('axly-annotations-updated')); } else setMessage('Could not delete that note.'); };
 const updateAnnotation = async (id: string, current: string) => { const next = window.prompt('Edit your private note', current); if (next === null) return; const res = await fetch('/api/reader/annotations/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: next }) }); const data = await res.json(); if (res.ok) setAnnotations(items => items.map(a => a.id === id ? data.annotation : a)); else setMessage(data.error || 'Could not update note.'); };
 return <section style={panelStyle} aria-label="Reader notes and author tools">
  <h2 style={{ marginTop: 0 }}>Your reading tools</h2>
  <p style={{ color: 'var(--text-muted, #666)' }}>Private notes stay separate from public chapter discussions. Help improve the book by sending corrections to the author.</p>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
   {(['notes', 'correction', 'questions', 'editions'] as const).map(t => <button key={t} type="button" onClick={() => { setTab(t); setMessage(''); }} aria-pressed={tab === t} style={{ padding: '0.55rem 0.85rem', borderRadius: 999, border: '1px solid #888', background: tab === t ? '#183b46' : 'transparent', color: tab === t ? '#fff' : 'inherit', cursor: 'pointer' }}>{t === 'notes' ? 'Private notes' : t === 'correction' ? 'Suggest a correction' : t === 'questions' ? 'Ask Slayer' : 'Edition history'}</button>)}
  </div>
  {tab === 'notes' && <>
   <label htmlFor="annotation-quote">Selected passage</label><textarea id="annotation-quote" value={quote} onChange={e => setQuote(e.target.value)} maxLength={1000} rows={3} placeholder="Select text in the chapter, or paste a short passage here" style={inputStyle} />
   <button type="button" onClick={useSelection} style={{ marginBottom: 10 }}>Use selected text</button>
   <label htmlFor="annotation-note">Your private note</label><textarea id="annotation-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} rows={3} placeholder="What do you want to remember about this passage?" style={inputStyle} />
   <button type="button" disabled={busy || !quote.trim()} onClick={() => void saveAnnotation()} style={{ padding: '0.65rem 1rem', borderRadius: 8, cursor: 'pointer' }}>Save private note</button>
   <h3>Saved for this chapter ({annotations.length})</h3>
   {annotations.length === 0 ? <p>No saved notes for this chapter yet. Notes are private to your account.</p> : annotations.map(a => <article key={a.id} style={{ padding: '0.9rem 0', borderTop: '1px solid #ddd' }}><blockquote style={{ margin: '0 0 0.5rem', paddingLeft: 12, borderLeft: '3px solid #69a7a6' }}>{a.quote}</blockquote><p style={{ whiteSpace: 'pre-wrap' }}>{a.note || 'No note text.'}</p><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('axly-jump-to-quote', { detail: a.quote }))}>Find passage</button>{' '}<button type="button" onClick={() => void updateAnnotation(a.id, a.note)}>Edit note</button>{' '}<button type="button" onClick={() => void removeAnnotation(a.id)}>Delete</button></article>)}
  </>}
  {tab === 'correction' && <>
   <p>Send typos, factual errors, or formatting issues to the author. Submissions are private to you and the moderation team.</p>
   <label htmlFor="correction-quote">Passage with the issue</label><textarea id="correction-quote" value={quote} onChange={e => setQuote(e.target.value)} maxLength={1000} rows={3} style={inputStyle} placeholder="Select or paste the relevant passage" />
   <button type="button" onClick={useSelection}>Use selected text</button>
   <label htmlFor="correction-suggestion">Suggested correction</label><textarea id="correction-suggestion" value={suggestion} onChange={e => setSuggestion(e.target.value)} maxLength={2000} rows={3} style={inputStyle} placeholder="What should it say instead?" />
   <label htmlFor="correction-details">Additional context (optional)</label><textarea id="correction-details" value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={2} style={inputStyle} placeholder="Explain why this needs correction" />
   <button type="button" disabled={busy || !quote.trim() || !suggestion.trim()} onClick={() => void submitCorrection()} style={{ padding: '0.65rem 1rem', borderRadius: 8 }}>Send to author</button>
  </>}
  {tab === 'questions' && <>
   <p>Ask a question about this book or chapter. Your question and the author’s reply are private to your account.</p>
   <label htmlFor="author-question">Your question</label><textarea id="author-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={1500} rows={4} style={inputStyle} placeholder="What would you like to ask the author?" />
   <button type="button" disabled={busy || question.trim().length < 5} onClick={() => void submitQuestion()} style={{ padding: '0.65rem 1rem', borderRadius: 8 }}>Send question</button>
   <h3>Your questions for Slayer</h3>
   {questions.length === 0 ? <p>No questions yet for this chapter.</p> : questions.map(q => <article key={q.id} style={{ padding: '0.8rem 0', borderTop: '1px solid #ddd' }}><strong>{q.status === 'answered' ? 'Answered' : 'Awaiting reply'} · {q.chapterTitle}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{q.question}</p>{q.answer && <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: '3px solid #69a7a6' }}><strong>Slayer’s reply</strong><p>{q.answer}</p></blockquote>}</article>)}
  </>}
  {tab === 'editions' && <>
   <h3>Published edition history</h3>
   {editions.length === 0 ? <p>No edition notes have been published yet.</p> : editions.map(e => <article key={e.id} style={{ padding: '0.8rem 0', borderTop: '1px solid #ddd' }}><strong>{e.edition}</strong><p>{e.changeSummary}</p><small>{new Date(e.publishedAt).toLocaleDateString()}</small></article>)}
  </>}
  {message && <p role="status" aria-live="polite" style={{ marginTop: 12 }}>{message}</p>}
 </section>;
}
