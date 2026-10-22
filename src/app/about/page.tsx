import React from 'react';
import Link from 'next/link';
import { BookOpen, Navigation, BookmarkCheck, HeartHandshake, ArrowRight } from 'lucide-react';
import styles from './about.module.css';

export const metadata = {
  title: 'About AXLY — Independent Digital Publishing Platform',
  description:
    'Learn about AXLY, an independent publishing initiative created by author Slayer to share thoughtful technical books and ideas online for free.',
};

export default function AboutPage() {
  return (
    <div className={`container ${styles.aboutContainer}`}>
      {/* Header */}
      <div className={styles.heroHeader}>
        <span className={styles.heroTag}>Our Mission</span>
        <h1 className={styles.heroTitle}>A Dedicated Sanctuary for Ideas and Learning</h1>
        <p className={styles.heroSubtitle}>
          AXLY is an independent digital publishing platform created to bridge the author&apos;s
          written works with curious readers worldwide—removing friction, paywalls, and distractions.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className={styles.valuesGrid}>
        <div className={styles.valueCard}>
          <div className={styles.valueIcon}>
            <BookOpen size={22} />
          </div>
          <h2 className={styles.valueTitle}>Free Online Reading</h2>
          <p className={styles.valueText}>
            Published volumes are accessible online without upfront charges, subscriptions, or
            hidden paywalls. High quality educational literature should be open to all who wish to
            learn.
          </p>
        </div>

        <div className={styles.valueCard}>
          <div className={styles.valueIcon}>
            <Navigation size={22} />
          </div>
          <h2 className={styles.valueTitle}>Thoughtful Navigation</h2>
          <p className={styles.valueText}>
            Enjoy a fluid, chapter-by-chapter reading interface with instant table-of-contents
            access, keyboard navigation, and responsive typography tuned for long-form study.
          </p>
        </div>

        <div className={styles.valueCard}>
          <div className={styles.valueIcon}>
            <BookmarkCheck size={22} />
          </div>
          <h2 className={styles.valueTitle}>Continuous Progress Tracking</h2>
          <p className={styles.valueText}>
            Never lose your place between study sessions. Registered readers enjoy automatic reading
            position persistence and customizable chapter bookmarks.
          </p>
        </div>

        <div className={styles.valueCard}>
          <div className={styles.valueIcon}>
            <HeartHandshake size={22} />
          </div>
          <h2 className={styles.valueTitle}>Direct Author Connection</h2>
          <p className={styles.valueText}>
            Every book on AXLY is crafted and directly published by author Slayer, offering clear,
            unmediated technical insights and pragmatic engineering frameworks.
          </p>
        </div>
      </div>

      {/* Story Narrative */}
      <div className={styles.storyBlock}>
        <h2 className={styles.storyTitle}>The Author Behind AXLY</h2>
        <p>
          AXLY was conceptualised and built by <strong>Medicharla Ravi Kiran</strong> (writing under
          the pen name <strong>Slayer</strong>), an AI/ML engineer and full-stack developer who
          graduated with a B.Tech in Computer Science and Engineering from Vaagdevi College of
          Engineering, Warangal.
        </p>
        <p>
          Having authored <em>ML + Deep Learning Fundamentals — Full Beginner to GenAI Edition</em>,
          Slayer sought to create a platform that prioritised the reader experience above all else.
          Rather than placing technical books behind opaque marketplaces or cluttered PDF readers,
          AXLY provides an interactive, bespoke environment designed specifically for technical
          prose, code examples, and mathematical foundations.
        </p>
        <p>
          As an independent initiative, AXLY remains committed to knowledge accessibility, clean
          editorial presentation, and continuous improvement.
        </p>

        <div style={{ marginTop: '1rem' }}>
          <Link href="/author/slayer" className="btn btn-primary">
            <span>Explore Complete Author Biography</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Independent Entity Note */}
      <div className={styles.disclaimerBanner}>
        <strong>Platform Notice:</strong> AXLY is an independent author-led publishing project and
        digital library created to showcase published works by Slayer. It is not an incorporated
        commercial bookstore or retail entity.
      </div>
    </div>
  );
}
