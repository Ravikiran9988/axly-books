import { after, NextResponse } from 'next/server';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { hashToken, generateSecureToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rateLimit';

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const EMAIL_REQUEST_TIMEOUT_MS = 10_000;
const EMAIL_RESET_LIMIT = 3;
const EMAIL_RESET_WINDOW_MS = 60 * 60 * 1000;

function acceptedResetResponse() {
  // Every valid request receives the same response before account lookup, token creation,
  // database writes, or email delivery. This avoids account-existence timing differences.
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
    const ipRateCheck = await checkRateLimitAsync(`forgot_pw_ip_${ip}`, 5, 15 * 60 * 1000);

    if (ipRateCheck.unavailable) {
      return NextResponse.json(
        { error: 'Security rate limiting is temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': String(ipRateCheck.retryAfterSeconds) } }
      );
    }

    if (!ipRateCheck.isAllowed) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${ipRateCheck.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(ipRateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = parseResult.data.email.toLowerCase().trim();
    // Key email-based limits with a one-way hash so clear-text addresses are not stored
    // in the shared rate-limit table. A limit hit returns the same 202 as an unknown email.
    const emailLimitKey = `forgot_pw_email_${hashToken(normalizedEmail)}`;
    const emailRateCheck = await checkRateLimitAsync(emailLimitKey, EMAIL_RESET_LIMIT, EMAIL_RESET_WINDOW_MS);

    if (emailRateCheck.unavailable) {
      return NextResponse.json(
        { error: 'Security rate limiting is temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': String(emailRateCheck.retryAfterSeconds) } }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY || process.env.AXLY_BOOKS_RESEND_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const emailFrom = process.env.EMAIL_FROM;

    if (process.env.NODE_ENV === 'production' && (!resendApiKey || !appUrl || !emailFrom)) {
      return NextResponse.json(
        { error: 'Password recovery is temporarily unavailable because email delivery is not fully configured.' },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === 'production' && (!isDatabaseConfigured() || !db)) {
      return NextResponse.json(
        { error: 'Password recovery is temporarily unavailable because persistent storage is not configured.' },
        { status: 503 }
      );
    }

    // Do not disclose account existence through different request timing. The callback
    // performs the lookup, token rotation, and email send only after the 202 response.
    if (emailRateCheck.isAllowed && resendApiKey && appUrl) {
      after(async () => {
        await createAndSendResetEmail(
          normalizedEmail,
          resendApiKey,
          appUrl,
          emailFrom || 'AXLY Books <onboarding@resend.dev>'
        );
      });
    }

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

async function createAndSendResetEmail(
  normalizedEmail: string,
  resendApiKey: string,
  appUrl: string,
  emailFrom: string
): Promise<void> {
  let resetRecordId: string | null = null;
  let tokenHash: string | null = null;

  try {
    let userId: string | null = null;
    if (isDatabaseConfigured() && db) {
      const records = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);
      userId = records[0]?.id ?? null;
    } else if (process.env.NODE_ENV !== 'production') {
      for (const user of inMemoryStore.users.values()) {
        if (user.email === normalizedEmail) {
          userId = user.id;
          break;
        }
      }
    }

    // Unknown accounts perform no token or email work but have already received the
    // same response, at the same point in the request lifecycle, as known accounts.
    if (!userId) return;

    const rawResetToken = generateSecureToken();
    tokenHash = hashToken(rawResetToken);
    resetRecordId = `reset_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      // Rotate reset links: only the newest unused token for a user should remain active.
      // The partial unique index in migration 0005 protects this invariant under races.
      await db.delete(schema.passwordResets).where(
        and(eq(schema.passwordResets.userId, userId), isNull(schema.passwordResets.usedAt))
      );
      await db.insert(schema.passwordResets).values({
        id: resetRecordId,
        userId,
        tokenHash,
        expiresAt,
      });
    } else {
      for (const [oldHash, record] of inMemoryStore.resets.entries()) {
        if (record.userId === userId && !record.used) inMemoryStore.resets.delete(oldHash);
      }
      inMemoryStore.resets.set(tokenHash, { userId, expiresAt, used: false });
    }

    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawResetToken)}`;
    let providerAccepted = false;
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
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
      providerAccepted = emailResponse.ok;
      if (!providerAccepted) {
        console.error(`[PASSWORD RESET] Resend rejected the email request with HTTP ${emailResponse.status}.`);
      }
    } catch (emailError: unknown) {
      console.error('[PASSWORD RESET] Resend request failed.', emailError instanceof Error ? emailError.name : 'UnknownError');
    }

    if (!providerAccepted && tokenHash) {
      await deleteResetToken(resetRecordId, tokenHash);
    }
  } catch (error: unknown) {
    console.error('[PASSWORD RESET] Deferred reset processing failed.', error instanceof Error ? error.name : 'UnknownError');
    if (resetRecordId && tokenHash) await deleteResetToken(resetRecordId, tokenHash);
  }
}

async function deleteResetToken(resetRecordId: string | null, tokenHash: string): Promise<void> {
  try {
    if (isDatabaseConfigured() && db && resetRecordId) {
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
