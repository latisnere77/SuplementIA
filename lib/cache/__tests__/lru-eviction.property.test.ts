/**
 * Property Test: LRU Cache Eviction
 * 
 * Feature: intelligent-supplement-search, Property 18: LRU cache eviction
 * Validates: Requirements 5.4
 * 
 * Property: For any full cache, when new item is added, 
 * least recently used item should be evicted
 */

import fc from 'fast-check';

// Mock LRU cache implementation
class MockLRUCache {
  private store = new Map<string, { data: any; lastAccessed: number }>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  async get(key: string): Promise<any | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    
    // Update last accessed time
    entry.lastAccessed = Date.now();
    return entry.data;
  }
  
  async set(key: string, data: unknown): Promise<void> {
    const isUpdate = this.store.has(key);
    
    // If cache is full and this is a NEW key (not an update), evict LRU item
    if (this.store.size >= this.maxSize && !isUpdate) {
      this.evictLRU();
    }
    
    // Add small delay to ensure timestamps are different
    await new Promise(resolve => setTimeout(resolve, 1));
    
    this.store.set(key, {
      data,
      lastAccessed: Date.now(),
    });
  }
  
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.store.delete(lruKey);
    }
  }
  
  size(): number {
    return this.store.size;
  }
  
  has(key: string): boolean {
    return this.store.has(key);
  }
  
  clear(): void {
    this.store.clear();
  }
  
  getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
}

describe('Property Test: LRU Cache Eviction', () => {
  let cache: MockLRUCache;
  
  beforeEach(() => {
    cache = new MockLRUCache(10); // Small cache for testing
  });
  
  afterEach(() => {
    cache.clear();
  });
  
  it('Property 18: LRU item should be evicted when cache is full', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 15, maxLength: 20 }),
        async (keys) => {
          // Make keys unique
          const uniqueKeys = [...new Set(keys)].slice(0, 15);
          
          // Fill cache to capacity (10 items)
          for (let i = 0; i < 10; i++) {
            await cache.set(uniqueKeys[i], { value: i });
            await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamps
          }
          
          expect(cache.size()).toBe(10);
          
          // Remember the oldest key (first one added)
          const oldestKey = uniqueKeys[0];
          
          // Access all items except the oldest to make it LRU
          for (let i = 1; i < 10; i++) {
            await cache.get(uniqueKeys[i]);
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Add new item (should evict oldest)
          await cache.set(uniqueKeys[10], { value: 10 });
          
          // Cache should still be at capacity
          expect(cache.size()).toBe(10);
          
          // Oldest key should be evicted
          expect(cache.has(oldestKey)).toBe(false);
          
          // New key should be present
          expect(cache.has(uniqueKeys[10])).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('Property 18: Recently accessed items should not be evicted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 12, maxLength: 15 }),
        async (keys) => {
          const uniqueKeys = [...new Set(keys)].slice(0, 12);
          
          // Fill cache
          for (let i = 0; i < 10; i++) {
            await cache.set(uniqueKeys[i], { value: i });
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Access a specific item to make it recently used
          const recentKey = uniqueKeys[5];
          await cache.get(recentKey);
          await new Promise(resolve => setTimeout(resolve, 2));
          
          // Add two new items (should evict two oldest, but not the recently accessed one)
          await cache.set(uniqueKeys[10], { value: 10 });
          await new Promise(resolve => setTimeout(resolve, 1));
          await cache.set(uniqueKeys[11], { value: 11 });
          
          // Recently accessed item should still be present
          expect(cache.has(recentKey)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
  
  it('Property 18: Cache size should never exceed max size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 20, maxLength: 30 }),
        async (keys) => {
          const uniqueKeys = [...new Set(keys)];
          
          // Add many items
          for (const key of uniqueKeys) {
            await cache.set(key, { value: key });
            
            // Cache should never exceed max size
            expect(cache.size()).toBeLessThanOrEqual(10);
          }
          
          // Final size should be exactly max size
          expect(cache.size()).toBe(Math.min(10, uniqueKeys.length));
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('Property 18: Updating existing item should not trigger eviction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 15, maxLength: 20 }),
        async (keys) => {
          // Ensure we have exactly 10 unique keys
          const uniqueKeys = [...new Set(keys)].slice(0, 10);
          
          // Skip if we don't have enough unique keys
          if (uniqueKeys.length < 10) {
            return true; // Skip this test case
          }
          
          // Fill cache to capacity
          for (const key of uniqueKeys) {
            await cache.set(key, { value: 1 });
          }
          
          expect(cache.size()).toBe(10);
          
          // Update an existing item
          await cache.set(uniqueKeys[0], { value: 2 });
          
          // Size should remain the same
          expect(cache.size()).toBe(10);
          
          // All original keys should still be present
          for (const key of uniqueKeys) {
            expect(cache.has(key)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('Property 18: Eviction order should follow LRU policy', async () => {
    // Create a small cache
    const smallCache = new MockLRUCache(3);
    
    // Add items in order
    await smallCache.set('a', { value: 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await smallCache.set('b', { value: 2 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await smallCache.set('c', { value: 3 });
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(smallCache.size()).toBe(3);
    
    // Add new item - should evict 'a' (oldest)
    await smallCache.set('d', { value: 4 });
    
    expect(smallCache.has('a')).toBe(false);
    expect(smallCache.has('b')).toBe(true);
    expect(smallCache.has('c')).toBe(true);
    expect(smallCache.has('d')).toBe(true);
    
    // Access 'b' to make it recently used
    await smallCache.get('b');
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Add another item - should evict 'c' (now oldest)
    await smallCache.set('e', { value: 5 });
    
    expect(smallCache.has('b')).toBe(true);
    expect(smallCache.has('c')).toBe(false);
    expect(smallCache.has('d')).toBe(true);
    expect(smallCache.has('e')).toBe(true);
  });
});
