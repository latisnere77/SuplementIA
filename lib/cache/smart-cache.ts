/**
 * Smart Cache Service
 * 
 * Orchestrates multi-tier caching strategy:
 * L1: DynamoDB DAX (< 1ms, microseconds)
 * L2: ElastiCache Redis (< 5ms)
 * L3: RDS Postgres (< 50ms)
 * 
 * Implements cache-aside pattern with automatic tier promotion.
 */

import { daxCache } from './dax-cache';
import { redisCache } from './redis-cache';
import type { CacheItem } from '../../infrastructure/dynamodb-dax-config';

// ====================================
// CACHE TIER ENUM
// ====================================

export enum CacheTier {
  DAX = 'dax',
  REDIS = 'redis',
  POSTGRES = 'postgres',
  MISS = 'miss',
}

// ====================================
// CACHE RESULT
// ====================================

export interface CacheResult {
  data: CacheItem | null;
  tier: CacheTier;
  latency: number;
  hit: boolean;
}

// ====================================
// SMART CACHE SERVICE
// ====================================

export class SmartCache {
  /**
   * Get supplement from cache (checks all tiers in order)
   * 
   * Flow:
   * 1. Check DAX (L1) - < 1ms
   * 2. If miss, check Redis (L2) - < 5ms
   * 3. If miss, return null (caller should check Postgres)
   * 4. On hit in lower tier, promote to higher tiers
   */
  async get(query: string): Promise<CacheResult> {
    const startTime = performance.now();
    
    // Try DAX first (L1 cache)
    const daxResult = await daxCache.get(query);
    if (daxResult) {
      const latency = performance.now() - startTime;
      console.log(`[Smart Cache] HIT from DAX - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      return {
        data: daxResult,
        tier: CacheTier.DAX,
        latency,
        hit: true,
      };
    }
    
    // Try Redis (L2 cache)
    const redisResult = await redisCache.get(query);
    if (redisResult) {
      const latency = performance.now() - startTime;
      console.log(`[Smart Cache] HIT from Redis - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      
      // Promote to DAX (async, don't wait)
      this.promoteToDAX(query, redisResult).catch(err => {
        console.error('[Smart Cache] Error promoting to DAX:', err);
      });
      
      return {
        data: redisResult,
        tier: CacheTier.REDIS,
        latency,
        hit: true,
      };
    }
    
    // Cache miss - caller should check Postgres
    const latency = performance.now() - startTime;
    console.log(`[Smart Cache] MISS - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
    return {
      data: null,
      tier: CacheTier.MISS,
      latency,
      hit: false,
    };
  }
  
  /**
   * Set supplement in all cache tiers
   */
  async set(query: string, data: Omit<CacheItem, 'PK' | 'SK' | 'cachedAt' | 'ttl'>): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Write to all tiers in parallel
      await Promise.all([
        daxCache.set(query, data),
        redisCache.set(query, data as CacheItem),
      ]);
      
      const latency = performance.now() - startTime;
      console.log(`[Smart Cache] SET - Query: ${query}, Latency: ${latency.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[Smart Cache] Error setting cache:', error);
      throw error;
    }
  }
  
  /**
   * Delete supplement from all cache tiers
   */
  async delete(query: string): Promise<void> {
    try {
      // Delete from all tiers in parallel
      await Promise.all([
        daxCache.delete(query),
        redisCache.delete(query),
      ]);
      
      console.log(`[Smart Cache] DELETE - Query: ${query}`);
      
    } catch (error) {
      console.error('[Smart Cache] Error deleting from cache:', error);
      throw error;
    }
  }
  
  /**
   * Promote data from Redis to DAX
   */
  private async promoteToDAX(query: string, data: CacheItem): Promise<void> {
    try {
      await daxCache.set(query, data);
      console.log(`[Smart Cache] Promoted to DAX - Query: ${query}`);
    } catch (error) {
      console.error('[Smart Cache] Error promoting to DAX:', error);
    }
  }
  
  /**
   * Get cache statistics from all tiers
   */
  async getStats(): Promise<{
    dax: { available: boolean; source: string };
    redis: { available: boolean; hitRate: number; keys: number };
  }> {
    const redisStats = await redisCache.getStats();
    
    return {
      dax: {
        available: daxCache.isDAXAvailable(),
        source: daxCache.getCacheSource(),
      },
      redis: {
        available: redisCache.isAvailable(),
        hitRate: redisStats.hitRate,
        keys: redisStats.keys,
      },
    };
  }
  
  /**
   * Get popular supplements from cache
   */
  async getPopular(limit: number = 10): Promise<string[]> {
    // Redis maintains the popular list
    return redisCache.getPopular(limit);
  }
  
  /**
   * Get recent searches from cache
   */
  async getRecent(limit: number = 10): Promise<string[]> {
    return redisCache.getRecent(limit);
  }
  
  /**
   * Warm up cache with popular supplements
   */
  async warmUp(supplements: Array<{ query: string; data: CacheItem }>): Promise<void> {
    console.log(`[Smart Cache] Warming up cache with ${supplements.length} supplements...`);
    
    const promises = supplements.map(({ query, data }) => 
      this.set(query, data).catch(err => {
        console.error(`[Smart Cache] Error warming up ${query}:`, err);
      })
    );
    
    await Promise.all(promises);
    console.log('[Smart Cache] Cache warm-up complete');
  }
  
  /**
   * Flush all caches (use with caution)
   */
  async flush(): Promise<void> {
    console.warn('[Smart Cache] Flushing all caches...');
    await redisCache.flush();
    console.log('[Smart Cache] All caches flushed');
  }
}

// Export singleton instance
export const smartCache = new SmartCache();
