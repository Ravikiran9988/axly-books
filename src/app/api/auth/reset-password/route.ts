import { NextResponse } from 'next/server';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';
import { resetPasswordSchema } from '@/lib/validations';
import { hashPassword, hashToken, inMemoryStore } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateCheck = await checkRateLimitAsync(`reset_pw_${ip}`, 5, 15 * 60 * 1000);
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

      // Update user password
      await db
        .update(schema.users)
        .set({
          passwordHash: newHash,
          updatedAt: now,
        })
        .where(eq(schema.users.id, resetRecord.userId));

      // Mark token as used
      await db
        .update(schema.passwordResets)
        .set({
          usedAt: now,
        })
        .where(eq(schema.passwordResets.id, resetRecord.id));

      // Invalidate all active sessions for security
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, resetRecord.userId));

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

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    record.used = true;

    // Invalidate sessions in memory
    for (const [hash, sess] of inMemoryStore.sessions.entries()) {
      if (sess.userId === record.userId) {
        inMemoryStore.sessions.delete(hash);
      }
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
