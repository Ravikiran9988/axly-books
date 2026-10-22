'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Sliders,
  BookmarkCheck,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { progressService } from '@/services/progressService';
import { AuthState } from '@/types/user';
import { ReadingPreferences } from '@/types/reading';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [prefs, setPrefs] = useState<ReadingPreferences>(progressService.getPreferences());

  useEffect(() => {
    const unsubAuth = authService.subscribe((state) => {
      setAuthState(state);
    });

    const unsubProg = progressService.subscribe(() => {
      setPrefs(progressService.getPreferences());
    });

    return () => {
      unsubAuth();
      unsubProg();
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push('/');
  };

  const handleUpdateTheme = (theme: 'dark' | 'light' | 'sepia') => {
    const updated = progressService.savePreferences({ theme });
    setPrefs(updated);
  };

  const handleUpdateFontFamily = (fontFamily: 'serif' | 'sans' | 'mono') => {
    const updated = progressService.savePreferences({ fontFamily });
    setPrefs(updated);
  };

  if (!authState.isAuthenticated || !authState.user) {
    return (
      <div className={`container ${styles.profileContainer}`}>
        <div className={styles.cardSection} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              color: 'var(--text-muted)',
            }}
          >
            <User size={28} />
          </div>
          <h1 className={styles.profileName}>Reader Account Required</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
            Please sign in or create an account to view your reader profile, account details, and
            saved preferences.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <Link href="/login" className="btn btn-primary">
              <span>Sign In</span>
            </Link>
            <Link href="/register" className="btn btn-secondary">
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { user } = authState;
  const createdDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`container ${styles.profileContainer}`}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarBig}>{user.displayName.charAt(0).toUpperCase()}</div>
        <div className={styles.profileTitleWrap}>
          <h1 className={styles.profileName}>{user.displayName}</h1>
          <span className={styles.profileEmail}>{user.email}</span>
        </div>
      </div>

      {/* Account Information Card */}
      <div className={styles.cardSection}>
        <h2 className={styles.cardTitle}>
          <User size={20} color="var(--color-brand-cyan)" />
          <span>Account Overview</span>
        </h2>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Display Name</span>
            <span className={styles.infoValue}>{user.displayName}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user.email}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Account Status</span>
            <span className={styles.infoValue} style={{ color: 'var(--status-success)' }}>
              Active (Free Tier)
            </span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Reader Since</span>
            <span className={styles.infoValue}>{createdDate}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <Link href="/my-library" className="btn btn-secondary btn-sm">
            <BookmarkCheck size={16} />
            <span>Go to My Library</span>
          </Link>
          <button type="button" onClick={handleLogout} className="btn btn-outline btn-sm">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Reading Preferences Card */}
      <div className={styles.cardSection}>
        <h2 className={styles.cardTitle}>
          <Sliders size={20} color="var(--color-brand-cyan)" />
          <span>Reading Environment Defaults</span>
        </h2>

        <div className={styles.prefGroup}>
          <div className={styles.prefRow}>
            <div className={styles.prefLabel}>
              <span className={styles.prefTitle}>Reading Theme</span>
              <span className={styles.prefDesc}>Select background surface and contrast</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['dark', 'light', 'sepia'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn btn-sm ${prefs.theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleUpdateTheme(t)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefLabel}>
              <span className={styles.prefTitle}>Default Font Style</span>
              <span className={styles.prefDesc}>Choose typeface for long-form reading</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['serif', 'sans', 'mono'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`btn btn-sm ${
                    prefs.fontFamily === f ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={() => handleUpdateFontFamily(f)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {f === 'serif' ? 'Editorial' : f === 'sans' ? 'Modern' : 'Mono'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 Architecture Notice */}
      <div className={styles.authNotice}>
        <strong>Backend Migration Ready:</strong> In Phase 2, this reader profile will link directly
        with the production PostgreSQL / Supabase user store and sync preferences across multiple
        browsers and mobile devices.
      </div>
    </div>
  );
}
