import { NextResponse } from 'next/server';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { resetPasswordSchema } from '@/lib/validations';
import { hashPassword, hashToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = await checkRateLimitAsync(`reset_pw_${ip}`, 5, 15 * 60 * 1000);
    if (rateCheck.unavailable) {
      return NextResponse.json(
        { error: 'Security rate limiting is temporarily unavailable. Please try again shortly.' },
        { status: 503, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        {
          error: `Too many reset attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parseResult = resetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid reset data.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, newPassword } = parseResult.data;
    const tokenHash = hashToken(token);
    const now = new Date();

    if (isDatabaseConfigured() && db) {
      const resetRecords = await db
        .select()
        .from(schema.passwordResets)
        .where(
          and(
            eq(schema.passwordResets.tokenHash, tokenHash),
            gt(schema.passwordResets.expiresAt, now),
            isNull(schema.passwordResets.usedAt)
          )
        )
        .limit(1);

      if (resetRecords.length === 0) {
        return NextResponse.json(
          { error: 'The password reset token is invalid or has expired.' },
          { status: 400 }
        );
      }

      const resetRecord = resetRecords[0];
      const newHash = await hashPassword(newPassword);

      // Claim the reset token and update the password in one SQL statement. The
      // conditional UPDATE makes redemption single-use even for concurrent requests.
      // Data-modifying CTEs also ensure sessions are revoked only if the token was claimed.
      const rawResult = await db.execute(sql`
        WITH claimed_token AS (
          UPDATE "password_resets"
          SET "used_at" = ${now}
          WHERE "id" = ${resetRecord.id}
            AND "token_hash" = ${tokenHash}
            AND "expires_at" > ${now}
            AND "used_at" IS NULL
          RETURNING "user_id"
        ),
        updated_user AS (
          UPDATE "users"
          SET "password_hash" = ${newHash}, "updated_at" = ${now}
          WHERE "id" IN (SELECT "user_id" FROM claimed_token)
          RETURNING "id"
        ),
        revoked_sessions AS (
          DELETE FROM "sessions"
          WHERE "user_id" IN (SELECT "id" FROM updated_user)
          RETURNING "id"
        )
        SELECT COUNT(*)::int AS updated_count FROM updated_user
      `);
      const resultRows = (rawResult as unknown as { rows?: Array<{ updated_count: number | string }> }).rows
        ?? (Array.isArray(rawResult) ? rawResult as unknown as Array<{ updated_count: number | string }> : []);
      if (Number(resultRows[0]?.updated_count ?? 0) !== 1) {
        return NextResponse.json(
          { error: 'The password reset token is invalid or has expired.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Your password has been successfully reset. You may now sign in.',
      });
    }

    // In-memory fallback
    const record = inMemoryStore.resets.get(tokenHash);
    if (!record || record.expiresAt <= now || record.used) {
      return NextResponse.json(
        { error: 'The password reset token is invalid or has expired.' },
        { status: 400 }
      );
    }

    const user = inMemoryStore.users.get(record.userId);
    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Consume the token before awaiting bcrypt so two concurrent requests cannot both
    // pass the same in-memory token check. Failure is fail-closed: the token stays consumed.
    record.used = true;
    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;

    // Invalidate all other unused reset links and sessions for this user.
    for (const [hash, reset] of inMemoryStore.resets.entries()) {
      if (reset.userId === record.userId && !reset.used) inMemoryStore.resets.delete(hash);
    }
    for (const [hash, sess] of inMemoryStore.sessions.entries()) {
      if (sess.userId === record.userId) inMemoryStore.sessions.delete(hash);
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You may now sign in.',
    });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
