'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { authService } from '@/services/authService';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    const res = await authService.requestPasswordReset(email);
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.error || 'Failed to dispatch password recovery instructions.');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Password Recovery</h1>
          <p className={styles.authSub}>
            Enter the email associated with your reader account to receive recovery instructions.
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {submitted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--status-success-bg)',
                color: 'var(--status-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <MailCheck size={28} />
            </div>
            <div className={styles.successBanner}>
              Recovery instructions have been dispatched to <strong>{email}</strong>.
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Please check your inbox (including your spam folder) and follow the link to reset your password.
            </p>
            <Link href="/login" className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
              <ArrowLeft size={16} />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="recovery-email" className="form-label">
                Registered Email
              </label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@example.com"
                className="form-input"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? (
                <span>Sending recovery instructions...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Recovery Instructions</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className={styles.authFooter}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
