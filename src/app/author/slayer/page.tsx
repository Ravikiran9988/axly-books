import React from 'react';
import {
  ExternalLink,
  Mail,
  GraduationCap,
  Code2,
  Feather,
  Compass,
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/SocialIcons';
import styles from './author.module.css';

export const metadata = {
  title: 'About Slayer (Medicharla Ravi Kiran) — Author Profile · AXLY',
  description:
    'Meet Slayer (Medicharla Ravi Kiran), an independent creator focused on AI, machine learning, Generative AI, and full-stack development.',
};

export default function AuthorProfilePage() {
  return (
    <div className={`container ${styles.authorPage}`}>
      {/* Hero Profile Banner */}
      <section className={styles.heroProfile}>
        <div className={styles.avatarContainer}>
          <div className={styles.avatarShield}>
            <div className={styles.avatarMonogram}>S</div>
            <span className={styles.avatarSub}>AXLY Author</span>
          </div>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.penNamePill}>
            <Feather size={14} />
            <span>Official Author Identity</span>
          </div>

          <h1 className={styles.fullName}>
            Medicharla Ravi Kiran <br />
            <span className={styles.penName}>(Slayer)</span>
          </h1>

          <p className={styles.roleTitle}>
            Independent Author · AI/ML Engineer · Full-Stack Developer
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <GraduationCap size={16} color="var(--color-brand-cyan)" />
              <span>B.Tech in CSE · Vaagdevi College of Engineering</span>
            </div>
            <div className={styles.metaItem}>
              <Code2 size={16} color="var(--color-brand-cyan)" />
              <span>40+ Public Repositories · 1250+ GitHub Contributions</span>
            </div>
          </div>

          <div className={styles.linksBar}>
            <a
              href="https://github.com/Ravikiran9988/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <GithubIcon size={15} />
              <span>GitHub Profile</span>
              <ExternalLink size={13} />
            </a>

            <a
              href="https://www.linkedin.com/in/medicharla-ravi-kiran/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <LinkedinIcon size={15} />
              <span>LinkedIn Profile</span>
              <ExternalLink size={13} />
            </a>

            <a href="mailto:ravikiran@axly.in" className="btn btn-outline btn-sm">
              <Mail size={15} />
              <span>ravikiran@axly.in</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Editorial Grid */}
      <div className={styles.editorialGrid}>
        {/* Main Content Column */}
        <div className={styles.mainColumn}>
          {/* Biography Block */}
          <section className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <Feather size={20} color="var(--color-brand-cyan)" />
              <span>About Slayer</span>
            </h2>

            <p className={styles.bioParagraph}>
              I&apos;m <strong>Medicharla Ravi Kiran</strong>, known by the pen name{' '}
              <strong>Slayer</strong>. I&apos;m an independent creator, AI/ML engineer, and full-stack
              developer with a B.Tech in Computer Science and Engineering from Vaagdevi College of
              Engineering, Warangal.
            </p>

            <p className={styles.bioParagraph}>
              My work spans Artificial Intelligence, Machine Learning, Deep Learning, Generative AI,
              and full-stack development. I enjoy building practical software, exploring emerging
              technologies, and turning complex technical concepts into clear, structured learning
              experiences.
            </p>

            <p className={styles.bioParagraph}>
              I maintain a portfolio of <strong>40+ public GitHub repositories</strong> and recorded{' '}
              <strong>1250+ GitHub contributions</strong>, reflecting my ongoing development
              activity and commitment to learning by building.
            </p>

            <p className={styles.bioParagraph}>
              Through AXLY, I want to make knowledge more accessible and create a welcoming space for
              people to explore ideas, develop technical skills, and learn at their own pace.
            </p>

            <p className={styles.bioParagraph}>
              I believe knowledge becomes more valuable when it is communicated clearly and shared
              openly. My goal is to keep learning, building, and helping others grow through technology
              and accessible educational resources.
            </p>

          </section>

          {/* Writing Philosophy Block */}
          <section className={styles.sectionBlock}>
            <h2 className={styles.sectionTitle}>
              <Compass size={20} color="var(--color-brand-cyan)" />
              <span>Writing Philosophy</span>
            </h2>

            <div className={styles.philosophyGrid}>
              <div className={styles.philosophyCard}>
                <span className={styles.philosophyCardTitle}>Make Knowledge Accessible</span>
                <p className={styles.philosophyCardDesc}>
                  Eliminate gatekeeping by publishing clear, free online editions that any curious
                  student or professional can study.
                </p>
              </div>

              <div className={styles.philosophyCard}>
                <span className={styles.philosophyCardTitle}>
                  Explain Ideas Clearly & Systematically
                </span>
                <p className={styles.philosophyCardDesc}>
                  Build bottom-up conceptual foundations, guiding the reader logically without
                  abrupt jumps in complexity.
                </p>
              </div>

              <div className={styles.philosophyCard}>
                <span className={styles.philosophyCardTitle}>
                  Connect Theory with Practical Code
                </span>
                <p className={styles.philosophyCardDesc}>
                  Every abstract mathematical principle is anchored with vector operations and
                  production-ready Python implementations.
                </p>
              </div>

              <div className={styles.philosophyCard}>
                <span className={styles.philosophyCardTitle}>Encourage Continuous Learning</span>
                <p className={styles.philosophyCardDesc}>
                  Demystify evolving breakthroughs such as Transformers and modern LLMs to empower
                  builders in this new era of software.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Side Column: Verified Information & Background */}
        <aside className={styles.sideColumn}>
          {/* Education Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Education</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Degree</span>
              <span className={styles.infoValue}>B.Tech in Computer Science and Engineering</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Institution</span>
              <span className={styles.infoValue}>
                Vaagdevi College of Engineering, Warangal
              </span>
            </div>
          </div>

          {/* Professional Background Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Areas of Practice</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Core Disciplines</span>
              <span className={styles.infoValue}>
                Artificial Intelligence & Machine Learning
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Specializations</span>
              <span className={styles.infoValue}>
                Generative AI, Deep Learning, Full-Stack Development
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Code Portfolio</span>
              <span className={styles.infoValue}>40+ Public Repositories · 1250+ Contributions</span>
            </div>
          </div>

          {/* Contact Verification Card */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Direct Contact</h3>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Contact Email</span>
              <a
                href="mailto:ravikiran@axly.in"
                className={styles.infoValue}
                style={{ color: 'var(--color-brand-cyan)', textDecoration: 'underline' }}
              >
                ravikiran@axly.in
              </a>
              <span className={styles.contactDisclaimer}>
                * Contact details may be updated as domain infrastructure develops.
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Repository</span>
              <a
                href="https://github.com/Ravikiran9988/axly-books"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.infoValue}
                style={{ color: 'var(--text-secondary)' }}
              >
                github.com/Ravikiran9988/axly-books
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
