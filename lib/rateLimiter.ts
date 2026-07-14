/**
 * Military Pass — Rate Limiter (Upstash Redis-backed)
 * ====================================================
 * Uses Upstash Redis REST API for persistent rate limiting
 * that works across serverless invocations on HF Spaces.
 *
 * Falls back to in-memory limiter if Redis is not configured.
 */

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

const hasRedis = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// ── In-memory fallback ───────────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function memoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (entry && entry.resetTime < now) {
    memoryStore.delete(key);
  }

  const current = memoryStore.get(key) || {
    count: 0,
    resetTime: now + windowMs,
  };

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  memoryStore.set(key, current);

  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

// ── Upstash Redis REST API ───────────────────────────────────────

async function redisCheck(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const resetTime = now + windowMs;

  try {
    // Atomic INCR + EXPIRE via Upstash pipeline
    const res = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, Math.ceil(windowMs / 1000)],
      ]),
    });

    if (!res.ok) {
      throw new Error(`Redis HTTP ${res.status}`);
    }

    const data = (await res.json()) as Array<{ result: number }>;
    const count = data?.[0]?.result ?? 0;

    if (count === 1) {
      // First request in window — EXPIRE was set
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    if (count > maxRequests) {
      const ttlRes = await fetch(`${UPSTASH_REDIS_REST_URL}/ttl/${redisKey}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      });
      const ttlData = (await ttlRes.json()) as { result: number };
      const ttlSec = ttlData.result > 0 ? ttlData.result : Math.ceil(windowMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + ttlSec * 1000,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count,
      resetTime,
    };
  } catch (err) {
    console.warn("[rateLimiter] Redis error, falling back to memory:", (err as Error).message);
    return memoryCheck(key, maxRequests, windowMs);
  }
}

// ── Public API ───────────────────────────────────────────────────

export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Async check for Redis-backed rate limiting.
   * Falls back to in-memory if Redis is not configured.
   */
  async check(identifier: string): Promise<RateLimitResult> {
    if (hasRedis) {
      return redisCheck(identifier, this.maxRequests, this.windowMs);
    }
    return memoryCheck(identifier, this.maxRequests, this.windowMs);
  }

  reset(identifier: string): void {
    memoryStore.delete(identifier);
    if (hasRedis) {
      fetch(`${UPSTASH_REDIS_REST_URL}/del/rl:${identifier}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      }).catch(() => {});
    }
  }
}

// Singleton instances for different rate limits
export const strictLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const standardLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const looseLimiter = new RateLimiter(1000, 60000); // 1000 requests per minute
