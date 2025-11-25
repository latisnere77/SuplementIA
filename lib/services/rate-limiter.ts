/**
 * Rate Limiter Service
 * 
 * Implements application-level rate limiting with:
 * - Per-IP rate limits (100 req/min)
 * - Per-user rate limits (1000 req/day)
 * - Exponential backoff for PubMed API
 * - Redis-backed distributed rate limiting
 */

import { Redis } from 'ioredis';

export interface RateLimitConfig {
  perIPLimit: number;        // Requests per minute per IP
  perIPWindow: number;       // Window in seconds
  perUserLimit: number;      // Requests per day per user
  perUserWindow: number;     // Window in seconds
  pubmedBackoffBase: number; // Base delay in ms
  pubmedMaxRetries: number;  // Max retry attempts
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds to wait before retry
}

export interface BackoffResult {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  perIPLimit: 100,           // 100 requests per minute
  perIPWindow: 60,           // 60 seconds
  perUserLimit: 1000,        // 1000 requests per day
  perUserWindow: 86400,      // 24 hours
  pubmedBackoffBase: 1000,   // 1 second base delay
  pubmedMaxRetries: 5,       // Max 5 retries
};

export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: Partial<RateLimitConfig> = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check rate limit for IP address
   */
  async checkIPRateLimit(ip: string): Promise<RateLimitResult> {
    const key = `ratelimit:ip:${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.perIPWindow * 1000;

    // Use Redis sorted set to track requests in time window
    const pipeline = this.redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count requests in current window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, this.config.perIPWindow);

    const results = await pipeline.exec();
    const count = results?.[1]?.[1] as number || 0;

    const allowed = count < this.config.perIPLimit;
    const remaining = Math.max(0, this.config.perIPLimit - count - 1);
    const resetAt = new Date(now + this.config.perIPWindow * 1000);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : this.config.perIPWindow,
    };
  }

  /**
   * Check rate limit for user
   */
  async checkUserRateLimit(userId: string): Promise<RateLimitResult> {
    const key = `ratelimit:user:${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.perUserWindow * 1000;

    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, this.config.perUserWindow);

    const results = await pipeline.exec();
    const count = results?.[1]?.[1] as number || 0;

    const allowed = count < this.config.perUserLimit;
    const remaining = Math.max(0, this.config.perUserLimit - count - 1);
    const resetAt = new Date(now + this.config.perUserWindow * 1000);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(this.config.perUserWindow / 60),
    };
  }

  /**
   * Calculate exponential backoff delay for PubMed API
   */
  calculateBackoff(attempt: number): BackoffResult {
    if (attempt >= this.config.pubmedMaxRetries) {
      return {
        shouldRetry: false,
        delayMs: 0,
        attempt,
      };
    }

    // Exponential backoff: base * 2^attempt with jitter
    const exponentialDelay = this.config.pubmedBackoffBase * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
    const delayMs = Math.floor(exponentialDelay + jitter);

    return {
      shouldRetry: true,
      delayMs,
      attempt: attempt + 1,
    };
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  async withBackoff<T>(
    fn: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (error) {
        const backoff = this.calculateBackoff(attempt);

        if (!backoff.shouldRetry) {
          throw new Error(
            `${context} failed after ${attempt} retries: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        console.warn(
          `${context} failed (attempt ${attempt + 1}/${this.config.pubmedMaxRetries}), ` +
          `retrying in ${backoff.delayMs}ms...`,
          { error: error instanceof Error ? error.message : error }
        );

        await this.sleep(backoff.delayMs);
        attempt = backoff.attempt;
      }
    }
  }

  /**
   * Track PubMed API call for rate limiting
   */
  async trackPubMedCall(): Promise<RateLimitResult> {
    const key = 'ratelimit:pubmed:global';
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count requests in last second
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.expire(key, 2);

    const results = await pipeline.exec();
    const count = results?.[1]?.[1] as number || 0;

    // PubMed allows 3 requests per second
    const limit = 3;
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);
    const resetAt = new Date(now + 1000);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : 1,
    };
  }

  /**
   * Get rate limit status for IP
   */
  async getIPStatus(ip: string): Promise<{ count: number; limit: number; resetAt: Date }> {
    const key = `ratelimit:ip:${ip}`;
    const now = Date.now();
    const windowStart = now - this.config.perIPWindow * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return {
      count,
      limit: this.config.perIPLimit,
      resetAt: new Date(now + this.config.perIPWindow * 1000),
    };
  }

  /**
   * Get rate limit status for user
   */
  async getUserStatus(userId: string): Promise<{ count: number; limit: number; resetAt: Date }> {
    const key = `ratelimit:user:${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.perUserWindow * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return {
      count,
      limit: this.config.perUserLimit,
      resetAt: new Date(now + this.config.perUserWindow * 1000),
    };
  }

  /**
   * Reset rate limit for IP (admin function)
   */
  async resetIPLimit(ip: string): Promise<void> {
    const key = `ratelimit:ip:${ip}`;
    await this.redis.del(key);
  }

  /**
   * Reset rate limit for user (admin function)
   */
  async resetUserLimit(userId: string): Promise<void> {
    const key = `ratelimit:user:${userId}`;
    await this.redis.del(key);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number,
    public readonly resetAt: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Create rate limiter instance
 */
export function createRateLimiter(
  redis: Redis,
  config?: Partial<RateLimitConfig>
): RateLimiter {
  return new RateLimiter(redis, config);
}
