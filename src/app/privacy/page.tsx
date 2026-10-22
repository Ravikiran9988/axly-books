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
          <h2 className={styles.sectionHeading}>2. Data We Process in Phase 1</h2>
          <p>
            During Phase 1 (Frontend Foundation), AXLY functions primarily on client-side storage:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Reading Preferences:</strong> Chosen theme (Dark, Light, Sepia), font sizes,
              and line spacing are kept strictly in your local browser storage.
            </li>
            <li>
              <strong>Reading Progress & Bookmarks:</strong> Saved chapters, percentages, and
              bookmarks are persisted locally on your device.
            </li>
            <li>
              <strong>Account Information:</strong> Reader registration and login in Phase 1 use a
              client-side simulation to allow feature evaluation without sending credentials to an
              unauthenticated server.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Phase 2 Backend Evolution</h2>
          <p>
            When the production backend is connected in Phase 2, readers who choose to create an
            account will have their reading progress securely synchronized across devices via encrypted
            API channels. Passwords will be hashed using industry-standard cryptographic algorithms
            (e.g., Argon2 or bcrypt).
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
