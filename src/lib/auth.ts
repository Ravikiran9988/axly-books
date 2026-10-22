import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { UserRole } from '@/types/user';

export const SESSION_COOKIE_NAME = 'axly_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface InMemoryUserRecord {
  id: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
}

// In-memory fallback session and user store for local unit testing and development when DATABASE_URL is unconfigured
const inMemoryUsers = new Map<string, InMemoryUserRecord>();
const inMemorySessions = new Map<string, { userId: string; expiresAt: Date }>();
const inMemoryPasswordResets = new Map<
  string,
  { userId: string; expiresAt: Date; used: boolean }
>();

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Creates a new authenticated session for a user and returns the raw session token.
 */
export async function createSession(userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  if (isDatabaseConfigured() && db) {
    const sessionId = `sess_${crypto.randomUUID()}`;
    await db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      tokenHash,
      expiresAt,
    });
  } else {
    // In production, persistent storage is strictly required
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database is not configured. Sessions cannot be persisted in production.');
    }
    // In-memory fallback for local tests/development
    inMemorySessions.set(tokenHash, { userId, expiresAt });
  }

  return rawToken;
}

/**
 * Validates a raw session token and returns the authenticated user if valid.
 */
export async function validateSessionToken(rawToken: string): Promise<AuthenticatedUser | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  if (isDatabaseConfigured() && db) {
    const matching = await db
      .select({
        user: schema.users,
        session: schema.sessions,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
      .where(and(eq(schema.sessions.tokenHash, tokenHash), gt(schema.sessions.expiresAt, now)))
      .limit(1);

    if (matching.length === 0) return null;

    const u = matching[0].user;
    const role: UserRole = u.role === 'admin' ? 'admin' : 'reader';
    return {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role,
      createdAt: u.createdAt,
    };
  } else {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    const session = inMemorySessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    const user = inMemoryUsers.get(session.userId);
    if (!user) return null;

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'reader',
      createdAt: user.createdAt,
    };
  }
}

/**
 * Retrieves the currently authenticated user from incoming HTTP cookies.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    return await validateSessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Destroys a session on the server, invalidating the session token.
 */
export async function destroySession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);

  if (isDatabaseConfigured() && db) {
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, tokenHash));
  } else {
    inMemorySessions.delete(tokenHash);
  }
}

/**
 * Reusable server-side helper to require an authenticated user.
 * Returns either `{ user }` or `{ errorResponse }` with HTTP 401.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser } | { errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please log in to proceed.' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Reusable server-side helper to require an administrator role.
 * Returns either `{ user }` or `{ errorResponse }` with HTTP 401 or HTTP 403.
 */
export async function requireAdmin(): Promise<
  { user: AuthenticatedUser } | { errorResponse: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please log in with administrator credentials.' },
        { status: 401 }
      ),
    };
  }
  if (user.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Administrator privileges are required to perform this action.' },
        { status: 403 }
      ),
    };
  }
  return { user };
}

/**
 * Verifies that the requesting user owns the specific record,
 * or possesses the administrator role for override privileges.
 */
export function assertRecordOwnership(
  resourceOwnerId: string,
  requestingUserId: string,
  requestingUserRole?: UserRole
): boolean {
  if (requestingUserRole === 'admin') return true;
  return resourceOwnerId === requestingUserId;
}

// Helpers for test suite and development mock store access
export const inMemoryStore = {
  users: inMemoryUsers,
  sessions: inMemorySessions,
  resets: inMemoryPasswordResets,
};
