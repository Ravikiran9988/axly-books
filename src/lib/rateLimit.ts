import { sql } from 'drizzle-orm';
import { isIP } from 'node:net';
import { db, isDatabaseConfigured } from '@/db';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const UNAVAILABLE_RETRY_AFTER_SECONDS = 60;

// In-memory token bucket / sliding window store for local development and tests only.
const ipStore = new Map<string, RateLimitRecord>();

if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (now > record.resetAt) ipStore.delete(key);
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  /**
   * True when a coordinated rate-limit decision could not be made.
   * Sensitive endpoints should return 503 rather than treating this as a normal 429.
   */
  unavailable?: boolean;
}

function unavailableRateLimitResult(): RateLimitResult {
  return {
    isAllowed: false,
    remaining: 0,
    retryAfterSeconds: UNAVAILABLE_RETRY_AFTER_SECONDS,
    unavailable: true,
  };
}

/**
 * Process-local limiter for development and deterministic unit tests.
 * Do not use this as the production enforcement mechanism.
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = ipStore.get(identifier);

  if (!record || now > record.resetAt) {
    ipStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return {
      isAllowed: true,
      remaining: Math.max(0, maxAttempts - 1),
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= maxAttempts) {
    return {
      isAllowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    isAllowed: true,
    remaining: Math.max(0, maxAttempts - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Shared production limiter.
 * The PostgreSQL upsert and increment happen atomically so concurrent serverless
 * requests cannot bypass the configured threshold through a check-then-update race.
 *
 * Production fails closed when Neon or the rate-limit table is unavailable.
 * Local development/tests retain the process-local fallback.
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  if (!isDatabaseConfigured() || !db) {
    if (process.env.NODE_ENV === 'production') {
      return unavailableRateLimitResult();
    }
    return checkRateLimit(identifier, maxAttempts, windowMs);
  }

  try {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    const result = await db.execute<{
      count: number | string;
      reset_at: string | Date;
    }>(sql`
      INSERT INTO "rate_limits" ("key", "count", "reset_at", "updated_at")
      VALUES (${identifier}, 1, ${resetAt.toISOString()}, ${now.toISOString()})
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "rate_limits"."reset_at" <= ${now.toISOString()}::timestamptz THEN 1
          ELSE "rate_limits"."count" + 1
        END,
        "reset_at" = CASE
          WHEN "rate_limits"."reset_at" <= ${now.toISOString()}::timestamptz THEN ${resetAt.toISOString()}::timestamptz
          ELSE "rate_limits"."reset_at"
        END,
        "updated_at" = ${now.toISOString()}::timestamptz
      RETURNING "count", "reset_at";
    `);

    const rawRows =
      (result as unknown as { rows?: Array<{ count: number | string; reset_at: string | Date }> })
        ?.rows || (Array.isArray(result) ? result : []);

    if (rawRows.length === 0) {
      throw new Error('Rate-limit query returned no decision row.');
    }

    const row = rawRows[0];
    const currentCount = Number(row.count);
    const resetTime = new Date(row.reset_at).getTime();

    if (!Number.isFinite(currentCount) || !Number.isFinite(resetTime)) {
      throw new Error('Rate-limit query returned invalid data.');
    }

    const isAllowed = currentCount <= maxAttempts;
    return {
      isAllowed,
      remaining: Math.max(0, maxAttempts - currentCount),
      retryAfterSeconds: isAllowed
        ? 0
        : Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)),
    };
  } catch (err: unknown) {
    const errorName = err instanceof Error ? err.name : 'UnknownError';
    console.error(`[SECURITY] Shared rate limiter failed (${errorName}).`);

    if (process.env.NODE_ENV === 'production') {
      // Never weaken a sensitive endpoint's production limit on DB failure.
      return unavailableRateLimitResult();
    }

    return checkRateLimit(identifier, maxAttempts, windowMs);
  }
}

/**
 * Resolve the client IP in a hosting-aware manner. Prefer platform-provided
 * headers and validate the result; configure trusted proxy handling at deploy time.
 */
export function getClientIp(headers: Headers): string {
  // Vercel overwrites these headers at its edge, making them safer for rate limiting
  // than a caller-supplied arbitrary header. Do not trust x-vercel-ip: that prefix is
  // used for geolocation headers (for example, x-vercel-ip-country), not the client IP.
  const trustedCandidates = [
    headers.get('x-real-ip'),
    headers.get('x-vercel-forwarded-for'),
    headers.get('x-forwarded-for'),
  ];
  for (const value of trustedCandidates) {
    const candidate = value?.split(',')[0]?.trim();
    if (candidate && isValidIpFormat(candidate)) return candidate;
  }

  return '127.0.0.1';
}

function isValidIpFormat(ip: string): boolean {
  return isIP(ip) !== 0;
}
