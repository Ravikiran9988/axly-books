import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { hashToken, generateSecureToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = await checkRateLimitAsync(`forgot_pw_${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
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

    // In production, check if an email provider (e.g. Resend) is configured
    const isEmailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);

    if (process.env.NODE_ENV === 'production' && !isEmailConfigured) {
      return NextResponse.json(
        {
          error:
            'Password recovery email delivery is currently not configured on this server. Please contact author Slayer at ravikiran@axly.in for password recovery assistance.',
        },
        { status: 503 }
      );
    }

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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${rawResetToken}`;

      if (isEmailConfigured && process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || 'AXLY Books <onboarding@resend.dev>',
              to: [normalizedEmail],
              subject: 'Reset your AXLY Books Password',
              html: `<p>Hello,</p><p>We received a request to reset your password on AXLY Books.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link is valid for 1 hour. If you did not request this, please ignore this email.</p>`,
            }),
          });
        } catch (emailErr) {
          console.error('Failed to dispatch reset email via provider:', emailErr);
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // In local development, print link to console for immediate developer access
        console.log(`\n🔑 [DEV ONLY] Password reset link for ${normalizedEmail}:`);
        console.log(`   ${resetUrl}\n`);
      }
    }

    // Honest messaging
    const message = isEmailConfigured
      ? 'If an account exists with this email address, password recovery instructions have been dispatched.'
      : 'Password recovery request registered. (Development notice: email provider is not configured; check server console for reset link).';

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err: unknown) {
    console.error('Password reset request error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
