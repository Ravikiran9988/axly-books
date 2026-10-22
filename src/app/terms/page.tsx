import React from 'react';
import styles from '../legal.module.css';

export const metadata = {
  title: 'Terms of Use — AXLY Books',
  description: 'Terms and conditions governing the use of the AXLY digital book reading platform.',
};

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Terms of Use</h1>
        <span className={styles.effectiveDate}>Effective Date: October 2026</span>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>1. Acceptance of Terms</h2>
          <p>
            By accessing or reading works published on AXLY (including the books written by Slayer /
            Medicharla Ravi Kiran), you acknowledge and agree to comply with these Terms of Use.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>2. Intellectual Property & Copyright</h2>
          <p>
            All book texts, diagrams, instructional curricula, and chapter contents published on
            AXLY—including but not limited to <em>ML + Deep Learning Fundamentals — Full Beginner to
            GenAI Edition</em>—are the intellectual property and copyright of author{' '}
            <strong>Medicharla Ravi Kiran (Slayer)</strong>.
          </p>
          <p>
            You are granted a non-exclusive, non-transferable, revocable license to view and read
            these publications online for personal, educational, and non-commercial purposes.
            Reproduction, bulk scraping, re-hosting, or commercial redistribution of published
            manuscripts without express written authorization is strictly prohibited.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>3. Free Access Model</h2>
          <p>
            Currently, AXLY offers free online access to published reading materials. The platform
            does not process credit card transactions or paid subscriptions during this initial
            phase.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>4. Reader Accounts & Conduct</h2>
          <p>
            Readers creating accounts are expected to provide accurate information and safeguard
            their access credentials. AXLY reserves the right to suspend or terminate accounts that
            attempt to compromise platform security or abuse interactive reading services.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>5. Disclaimer of Warranties</h2>
          <p>
            All educational materials, code samples, and mathematical models are provided &ldquo;as
            is&rdquo; for conceptual and educational understanding. While every effort has been made to
            ensure technical accuracy, readers are responsible for testing code in isolated
            development environments.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>6. Inquiries</h2>
          <div className={styles.contactBox}>
            For publishing inquiries, copyright permissions, or educational licensing, reach out to
            author Slayer at{' '}
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
