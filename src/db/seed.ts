import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { PUBLISHED_BOOKS } from '../data/booksData';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (
    !databaseUrl ||
    !databaseUrl.startsWith('postgres') ||
    databaseUrl.includes('placeholder_neon_database_url') ||
    databaseUrl.includes('placeholder_user') ||
    databaseUrl.includes('placeholder_password')
  ) {
    console.log('⚠️  DATABASE_URL is not set or contains placeholder. Skipping live Neon seed.');
    console.log(
      '👉 To run the seed against your Neon PostgreSQL database, configure DATABASE_URL in .env.local and run: npm run db:seed'
    );
    process.exit(0);
  }

  console.log('🌱 Connecting to Neon PostgreSQL...');
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  const now = new Date();

  // 1. Seed Slayer Author Profile
  console.log('👤 Seeding Slayer Author Profile...');
  const authorId = 'author_slayer';
  await db
    .insert(schema.authors)
    .values({
      id: authorId,
      penName: 'Slayer',
      fullName: 'Medicharla Ravi Kiran',
      roleTitle: 'Independent Author · AI/ML Engineer · Full-Stack Developer',
      bio: `I'm Medicharla Ravi Kiran, writing under the pen name Slayer. I'm an AI/ML engineer and full-stack developer with a B.Tech in Computer Science and Engineering from Vaagdevi College of Engineering, Warangal.

My work spans Artificial Intelligence, Machine Learning, Generative AI, and full-stack development. My development journey includes more than 10 projects and over 700 GitHub contributions, as documented in my book.

Through writing, I aim to organise knowledge, explain technical concepts, and make learning more approachable. My book, ML + Deep Learning Fundamentals, presents a structured path from essential data tools and machine learning concepts toward neural networks, Transformers, and modern Generative AI.

Through AXLY, I want to create a place where readers can discover my books, access published works for free, and continue learning at their own pace.

I believe knowledge becomes more valuable when it is communicated clearly and made accessible to others. AXLY is my space for sharing ideas, learning resources, and books—one page at a time.`,
      educationDegree: 'B.Tech in Computer Science and Engineering',
      educationInstitution: 'Vaagdevi College of Engineering, Warangal',
      githubUrl: 'https://github.com/Ravikiran9988/',
      linkedinUrl: 'https://www.linkedin.com/in/medicharla-ravi-kiran/',
      email: 'ravikiran@axly.in',
      projectsCount: 10,
      githubContributions: 700,
      writingPhilosophy: [
        {
          title: 'Make Knowledge Accessible',
          description:
            'Eliminate gatekeeping by publishing clear, free online editions that any curious student or professional can study.',
        },
        {
          title: 'Explain Ideas Clearly & Systematically',
          description:
            'Build bottom-up conceptual foundations, guiding the reader logically without abrupt jumps in complexity.',
        },
        {
          title: 'Connect Theory with Practical Code',
          description:
            'Every abstract mathematical principle is anchored with vector operations and production-ready Python implementations.',
        },
        {
          title: 'Encourage Continuous Learning',
          description:
            'Demystify evolving breakthroughs such as Transformers and modern LLMs to empower builders in this new era of software.',
        },
      ],
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.authors.penName,
      set: {
        fullName: 'Medicharla Ravi Kiran',
        roleTitle: 'Independent Author · AI/ML Engineer · Full-Stack Developer',
        email: 'ravikiran@axly.in',
        updatedAt: now,
      },
    });

  // 2. Seed Published Books & Chapters (Safe & Idempotent: does NOT overwrite admin edits)
  console.log('📚 Seeding Published Books (Idempotent: preserving custom administrator edits)...');
  for (const book of PUBLISHED_BOOKS) {
    await db
      .insert(schema.books)
      .values({
        id: book.id,
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        synopsis: book.synopsis,
        authorName: book.author,
        authorId,
        coverImageUrl: book.coverImage,
        category: book.category,
        tags: book.tags,
        edition: book.edition,
        publishedYear: book.publishedYear,
        status: book.publicationStatus,
        isFree: book.isFree,
        isPublished: true,
        totalChapters: book.totalChapters,
        estimatedReadingTimeMinutes: book.estimatedReadingTimeMinutes,
        allowPdfDownload: book.allowPdfDownload,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: schema.books.slug,
      });

    // 3. Seed Chapters for this book (idempotent, does not overwrite admin edits)
    console.log(`📖 Ensuring ${book.chapters.length} core chapters exist for "${book.title}"...`);
    for (const ch of book.chapters) {
      await db
        .insert(schema.chapters)
        .values({
          id: ch.id,
          bookId: book.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          slug: ch.slug,
          summary: ch.summary,
          content: ch.sections,
          estimatedReadingTimeMinutes: ch.readingTimeMinutes,
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [schema.chapters.bookId, schema.chapters.slug],
        });
    }
  }

  console.log('✅ Database seeded safely! Preserved all administrator content while ensuring baseline books.');
}

main().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
