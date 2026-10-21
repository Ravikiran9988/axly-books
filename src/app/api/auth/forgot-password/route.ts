import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { hashToken, generateSecureToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = checkRateLimit(`forgot_pw_${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    let userId: string | null = null;

    if (isDatabaseConfigured() && db) {
      const records = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);

      if (records.length > 0) {
        userId = records[0].id;
      }
    } else {
      for (const u of inMemoryStore.users.values()) {
        if (u.email === normalizedEmail) {
          userId = u.id;
          break;
        }
      }
    }

    if (userId) {
      const rawResetToken = generateSecureToken();
      const tokenHash = hashToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      if (isDatabaseConfigured() && db) {
        await db.insert(schema.passwordResets).values({
          id: `reset_${crypto.randomUUID()}`,
          userId,
          tokenHash,
          expiresAt,
        });
      } else {
        inMemoryStore.resets.set(tokenHash, {
          userId,
          expiresAt,
          used: false,
        });
      }

      // Note: In production Phase 2 with transactional email provider (e.g. Resend / SendGrid),
      // the link with rawResetToken is emailed to the reader.
    }

    // Always return safe, generic message to prevent account enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, password recovery instructions have been dispatched.',
    });
  } catch (err: any) {
    console.error('Password reset request error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
