/**
 * Simple In-Memory Cache
 * No dependencies, no complexity
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

class SimpleCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL = 3600000) { // 1 hour default
    this.defaultTTL = defaultTTL;
    
    // Auto-cleanup every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instances for different cache types
export const studiesCache = new SimpleCache(3600000); // 1 hour
export const enrichmentCache = new SimpleCache(86400000); // 24 hours
export const translationCache = new SimpleCache(604800000); // 7 days

export { SimpleCache };
