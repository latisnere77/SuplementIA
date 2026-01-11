/**
 * Simple In-Memory Rate Limiter
 * No external dependencies
 */

interface RateLimitEntry {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;
  private blockDurationMs: number;

  constructor(
    maxRequests = 10,
    windowMs = 60000,      // 1 minute
    blockDurationMs = 300000 // 5 minutes
  ) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.blockDurationMs = blockDurationMs;

    // Cleanup every minute
    setInterval(() => this.cleanup(), 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.limits.get(identifier);

    // Check if blocked
    if (entry?.blocked) {
      if (entry.blockedUntil && entry.blockedUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.blockedUntil,
        };
      }
      // Unblock
      entry.blocked = false;
      entry.blockedUntil = undefined;
    }

    // Initialize or get entry
    if (!entry) {
      entry = { requests: [], blocked: false };
      this.limits.set(identifier, entry);
    }

    // Remove old requests outside window
    entry.requests = entry.requests.filter(time => time > now - this.windowMs);

    // Check limit
    if (entry.requests.length >= this.maxRequests) {
      // Block user
      entry.blocked = true;
      entry.blockedUntil = now + this.blockDurationMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedUntil,
      };
    }

    // Allow request
    entry.requests.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - entry.requests.length,
      resetAt: now + this.windowMs,
    };
  }

  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      // Remove expired blocks
      if (entry.blocked && entry.blockedUntil && entry.blockedUntil < now) {
        entry.blocked = false;
        entry.blockedUntil = undefined;
      }

      // Remove old requests
      entry.requests = entry.requests.filter(time => time > now - this.windowMs);

      // Remove empty entries
      if (entry.requests.length === 0 && !entry.blocked) {
        this.limits.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalIdentifiers: this.limits.size,
      blocked: Array.from(this.limits.entries())
        .filter(([_, entry]) => entry.blocked)
        .map(([key]) => key),
    };
  }
}

// Singleton instance
export const globalRateLimiter = new RateLimiter(
  10,      // 10 requests
  60000,   // per minute
  300000   // block for 5 minutes
);
