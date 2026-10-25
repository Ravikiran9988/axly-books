'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { authService } from '@/services/authService';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Please provide a display name (at least 2 characters).');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms of Use and Privacy Notice to register.');
      return;
    }

    setLoading(true);
    const res = await authService.register(displayName, email, password);
    setLoading(false);

    if (res.success) {
      router.push('/my-library');
    } else {
      setError(res.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Create Free Account</h1>
          <p className={styles.authSub}>
            Save your reading progress, bookmark chapters, and resume seamlessly.
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-name" className="form-label">
              Display Name
            </label>
            <input
              id="reg-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Chen"
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-email" className="form-label">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reader@example.com"
              className="form-input"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-password" className="form-label">
              Password (min. 8 characters)
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-confirm-password" className="form-label">
              Confirm Password
            </label>
            <input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              autoComplete="new-password"
              required
            />
          </div>

          <div className={styles.checkboxRow}>
            <input
              id="reg-terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className={styles.checkbox}
              required
            />
            <label htmlFor="reg-terms">
              I agree to the <Link href="/terms">Terms of Use</Link> and have reviewed the{' '}
              <Link href="/privacy">Privacy Notice</Link>.
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? (
              <span>Registering account...</span>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Create Reader Account</span>
              </>
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          Already registered? <Link href="/login">Sign in to your account</Link>
        </div>
      </div>
    </div>
  );
}
