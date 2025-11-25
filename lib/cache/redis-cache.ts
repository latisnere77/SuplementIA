/**
 * Redis Cache Service
 * 
 * Implements L2 cache using ElastiCache Redis with cluster mode.
 * This is the second tier in the cache hierarchy (after DAX).
 */

import Redis, { RedisOptions } from 'ioredis';
import { CACHE_CONFIG, CACHE_KEYS } from '../../infrastructure/elasticache-redis-config';
import type { CacheItem } from '../../infrastructure/dynamodb-dax-config';

// ====================================
// REDIS CLIENT CONFIGURATION
// ====================================

const REDIS_ENDPOINT = process.env.ELASTICACHE_REDIS_ENDPOINT;
const REDIS_PORT = parseInt(process.env.ELASTICACHE_REDIS_PORT || '6379');
const REDIS_AUTH_TOKEN = process.env.ELASTICACHE_REDIS_AUTH_TOKEN;
const REDIS_TLS = process.env.ELASTICACHE_REDIS_TLS === 'true';

let redisClient: Redis | null = null;

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }
  
  if (!REDIS_ENDPOINT) {
    console.warn('[Redis Cache] ELASTICACHE_REDIS_ENDPOINT not configured');
    return null;
  }
  
  try {
    const options: RedisOptions = {
      host: REDIS_ENDPOINT,
      port: REDIS_PORT,
      password: REDIS_AUTH_TOKEN,
      tls: REDIS_TLS ? {} : undefined,
      
      // Connection pool
      maxRetriesPerRequest: CACHE_CONFIG.maxRetries,
      retryStrategy: (times: number) => {
        if (times > CACHE_CONFIG.maxRetries) {
          return null; // Stop retrying
        }
        return Math.min(times * CACHE_CONFIG.retryDelay, 2000);
      },
      
      // Timeouts
      connectTimeout: CACHE_CONFIG.connectTimeout,
      commandTimeout: CACHE_CONFIG.commandTimeout,
      
      // Performance
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    };
    
    redisClient = new Redis(options);
    
    redisClient.on('connect', () => {
      console.log(`[Redis Cache] Connected to Redis: ${REDIS_ENDPOINT}:${REDIS_PORT}`);
    });
    
    redisClient.on('error', (error) => {
      console.error('[Redis Cache] Redis error:', error);
    });
    
    redisClient.on('close', () => {
      console.log('[Redis Cache] Redis connection closed');
    });
    
    return redisClient;
    
  } catch (error) {
    console.error('[Redis Cache] Failed to initialize Redis client:', error);
    return null;
  }
}

// ====================================
// CACHE OPERATIONS
// ====================================

export class RedisCache {
  private client: Redis | null;
  
  constructor() {
    this.client = getRedisClient();
  }
  
  /**
   * Get supplement from Redis cache
   * Expected latency: < 5ms
   */
  async get(query: string): Promise<CacheItem | null> {
    if (!this.client) {
      return null;
    }
    
    const startTime = performance.now();
    
    try {
      const key = CACHE_KEYS.supplement(query);
      const data = await this.client.get(key);
      
      const latency = performance.now() - startTime;
      
      if (!data) {
        console.log(`[Redis Cache] MISS - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
        return null;
      }
      
      console.log(`[Redis Cache] HIT - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      return JSON.parse(data) as CacheItem;
      
    } catch (error) {
      console.error('[Redis Cache] Error getting item:', error);
      return null;
    }
  }
  
  /**
   * Set supplement in Redis cache
   * Uses LRU eviction policy when cache is full
   */
  async set(query: string, data: CacheItem, ttl: number = CACHE_CONFIG.defaultTTL): Promise<void> {
    if (!this.client) {
      return;
    }
    
    const startTime = performance.now();
    
    try {
      const key = CACHE_KEYS.supplement(query);
      const value = JSON.stringify(data);
      
      // Set with TTL (7 days default)
      await this.client.setex(key, ttl, value);
      
      // Track in popular supplements sorted set
      await this.client.zincrby(CACHE_KEYS.popular(), 1, query);
      
      // Add to recent searches list (keep last 100)
      await this.client.lpush(CACHE_KEYS.recent(), query);
      await this.client.ltrim(CACHE_KEYS.recent(), 0, 99);
      
      const latency = performance.now() - startTime;
      console.log(`[Redis Cache] SET - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[Redis Cache] Error setting item:', error);
      throw error;
    }
  }
  
  /**
   * Delete supplement from Redis cache
   */
  async delete(query: string): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      const key = CACHE_KEYS.supplement(query);
      await this.client.del(key);
      
      // Remove from popular supplements
      await this.client.zrem(CACHE_KEYS.popular(), query);
      
      console.log(`[Redis Cache] DELETE - Query: ${query}`);
      
    } catch (error) {
      console.error('[Redis Cache] Error deleting item:', error);
      throw error;
    }
  }
  
  /**
   * Get embedding from cache
   */
  async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.client) {
      return null;
    }
    
    try {
      const key = CACHE_KEYS.embedding(text);
      const data = await this.client.get(key);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as number[];
      
    } catch (error) {
      console.error('[Redis Cache] Error getting embedding:', error);
      return null;
    }
  }
  
  /**
   * Set embedding in cache
   */
  async setEmbedding(text: string, embedding: number[], ttl: number = CACHE_CONFIG.longTTL): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      const key = CACHE_KEYS.embedding(text);
      const value = JSON.stringify(embedding);
      
      await this.client.setex(key, ttl, value);
      
    } catch (error) {
      console.error('[Redis Cache] Error setting embedding:', error);
      throw error;
    }
  }
  
  /**
   * Get popular supplements
   */
  async getPopular(limit: number = 10): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    
    try {
      // Get top N from sorted set (highest scores first)
      return await this.client.zrevrange(CACHE_KEYS.popular(), 0, limit - 1);
      
    } catch (error) {
      console.error('[Redis Cache] Error getting popular supplements:', error);
      return [];
    }
  }
  
  /**
   * Get recent searches
   */
  async getRecent(limit: number = 10): Promise<string[]> {
    if (!this.client) {
      return [];
    }
    
    try {
      return await this.client.lrange(CACHE_KEYS.recent(), 0, limit - 1);
      
    } catch (error) {
      console.error('[Redis Cache] Error getting recent searches:', error);
      return [];
    }
  }
  
  /**
   * Increment search count for analytics
   */
  async incrementSearchCount(supplementId: number): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      const key = CACHE_KEYS.searchCount(supplementId);
      await this.client.incr(key);
      
    } catch (error) {
      console.error('[Redis Cache] Error incrementing search count:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsed: string;
    keys: number;
  }> {
    if (!this.client) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsed: '0',
        keys: 0,
      };
    }
    
    try {
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');
      const dbsize = await this.client.dbsize();
      
      // Parse stats
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
      const memoryUsed = memory.match(/used_memory_human:(.+)/)?.[1] || '0';
      
      return {
        hits,
        misses,
        hitRate,
        memoryUsed,
        keys: dbsize,
      };
      
    } catch (error) {
      console.error('[Redis Cache] Error getting stats:', error);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsed: '0',
        keys: 0,
      };
    }
  }
  
  /**
   * Flush all cache (use with caution)
   */
  async flush(): Promise<void> {
    if (!this.client) {
      return;
    }
    
    try {
      await this.client.flushdb();
      console.log('[Redis Cache] Cache flushed');
      
    } catch (error) {
      console.error('[Redis Cache] Error flushing cache:', error);
      throw error;
    }
  }
  
  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return !!this.client && this.client.status === 'ready';
  }
  
  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      redisClient = null;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();
