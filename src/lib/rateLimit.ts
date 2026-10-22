import { sql } from 'drizzle-orm';
import { db, isDatabaseConfigured } from '@/db';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory token bucket / sliding window store for test & development fallbacks
const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale in-memory entries every 5 minutes without keeping event loop alive
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (now > record.resetAt) {
        ipStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Synchronous in-memory rate check (ideal for test environments and unit checks).
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = ipStore.get(identifier);

  if (!record || now > record.resetAt) {
    ipStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      isAllowed: true,
      remaining: Math.max(0, maxAttempts - 1),
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return {
      isAllowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfter),
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
 * Shared production rate limiter.
 * Executes an atomic PostgreSQL upsert and increment query against the Neon `rate_limits` table.
 * Avoids check-then-update race conditions under high concurrency across serverless functions.
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  if (isDatabaseConfigured() && db) {
    try {
      const now = new Date();
      const resetAt = new Date(now.getTime() + windowMs);

      // Atomic UPSERT + increment in a single statement
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

      if (rawRows.length > 0) {
        const row = rawRows[0];
        const currentCount = Number(row.count);
        const resetTime = new Date(row.reset_at).getTime();
        const isAllowed = currentCount <= maxAttempts;
        const retryAfter = isAllowed
          ? 0
          : Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

        return {
          isAllowed,
          remaining: Math.max(0, maxAttempts - currentCount),
          retryAfterSeconds: retryAfter,
        };
      }
    } catch (err: unknown) {
      console.warn(
        '[SECURITY] Coordinated rate limit check failed; utilizing emergency local instance throttle.',
        err instanceof Error ? err.message : err
      );
    }
  }

  return checkRateLimit(identifier, maxAttempts, windowMs);
}

/**
 * Resolves client IP address, prioritizing trusted platform headers
 * (such as Vercel or Cloudflare infrastructure headers) before parsing forwarding headers.
 */
export function getClientIp(headers: Headers): string {
  // Trusted platform-assigned client IP headers
  const vercelIp = headers.get('x-vercel-ip');
  if (vercelIp && isValidIpFormat(vercelIp.trim())) {
    return vercelIp.trim();
  }

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && isValidIpFormat(cfIp.trim())) {
    return cfIp.trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIpFormat(realIp.trim())) {
    return realIp.trim();
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first comma-separated address and validate it
    const parts = forwarded.split(',');
    const candidate = parts[0]?.trim();
    if (candidate && isValidIpFormat(candidate)) {
      return candidate;
    }
  }

  return '127.0.0.1';
}

function isValidIpFormat(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // Basic IPv4 or IPv6 check without regex vulnerability
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const isIpv6 = ip.includes(':') && /^[0-9a-fA-F:]+$/.test(ip);
  return isIpv4 || isIpv6;
}
