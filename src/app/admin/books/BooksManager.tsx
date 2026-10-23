'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  Trash2,
  Edit2,
  Globe,
  Lock,
  X,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import styles from '../admin.module.css';

interface BookItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  synopsis: string;
  category: string;
  tags: string[];
  edition: string;
  publishedYear: number;
  coverImageUrl: string;
  isPublished: boolean;
  totalChapters: number;
}

interface BooksManagerProps {
  initialBooks: BookItem[];
}

export default function BooksManager({ initialBooks }: BooksManagerProps) {
  const [books, setBooks] = useState<BookItem[]>(initialBooks);
  const [activeTab, setActiveTab] = useState<'All' | 'Published' | 'Draft'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [deletingBook, setDeletingBook] = useState<BookItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.error || 'Failed to upload image.');
        return;
      }

      setFormData((prev) => ({ ...prev, coverImageUrl: json.url }));
      showToast('success', 'Cover image uploaded and URL updated successfully!');
    } catch {
      showToast('error', 'Network error during file upload.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    subtitle: '',
    description: '',
    synopsis: '',
    category: 'Artificial Intelligence & Machine Learning',
    tags: 'Machine Learning, Deep Learning, Python',
    edition: 'First Edition (2026)',
    publishedYear: 2026,
    coverImageUrl: '/images/ml-deep-learning-cover.jpg',
    isPublished: false,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setFormData({
      title: '',
      slug: '',
      subtitle: '',
      description: '',
      synopsis: '',
      category: 'Artificial Intelligence & Machine Learning',
      tags: 'Machine Learning, Deep Learning, Python',
      edition: 'First Edition (2026)',
      publishedYear: 2026,
      coverImageUrl: '/images/ml-deep-learning-cover.jpg',
      isPublished: false,
    });
    setIsCreateOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (book: BookItem) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      slug: book.slug,
      subtitle: book.subtitle,
      description: book.description,
      synopsis: book.synopsis,
      category: book.category,
      tags: Array.isArray(book.tags) ? book.tags.join(', ') : '',
      edition: book.edition,
      publishedYear: book.publishedYear,
      coverImageUrl: book.coverImageUrl,
      isPublished: book.isPublished,
    });
  };

  // Title -> Slug auto-fill helper
  const handleTitleChange = (val: string) => {
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: isCreateOpen ? slugified : prev.slug,
    }));
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to create book.');
        setIsSubmitting(false);
        return;
      }

      setBooks((prev) => [data.book, ...prev]);
      setIsCreateOpen(false);
      showToast('success', `Book "${data.book.title}" was created successfully.`);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      const res = await fetch(`/api/admin/books/${editingBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to update book.');
        setIsSubmitting(false);
        return;
      }

      setBooks((prev) => prev.map((b) => (b.id === editingBook.id ? { ...b, ...data.book } : b)));
      setEditingBook(null);
      showToast('success', `Book "${data.book.title}" was updated.`);
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async (book: BookItem) => {
    try {
      const res = await fetch(`/api/admin/books/${book.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !book.isPublished }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to update publication status.');
        return;
      }

      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, isPublished: data.isPublished } : b))
      );
      showToast('success', data.message);
    } catch {
      showToast('error', 'Network error while updating publish status.');
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingBook) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/books/${deletingBook.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to delete book.');
        setIsSubmitting(false);
        return;
      }

      setBooks((prev) => prev.filter((b) => b.id !== deletingBook.id));
      showToast(
        data.storageCleanupWarning ? 'error' : 'success',
        data.storageCleanupWarning
          ? `${data.message} ${data.storageCleanupWarning}`
          : data.message || `Deleted "${deletingBook.title}".`
      );
      setDeletingBook(null);
    } catch {
      showToast('error', 'Network error while deleting book.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter books
  const filteredBooks = books.filter((b) => {
    if (activeTab === 'Published' && !b.isPublished) return false;
    if (activeTab === 'Draft' && b.isPublished) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      return (
        b.title.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleBox}>
          <h1 className={styles.pageTitle}>Book Management</h1>
          <p className={styles.pageDesc}>
            Manage digital books, update metadata, control publication state, and access chapters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/books/import" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Upload size={16} />
            <span>Import from PDF</span>
          </Link>
          <button type="button" onClick={handleOpenCreate} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Create New Book</span>
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

      {/* Toolbar */}
      <div className={styles.toolbarRow}>
        <div className={styles.filterTabs}>
          {(['All', 'Published', 'Draft'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.filterTab} ${activeTab === tab ? styles.filterTabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({tab === 'All' ? books.length : tab === 'Published' ? books.filter((b) => b.isPublished).length : books.filter((b) => !b.isPublished).length})
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books by title, slug..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Books Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Book</th>
              <th>Category</th>
              <th>Chapters</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  No books found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>
                    <div className={styles.bookTitleCol}>
                      <Image
                        src={book.coverImageUrl || '/images/ml-deep-learning-cover.jpg'}
                        alt={book.title}
                        width={44}
                        height={60}
                        className={styles.bookThumbnail}
                      />
                      <div>
                        <div className={styles.bookTitleText}>{book.title}</div>
                        <div className={styles.bookSlugText}>/{book.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{book.category}</td>
                  <td>
                    <Link
                      href={`/admin/books/${book.id}/chapters`}
                      style={{ color: 'var(--color-brand-cyan)', textDecoration: 'underline' }}
                    >
                      {book.totalChapters} chapters
                    </Link>
                  </td>
                  <td>
                    {book.isPublished ? (
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
                      <Link
                        href={`/admin/books/${book.id}/chapters`}
                        className={styles.btnAction}
                        title="Manage chapters"
                      >
                        <FileText size={14} />
                        <span>Chapters</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(book)}
                        className={styles.btnAction}
                        title={book.isPublished ? 'Unpublish (Move to Draft)' : 'Publish (Make Live)'}
                      >
                        {book.isPublished ? <Lock size={14} /> : <Globe size={14} />}
                        <span>{book.isPublished ? 'Unpublish' : 'Publish'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(book)}
                        className={styles.btnAction}
                        title="Edit metadata"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>

                      <Link
                        href={`/books/${book.slug}`}
                        target="_blank"
                        className={styles.btnAction}
                        title="Preview reader page"
                      >
                        <Eye size={14} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeletingBook(book)}
                        className={`${styles.btnAction} ${styles.btnActionDanger}`}
                        title="Delete book"
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

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingBook) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isCreateOpen ? 'Create New Publication' : `Edit: ${editingBook?.title}`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingBook(null);
                }}
                className={styles.btnAction}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit}>
              <div className={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. ML + Deep Learning Fundamentals"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })
                    }
                    placeholder="e.g. ml-deep-learning-fundamentals"
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g. Full Beginner to GenAI Edition"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Edition</label>
                  <input
                    type="text"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Cover Image URL *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      value={formData.coverImageUrl}
                      onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                      placeholder="/images/ml-deep-learning-cover.jpg or https://..."
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    <label
                      className="btn btn-secondary btn-sm"
                      style={{
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        margin: 0,
                      }}
                    >
                      <Upload size={14} />
                      <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Enter an HTTPS link/local path, or click &ldquo;Upload File&rdquo; to store in Vercel Blob (JPEG, PNG, WebP up to 5MB).
                  </span>
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Machine Learning, PyTorch, Generative AI"
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Short Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Concise overview of the book shown on cards..."
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label className="form-label">Detailed Synopsis *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.synopsis}
                    onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                    placeholder="Full educational synopsis displayed on book detail page..."
                    className="form-input"
                  />
                </div>

                <div className={`form-group ${styles.formFull}`}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      disabled={isCreateOpen}
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {isCreateOpen
                        ? 'Publish after adding chapters'
                        : 'Publish Immediately (Make visible to public readers)'}
                    </span>
                  </label>
                  {isCreateOpen && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      New books start as drafts. Add and publish at least one chapter before publishing the book.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingBook(null);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                  {isSubmitting ? 'Saving...' : isCreateOpen ? 'Create Book' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBook && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-error)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Confirm Book Deletion
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{deletingBook.title}&rdquo;</strong>?
              This permanently deletes the book, chapters, comments, bookmarks, and reading progress.
              Vercel Blob files used only by this book will also be removed when storage cleanup is available.
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeletingBook(null)}
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
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
