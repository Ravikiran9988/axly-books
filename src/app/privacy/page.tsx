import React from 'react';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Privacy Notice — AXLY Books',
  description: 'Understand how AXLY handles reader preferences, account details, and reading data.',
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Privacy Notice</h1>
        <span className={styles.effectiveDate}>Effective Date: October 2026</span>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Overview & Philosophy</h2>
          <p>
            AXLY is an independent author-led digital reading platform founded by Slayer (Medicharla
            Ravi Kiran). We believe in distraction-free, respectful learning. We do not sell reader
            data, do not run third-party advertising networks, and do not profile reading behavior for
            commercial exploitation.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. Data We Process</h2>
          <p>
            AXLY Books processes minimal data strictly necessary to deliver an exceptional reading experience:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Reading Preferences:</strong> Chosen theme (Dark, Light, Sepia), font sizes,
              and line spacing to personalize your reading interface.
            </li>
            <li>
              <strong>Reading Progress & Bookmarks:</strong> Saved chapters, reading percentages, and
              bookmarks to allow seamless resumption across sessions.
            </li>
            <li>
              <strong>Account Information:</strong> For registered readers, account credentials (email and
              cryptographically hashed passwords) and session tokens to secure your personal library.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Security & Data Protection</h2>
          <p>
            All passwords are salted and hashed using industry-standard bcrypt encryption before
            persisting. Network communication is conducted over encrypted TLS/HTTPS channels, and
            session tokens are protected with secure, HttpOnly cookie controls.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>4. Cookies and Local Storage</h2>
          <p>
            AXLY does not utilize third-party tracking cookies. We utilize standard browser{' '}
            <code>localStorage</code> strictly to preserve your visual reading preferences and progress
            between browser sessions.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>5. Contact the Author</h2>
          <div className={styles.contactBox}>
            If you have questions or inquiries regarding privacy practices at AXLY, you may contact
            author Slayer directly at{' '}
            <a
              href="mailto:ravikiran@axly.in"
              style={{ color: 'var(--color-brand-cyan)', textDecoration: 'underline' }}
            >
              ravikiran@axly.in
            </a>
            .
          </div>
        </section>
      </div>
    </div>
  );
}
