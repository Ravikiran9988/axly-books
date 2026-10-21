import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { registerSchema } from '@/lib/validations';
import {
  hashPassword,
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  inMemoryStore,
} from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = checkRateLimit(`register_${ip}`, 8, 15 * 60 * 1000);
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { displayName, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    if (isDatabaseConfigured() && db) {
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email address already exists.' },
          { status: 409 }
        );
      }
    } else {
      for (const u of inMemoryStore.users.values()) {
        if (u.email === normalizedEmail) {
          return NextResponse.json(
            { error: 'An account with this email address already exists.' },
            { status: 409 }
          );
        }
      }
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${crypto.randomUUID()}`;
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      await db.insert(schema.users).values({
        id: userId,
        displayName,
        email: normalizedEmail,
        passwordHash,
        role: 'reader',
        createdAt: now,
        updatedAt: now,
      });

      // Initialize default reader preferences
      await db.insert(schema.readerPreferences).values({
        userId,
        fontSize: 18,
        lineHeight: 1.75,
        readingTheme: 'dark',
        fontFamily: 'serif',
        distractionFree: false,
        updatedAt: now,
      });
    } else {
      inMemoryStore.users.set(userId, {
        id: userId,
        displayName,
        email: normalizedEmail,
        passwordHash,
        role: 'reader',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create session and set HTTP-only cookie
    const rawSessionToken = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          displayName,
          email: normalizedEmail,
          role: 'reader',
          createdAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while registering. Please try again.' },
      { status: 500 }
    );
  }
}
