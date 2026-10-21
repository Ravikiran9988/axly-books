import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { eq, and, gt } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';

export const SESSION_COOKIE_NAME = 'axly_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: Date;
}

// In-memory fallback session and user store when DATABASE_URL is not yet configured
const inMemoryUsers = new Map<string, any>();
const inMemorySessions = new Map<string, { userId: string; expiresAt: Date }>();
const inMemoryPasswordResets = new Map<string, { userId: string; expiresAt: Date; used: boolean }>();

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
    // In-memory fallback for local development without DB configured
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
    return {
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    };
  } else {
    // In-memory fallback
    const session = inMemorySessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    const user = inMemoryUsers.get(session.userId);
    if (!user) return null;

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role || 'reader',
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

    return validateSessionToken(sessionCookie.value);
  } catch (err) {
    return null;
  }
}

/**
 * Destroys a session, invalidating the session token.
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

// Helpers for in-memory mock store access
export const inMemoryStore = {
  users: inMemoryUsers,
  sessions: inMemorySessions,
  resets: inMemoryPasswordResets,
};
