import { eq } from 'drizzle-orm';
import { db, schema, isDatabaseConfigured } from '@/db';

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
 * Leverages Neon PostgreSQL `rate_limits` table when database is configured,
 * ensuring coordinated throttling across horizontal/serverless instances.
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  if (isDatabaseConfigured() && db) {
    try {
      const now = new Date();
      const existing = await db
        .select()
        .from(schema.rateLimits)
        .where(eq(schema.rateLimits.key, identifier))
        .limit(1);

      if (existing.length === 0 || existing[0].resetAt <= now) {
        const resetAt = new Date(now.getTime() + windowMs);
        await db
          .insert(schema.rateLimits)
          .values({
            key: identifier,
            count: 1,
            resetAt,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.rateLimits.key,
            set: {
              count: 1,
              resetAt,
              updatedAt: now,
            },
          });

        return {
          isAllowed: true,
          remaining: Math.max(0, maxAttempts - 1),
          retryAfterSeconds: 0,
        };
      }

      const record = existing[0];
      if (record.count >= maxAttempts) {
        const retryAfter = Math.ceil((new Date(record.resetAt).getTime() - now.getTime()) / 1000);
        return {
          isAllowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, retryAfter),
        };
      }

      const nextCount = record.count + 1;
      await db
        .update(schema.rateLimits)
        .set({
          count: nextCount,
          updatedAt: now,
        })
        .where(eq(schema.rateLimits.key, identifier));

      return {
        isAllowed: true,
        remaining: Math.max(0, maxAttempts - nextCount),
        retryAfterSeconds: 0,
      };
    } catch {
      // If DB transiently errors during rate check, fall back to in-memory check
      return checkRateLimit(identifier, maxAttempts, windowMs);
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
