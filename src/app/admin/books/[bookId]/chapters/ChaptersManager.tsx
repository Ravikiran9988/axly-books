'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import styles from '../../../admin.module.css';

interface ChapterSection {
  title: string;
  content: string;
  codeSnippet?: { language: string; code: string };
  callout?: { type: 'tip' | 'note' | 'concept'; text: string };
}

interface ChapterItem {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  slug: string;
  summary: string;
  content: ChapterSection[];
  estimatedReadingTimeMinutes: number;
  isPublished: boolean;
}

interface BookDetails {
  id: string;
  slug: string;
  title: string;
  totalChapters: number;
}

interface ChaptersManagerProps {
  book: BookDetails;
  initialChapters: ChapterItem[];
}

export default function ChaptersManager({ book, initialChapters }: ChaptersManagerProps) {
  const [chapters, setChapters] = useState<ChapterItem[]>(initialChapters);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterItem | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<ChapterItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    chapterNumber: number;
    title: string;
    slug: string;
    summary: string;
    estimatedReadingTimeMinutes: number;
    isPublished: boolean;
    sections: ChapterSection[];
  }>({
    chapterNumber: initialChapters.length + 1,
    title: '',
    slug: '',
    summary: '',
    estimatedReadingTimeMinutes: 15,
    isPublished: true,
    sections: [
      {
        title: 'Introduction',
        content: '',
      },
    ],
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenCreate = () => {
    const nextNumber =
      chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapterNumber)) + 1
        : 1;

    setFormData({
      chapterNumber: nextNumber,
      title: '',
      slug: `chapter-${nextNumber}-`,
      summary: '',
      estimatedReadingTimeMinutes: 15,
      isPublished: true,
      sections: [
        {
          title: 'Introduction',
          content: '',
        },
      ],
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ch: ChapterItem) => {
    setEditingChapter(ch);
    setFormData({
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      slug: ch.slug,
      summary: ch.summary,
      estimatedReadingTimeMinutes: ch.estimatedReadingTimeMinutes,
      isPublished: ch.isPublished,
      sections: Array.isArray(ch.content) && ch.content.length > 0 ? ch.content : [{ title: 'Section 1', content: '' }],
    });
  };

  const handleTitleChange = (val: string) => {
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: isCreateOpen ? `chapter-${prev.chapterNumber}-${slugified}` : prev.slug,
    }));
  };

  // Section handling
  const handleAddSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: `Section ${prev.sections.length + 1}`,
          content: '',
        },
      ],
    }));
  };

  const handleRemoveSection = (idx: number) => {
    if (formData.sections.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx),
    }));
  };

  const handleSectionChange = (idx: number, field: string, val: string) => {
    setFormData((prev) => {
      const nextSecs = [...prev.sections];
      nextSecs[idx] = { ...nextSecs[idx], [field]: val };
      return { ...prev, sections: nextSecs };
    });
  };

  const handleSectionSnippetChange = (idx: number, language: string, code: string) => {
    setFormData((prev) => {
      const nextSecs = [...prev.sections];
      if (!code.trim()) {
        delete nextSecs[idx].codeSnippet;
      } else {
        nextSecs[idx] = {
          ...nextSecs[idx],
          codeSnippet: { language: language || 'python', code },
        };
      }
      return { ...prev, sections: nextSecs };
    });
  };

  const handleSectionCalloutChange = (idx: number, type: 'tip' | 'note' | 'concept', text: string) => {
    setFormData((prev) => {
      const nextSecs = [...prev.sections];
      if (!text.trim()) {
        delete nextSecs[idx].callout;
      } else {
        nextSecs[idx] = {
          ...nextSecs[idx],
          callout: { type, text },
        };
      }
      return { ...prev, sections: nextSecs };
    });
  };

  // Submit Create Chapter
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        chapterNumber: Number(formData.chapterNumber),
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        summary: formData.summary.trim(),
        estimatedReadingTimeMinutes: Number(formData.estimatedReadingTimeMinutes),
        isPublished: formData.isPublished,
        content: formData.sections,
      };

      const res = await fetch(`/api/admin/books/${book.id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to create chapter.');
        setIsSubmitting(false);
        return;
      }

      setChapters((prev) =>
        [...prev, data.chapter].sort((a, b) => a.chapterNumber - b.chapterNumber)
      );
      setIsCreateOpen(false);
      showToast('success', `Chapter ${data.chapter.chapterNumber} was created.`);
    } catch {
      showToast('error', 'Network error while creating chapter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Chapter
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter) return;
    setIsSubmitting(true);

    try {
      const payload = {
        chapterNumber: Number(formData.chapterNumber),
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        summary: formData.summary.trim(),
        estimatedReadingTimeMinutes: Number(formData.estimatedReadingTimeMinutes),
        isPublished: formData.isPublished,
        content: formData.sections,
      };

      const res = await fetch(`/api/admin/books/${book.id}/chapters/${editingChapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to update chapter.');
        setIsSubmitting(false);
        return;
      }

      setChapters((prev) =>
        prev
          .map((c) => (c.id === editingChapter.id ? { ...c, ...data.chapter } : c))
          .sort((a, b) => a.chapterNumber - b.chapterNumber)
      );
      setEditingChapter(null);
      showToast('success', `Chapter ${data.chapter.chapterNumber} updated.`);
    } catch {
      showToast('error', 'Network error while updating chapter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Chapter
  const handleDeleteConfirm = async () => {
    if (!deletingChapter) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/books/${book.id}/chapters/${deletingChapter.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to delete chapter.');
        setIsSubmitting(false);
        return;
      }

      setChapters((prev) => prev.filter((c) => c.id !== deletingChapter.id));
      showToast('success', data.message || `Deleted Chapter ${deletingChapter.chapterNumber}.`);
      setDeletingChapter(null);
    } catch {
      showToast('error', 'Network error while deleting chapter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Link
              href="/admin/books"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-brand-cyan)', padding: 0 }}
            >
              <ArrowLeft size={16} />
              <span>Back to Books</span>
            </Link>
          </div>
          <h1 className={styles.pageTitle}>Chapters: {book.title}</h1>
          <p className={styles.pageDesc}>
            Manage and author structured chapter contents, code snippets, and callout blocks.
          </p>
        </div>

        <div>
          <button type="button" onClick={handleOpenCreate} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Add Chapter</span>
          </button>
        </div>
      </header>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`${styles.alertBox} ${
            feedback.type === 'error' ? styles.alertError : styles.alertSuccess
          }`}
          style={{ marginBottom: '1.5rem' }}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Chapters Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Chapter Title & Slug</th>
              <th>Sections</th>
              <th>Est. Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {chapters.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  No chapters authored yet for this book. Click &quot;Add Chapter&quot; to begin.
                </td>
              </tr>
            ) : (
              chapters.map((ch) => (
                <tr key={ch.id}>
                  <td style={{ fontWeight: 700, width: '40px' }}>{ch.chapterNumber}</td>
                  <td>
                    <div>
                      <div className={styles.bookTitleText}>{ch.title}</div>
                      <div className={styles.bookSlugText}>slug: {ch.slug}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {ch.summary.slice(0, 75)}...
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Layers size={14} color="var(--color-brand-cyan)" />
                      {Array.isArray(ch.content) ? ch.content.length : 0} sections
                    </span>
                  </td>
                  <td>~{ch.estimatedReadingTimeMinutes} min</td>
                  <td>
                    {ch.isPublished ? (
                      <span className={styles.badgePublished}>
                        <CheckCircle size={12} />
                        Published
                      </span>
                    ) : (
                      <span className={styles.badgeDraft}>
                        <Clock size={12} />
                        Draft
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionButtonGroup}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ch)}
                        className={styles.btnAction}
                        title="Edit chapter content"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>

                      <Link
                        href={`/read/${book.slug}?chapter=${ch.slug}`}
                        target="_blank"
                        className={styles.btnAction}
                        title="Preview in reader"
                      >
                        <Eye size={14} />
                        <span>Preview</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeletingChapter(ch)}
                        className={`${styles.btnAction} ${styles.btnActionDanger}`}
                        title="Delete chapter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Chapter Modal */}
      {(isCreateOpen || editingChapter) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '820px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isCreateOpen
                  ? `Add Chapter to "${book.title}"`
                  : `Edit Chapter ${editingChapter?.chapterNumber}: ${editingChapter?.title}`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingChapter(null);
                }}
                className={styles.btnAction}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit}>
              <div className={styles.formGrid}>
                <div className="form-group" style={{ maxWidth: '120px' }}>
                  <label className="form-label">Chapter # *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.chapterNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, chapterNumber: Number(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chapter Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Foundations of Machine Learning"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chapter Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })
                    }
                    placeholder="e.g. chapter-1-foundations-of-ml"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Est. Reading Time (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.estimatedReadingTimeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedReadingTimeMinutes: Number(e.target.value),
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Chapter Summary *</label>
                  <textarea
                    required
                    rows={2}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Brief 1-2 sentence overview shown in the table of contents..."
                    className="form-input"
                  />
                </div>

                {/* Structured Sections Builder */}
                <div className={`form-group ${styles.formFull}`} style={{ marginTop: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <label className="form-label" style={{ margin: 0 }}>
                      Chapter Content Sections ({formData.sections.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={14} />
                      <span>Add Section</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {formData.sections.map((section, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-brand-cyan)' }}>
                            Section {idx + 1}
                          </span>
                          {formData.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(idx)}
                              className={styles.btnAction}
                              style={{ color: '#fca5a5' }}
                            >
                              <X size={14} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          required
                          value={section.title}
                          onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                          placeholder="Section Heading (e.g. 1.1 The Machine Learning Paradigm)"
                          className="form-input"
                        />

                        <textarea
                          required
                          rows={3}
                          value={section.content}
                          onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                          placeholder="Section paragraph text explaining technical concept..."
                          className="form-input"
                        />

                        {/* Optional Code Snippet */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Optional Code Snippet (Python / JS)
                          </label>
                          <textarea
                            rows={3}
                            value={section.codeSnippet?.code || ''}
                            onChange={(e) =>
                              handleSectionSnippetChange(
                                idx,
                                section.codeSnippet?.language || 'python',
                                e.target.value
                              )
                            }
                            placeholder="import numpy as np..."
                            className="form-input"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                          />
                        </div>

                        {/* Optional Callout Box */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Optional Conceptual Callout Note
                          </label>
                          <input
                            type="text"
                            value={section.callout?.text || ''}
                            onChange={(e) =>
                              handleSectionCalloutChange(
                                idx,
                                section.callout?.type || 'concept',
                                e.target.value
                              )
                            }
                            placeholder="Key takeaway or tip for the reader..."
                            className="form-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Publish Chapter Immediately
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingChapter(null);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                  {isSubmitting ? 'Saving...' : isCreateOpen ? 'Add Chapter' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingChapter && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-error)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                Confirm Chapter Deletion
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Are you sure you want to delete{' '}
              <strong>
                Chapter {deletingChapter.chapterNumber}: &ldquo;{deletingChapter.title}&rdquo;
              </strong>
              ? This action is permanent and cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeletingChapter(null)}
                className="btn btn-secondary btn-sm"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-sm"
                style={{ background: 'var(--status-error)', color: '#ffffff', border: 'none' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
