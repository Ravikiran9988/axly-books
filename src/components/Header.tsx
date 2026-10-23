'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, LogIn, LogOut, Menu, X, ChevronDown, BookmarkCheck, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { AuthState } from '@/types/user';
import styles from './Header.module.css';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setDropdownOpen(false);
    router.push('/');
  };

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {/* Brand */}
        <Link href="/" className={styles.brand} aria-label="AXLY Books Home">
          <div className={styles.brandLogo}>
            <span>A</span>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>AXLY</span>
            <span className={styles.brandSub}>BOOKS</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav} aria-label="Main Navigation">
          <Link
            href="/"
            className={`${styles.navLink} ${isActive('/') && pathname === '/' ? styles.navLinkActive : ''}`}
          >
            Home
          </Link>
          <Link
            href="/books"
            className={`${styles.navLink} ${isActive('/books') ? styles.navLinkActive : ''}`}
          >
            Books
          </Link>
          <Link
            href="/author/slayer"
            className={`${styles.navLink} ${isActive('/author/slayer') ? styles.navLinkActive : ''}`}
          >
            About the Author
          </Link>
          <Link
            href="/about"
            className={`${styles.navLink} ${isActive('/about') ? styles.navLinkActive : ''}`}
          >
            About AXLY
          </Link>
        </nav>

        {/* Actions & User State */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.searchBtn}
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              else router.push('/books');
            }}
            aria-label="Search books"
          >
            <Search size={16} />
            <span>Search books...</span>
            <kbd className={styles.searchKbd}>/</kbd>
          </button>

          {authState.isAuthenticated && authState.user ? (
            <div className={styles.userMenuWrapper} ref={dropdownRef}>
              <button
                type="button"
                className={styles.userBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="Reader account menu"
              >
                <div className={styles.userAvatar}>
                  {authState.user.displayName.charAt(0).toUpperCase()}
                </div>
                <span>{authState.user.displayName.split(' ')[0]}</span>
                <ChevronDown size={14} />
              </button>

              {dropdownOpen && (
                <div className={styles.userDropdown} role="menu">
                  {authState.user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className={styles.dropdownItem}
                      onClick={() => setDropdownOpen(false)}
                      role="menuitem"
                      style={{ color: 'var(--color-brand-cyan)' }}
                    >
                      <ShieldCheck size={16} />
                      <span>Admin CMS</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <LayoutDashboard size={16} />
                    <span>Reader Dashboard</span>
                  </Link>
                  <Link
                    href="/my-library"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <BookmarkCheck size={16} />
                    <span>My Library</span>
                  </Link>
                  <Link
                    href="/profile"
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                    role="menuitem"
                  >
                    <User size={16} />
                    <span>Reader Profile</span>
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authGroup}>
              <Link href="/login" className="btn btn-outline btn-sm">
                <LogIn size={15} />
                <span>Log In</span>
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                <span>Register</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <nav className={styles.mobileNav}>
            <Link
              href="/"
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/books"
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Library
            </Link>
            <Link
              href="/author/slayer"
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              About the Author (Slayer)
            </Link>
            <Link
              href="/about"
              className={styles.mobileNavLink}
              onClick={() => setMobileMenuOpen(false)}
            >
              About AXLY
            </Link>
            {authState.isAuthenticated ? (
              <>
                {authState.user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={styles.mobileNavLink}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: 'var(--color-brand-blue)', fontWeight: 600 }}
                  >
                    Admin CMS
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reader Dashboard
                </Link>
                <Link
                  href="/my-library"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Library & Progress
                </Link>
                <Link
                  href="/profile"
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reader Profile
                </Link>
                <button
                  type="button"
                  className={styles.mobileLogoutBtn}
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className={styles.mobileAuthRow}>
                <Link
                  href="/login"
                  className="btn btn-outline"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ flex: 1, justifyContent: 'center', width: '100%' }}
                >
                  <LogIn size={16} />
                  <span>Log In</span>
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ flex: 1, justifyContent: 'center', width: '100%' }}
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
