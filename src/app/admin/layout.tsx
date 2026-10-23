import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  ExternalLink,
  ShieldCheck,
  User,
  MessageCircle,
  Star,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import styles from './admin.module.css';

export const instant = false;

export const metadata = {
  title: 'Admin Dashboard — AXLY Books',
  description: 'Authorized Content Management System for AXLY Books.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Enforce server-side role check
  if (!user) {
    redirect('/login?returnTo=' + encodeURIComponent('/admin'));
  }

  if (user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.sidebarBrandLogo}>
            <ShieldCheck size={20} />
          </div>
          <div className={styles.sidebarBrandText}>
            <span className={styles.sidebarBrandTitle}>AXLY CMS</span>
            <span className={styles.sidebarBrandSubtitle}>Admin Panel</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Administrator navigation">
          <span className={styles.navSectionTitle}>Management</span>
          <Link href="/admin" className={styles.navLink}>
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </Link>
          <Link href="/admin/books" className={styles.navLink}>
            <BookOpen size={18} />
            <span>Books & Chapters</span>
          </Link>
          <Link href="/admin/comments" className={styles.navLink}>
            <MessageCircle size={18} />
            <span>Reader Comments</span>
          </Link>
          <Link href="/admin/reviews" className={styles.navLink}>
            <Star size={18} />
            <span>Book Reviews</span>
          </Link>
          <Link href="/admin/corrections" className={styles.navLink}>
            <MessageCircle size={18} />
            <span>Reader Corrections</span>
          </Link>

          <span className={styles.navSectionTitle}>Navigation</span>
          <Link href="/dashboard" className={styles.navLink}>
            <User size={18} />
            <span>Reader Dashboard</span>
          </Link>
          <Link href="/" className={styles.navLink} target="_blank">
            <ExternalLink size={18} />
            <span>View Public Site</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminUserPill}>
            <div className={styles.adminAvatar}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.displayName}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-brand-cyan)' }}>
                Administrator
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
