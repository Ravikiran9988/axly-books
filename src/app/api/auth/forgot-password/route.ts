import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { hashToken, generateSecureToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rateLimit';

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const EMAIL_REQUEST_TIMEOUT_MS = 10_000;

function acceptedResetResponse() {
  // Deliberately identical for existing and unknown accounts to avoid account enumeration.
  // HTTP 202 means the request was accepted; it does not claim that an email was delivered.
  return NextResponse.json(
    {
      requestAccepted: true,
      message:
        'If an account exists for this email address, reset instructions will be sent if email delivery is available. If you do not receive an email, try again later.',
    },
    { status: 202 }
  );
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = await checkRateLimitAsync(`forgot_pw_${ip}`, 5, 15 * 60 * 1000);

    if (rateCheck.unavailable) {
      return NextResponse.json(
        { error: 'Security rate limiting is temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

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

    const normalizedEmail = parseResult.data.email.toLowerCase().trim();

    // Resend is the email provider implemented by this route. Do not treat SMTP_HOST
    // alone as configured because this code has no SMTP transport implementation.
    const resendApiKey = process.env.RESEND_API_KEY || process.env.AXLY_BOOKS_RESEND_API_KEY;
    if (process.env.NODE_ENV === 'production' && !resendApiKey) {
      return NextResponse.json(
        { error: 'Password recovery is temporarily unavailable because email delivery is not configured.' },
        { status: 503 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.NODE_ENV === 'production' && !appUrl) {
      return NextResponse.json(
        { error: 'Password recovery is temporarily unavailable due to server configuration.' },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Password recovery is temporarily unavailable because persistent storage is not configured.' },
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
      userId = records[0]?.id ?? null;
    } else {
      // Process-local records are only used in local development and tests.
      for (const user of inMemoryStore.users.values()) {
        if (user.email === normalizedEmail) {
          userId = user.id;
          break;
        }
      }
    }

    // Keep the same outward response regardless of whether the account exists.
    if (!userId) return acceptedResetResponse();

    const rawResetToken = generateSecureToken();
    const tokenHash = hashToken(rawResetToken);
    const resetRecordId = `reset_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);

    if (isDatabaseConfigured() && db) {
      await db.insert(schema.passwordResets).values({
        id: resetRecordId,
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

    if (resendApiKey) {
      const resetUrl = `${(appUrl || 'http://localhost:3000').replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawResetToken)}`;
      let providerAccepted = false;

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'AXLY Books <onboarding@resend.dev>',
            to: [normalizedEmail],
            subject: 'Reset your AXLY Books password',
            html:
              '<p>Hello,</p>' +
              '<p>We received a request to reset your AXLY Books password.</p>' +
              `<p><a href="${resetUrl}">Reset your password</a></p>` +
              '<p>This link expires in one hour. If you did not request this, you can ignore this email.</p>',
          }),
          signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
        });

        if (emailResponse.ok) {
          providerAccepted = true;
        } else {
          // Do not log provider response bodies; keep logs free of recipient or token data.
          console.error(
            `[PASSWORD RESET] Resend rejected the email request with HTTP ${emailResponse.status}.`
          );
        }
      } catch (emailError: unknown) {
        const errorName = emailError instanceof Error ? emailError.name : 'UnknownError';
        console.error(`[PASSWORD RESET] Resend request failed (${errorName}).`);
      }

      if (!providerAccepted) {
        // A reset link that was not accepted for delivery must not remain usable.
        await deleteResetToken(resetRecordId, tokenHash);
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // Development-only workflow: emit the link to the local server console, never the API response.
      console.log(`\n🔑 [DEV ONLY] Password reset link for ${normalizedEmail}:\n   ${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/reset-password?token=${rawResetToken}\n`);
    }

    // No response claims that an email was dispatched or delivered. A 202 response
    // is returned uniformly to avoid revealing whether the email belongs to an account.
    return acceptedResetResponse();
  } catch (err: unknown) {
    console.error(
      '[PASSWORD RESET] Request processing failed.',
      err instanceof Error ? err.name : 'UnknownError'
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the password reset request.' },
      { status: 500 }
    );
  }
}

async function deleteResetToken(resetRecordId: string, tokenHash: string): Promise<void> {
  try {
    if (isDatabaseConfigured() && db) {
      await db.delete(schema.passwordResets).where(eq(schema.passwordResets.id, resetRecordId));
    } else {
      inMemoryStore.resets.delete(tokenHash);
    }
  } catch (cleanupError: unknown) {
    console.error(
      '[PASSWORD RESET] Failed to invalidate undelivered reset token.',
      cleanupError instanceof Error ? cleanupError.name : 'UnknownError'
    );
  }
}
