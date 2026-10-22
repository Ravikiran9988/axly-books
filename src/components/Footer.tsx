import React from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/SocialIcons';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        {/* Brand Column */}
        <div className={styles.brandCol}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>A</div>
            <span className={styles.brandName}>AXLY</span>
          </div>
          <p className={styles.brandDesc}>
            An independent digital reading platform dedicated to sharing thoughtful technical books
            and accessible learning—one page at a time.
          </p>
          <div className={styles.authorNote}>
            Written & published by <strong>Slayer</strong> (Medicharla Ravi Kiran).
          </div>
        </div>

        {/* Explore Links */}
        <div className={styles.col}>
          <span className={styles.colTitle}>Platform</span>
          <Link href="/books" className={styles.footerLink}>
            Book Library
          </Link>
          <Link href="/my-library" className={styles.footerLink}>
            My Library & Progress
          </Link>
          <Link href="/about" className={styles.footerLink}>
            About AXLY
          </Link>
          <Link href="/author/slayer" className={styles.footerLink}>
            Author Profile (Slayer)
          </Link>
        </div>

        {/* Legal & Account */}
        <div className={styles.col}>
          <span className={styles.colTitle}>Information</span>
          <Link href="/privacy" className={styles.footerLink}>
            Privacy Notice
          </Link>
          <Link href="/terms" className={styles.footerLink}>
            Terms of Use
          </Link>
          <Link href="/login" className={styles.footerLink}>
            Reader Sign In
          </Link>
          <Link href="/register" className={styles.footerLink}>
            Create Account
          </Link>
        </div>

        {/* Author & Contact */}
        <div className={styles.col}>
          <span className={styles.colTitle}>Connect with Author</span>
          <a
            href="mailto:ravikiran@axly.in"
            className={styles.contactEmail}
            title="Author email listed in book"
          >
            <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
            ravikiran@axly.in
          </a>
          <a
            href="https://github.com/Ravikiran9988/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            <GithubIcon size={14} className={styles.iconAlign} />
            GitHub Profile
          </a>
          <a
            href="https://www.linkedin.com/in/medicharla-ravi-kiran/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            <LinkedinIcon size={14} className={styles.iconAlign} />
            LinkedIn Profile
          </a>
        </div>
      </div>

      <div className={`container ${styles.bottomBar}`}>
        <div>
          © 2026 AXLY. All published works authored by Medicharla Ravi Kiran (Slayer). All rights reserved.
        </div>
        <div className={styles.domainHint}>
          books.axly.in · Independent Author Platform
        </div>
      </div>
    </footer>
  );
}
