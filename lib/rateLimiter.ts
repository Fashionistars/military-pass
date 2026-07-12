/**
 * Military Pass — Rate Limiter
 * ============================
 * Simple in-memory rate limiter for API endpoints.
 * Prevents abuse and protects against DDoS attacks.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request should be rate limited
   * @param identifier Unique identifier (user ID, IP, etc.)
   * @returns true if request is allowed, false if rate limited
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetTime < now) {
      this.requests.delete(identifier);
    }

    const currentEntry = this.requests.get(identifier) || {
      count: 0,
      resetTime: now + this.windowMs,
    };

    if (currentEntry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentEntry.resetTime,
      };
    }

    currentEntry.count++;
    this.requests.set(identifier, currentEntry);

    return {
      allowed: true,
      remaining: this.maxRequests - currentEntry.count,
      resetTime: currentEntry.resetTime,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clean up all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }
}

// Singleton instances for different rate limits
export const strictLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const standardLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const looseLimiter = new RateLimiter(1000, 60000); // 1000 requests per minute

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    strictLimiter.cleanup();
    standardLimiter.cleanup();
    looseLimiter.cleanup();
  }, 5 * 60 * 1000);
}
