import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/auth';

const INITIAL_AUTHOR_PROFILE = {
  id: 'author_slayer',
  penName: 'Slayer',
  fullName: 'Medicharla Ravi Kiran',
  roleTitle: 'Independent Author · AI/ML Engineer · Full-Stack Developer',
  bio: `I'm Medicharla Ravi Kiran, writing under the pen name Slayer. I'm an AI/ML engineer and full-stack developer with a B.Tech in Computer Science and Engineering from Vaagdevi College of Engineering, Warangal.

My work spans Artificial Intelligence, Machine Learning, Deep Learning, Generative AI, and full-stack development. I enjoy building practical software, exploring emerging technologies, and turning complex technical concepts into clear, structured learning experiences.

I maintain a portfolio of 40+ public GitHub repositories and recorded 1250+ GitHub contributions, reflecting my ongoing development activity and commitment to learning by building.

Through writing, I aim to organise knowledge, explain technical concepts, and make learning more approachable — creating a structured path from essential data tools and foundational principles toward neural networks, Transformers, and modern Generative AI.

I believe knowledge becomes more valuable when it is communicated clearly and made accessible to others. AXLY is my space for sharing ideas, learning resources, and educational publications.`,
  educationDegree: 'B.Tech in Computer Science and Engineering',
  educationInstitution: 'Vaagdevi College of Engineering, Warangal',
  githubUrl: 'https://github.com/Ravikiran9988/',
  linkedinUrl: 'https://www.linkedin.com/in/medicharla-ravi-kiran/',
  email: 'ravikiran@axly.in',
  projectsCount: 40,
  githubContributions: 1250,
  writingPhilosophy: [
    {
      title: 'Make Knowledge Accessible',
      description: 'Eliminate gatekeeping by publishing clear, free online editions that any curious student or professional can study.',
    },
    {
      title: 'Explain Ideas Clearly & Systematically',
      description: 'Build bottom-up conceptual foundations, guiding the reader logically without abrupt jumps in complexity.',
    },
    {
      title: 'Connect Theory with Practical Code',
      description: 'Every abstract mathematical principle is anchored with vector operations and production-ready Python implementations.',
    },
    {
      title: 'Encourage Continuous Learning',
      description: 'Demystify evolving breakthroughs such as Transformers and modern LLMs to empower builders in this new era of software.',
    },
  ],
};

let inMemoryAuthor = { ...INITIAL_AUTHOR_PROFILE };

export async function GET() {
  try {
    if (isDatabaseConfigured() && db) {
      const records = await db
        .select()
        .from(schema.authors)
        .where(eq(schema.authors.penName, 'Slayer'))
        .limit(1);

      if (records.length > 0) {
        return NextResponse.json({ success: true, author: records[0] });
      }
    }

    return NextResponse.json({ success: true, author: inMemoryAuthor });
  } catch (err: unknown) {
    console.error('Fetch author error:', err);
    return NextResponse.json({ success: true, author: inMemoryAuthor });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    // Author profile management is restricted to the administrator
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required to modify author biography.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const now = new Date();

    // Preserve immutable brand attributes: Brand AXLY and Pen Name Slayer can never be altered
    const updates = {
      bio: body.bio || inMemoryAuthor.bio,
      roleTitle: body.roleTitle || inMemoryAuthor.roleTitle,
      writingPhilosophy: body.writingPhilosophy || inMemoryAuthor.writingPhilosophy,
      updatedAt: now,
    };

    if (isDatabaseConfigured() && db) {
      await db
        .update(schema.authors)
        .set(updates)
        .where(eq(schema.authors.penName, 'Slayer'));
    } else {
      inMemoryAuthor = { ...inMemoryAuthor, ...updates };
    }

    return NextResponse.json({ success: true, author: { ...inMemoryAuthor, ...updates } });
  } catch (err: unknown) {
    console.error('Update author error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving author profile.' },
      { status: 500 }
    );
  }
}
