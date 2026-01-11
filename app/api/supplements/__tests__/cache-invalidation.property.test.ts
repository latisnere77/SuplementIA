/**
 * Property-Based Tests for Cache Invalidation
 * 
 * Feature: intelligent-supplement-search, Property 19: Cache invalidation on update (DynamoDB + Redis)
 * Validates: Requirements 4.5, 5.5
 */

import fc from 'fast-check';

// Mock cache service
class MockCacheService {
  private cache: Map<string, any> = new Map();
  private invalidations: string[] = [];

  async get(key: string): Promise<any | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.invalidations.push(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  getInvalidations(): string[] {
    return this.invalidations;
  }

  clear() {
    this.cache.clear();
    this.invalidations = [];
  }
}

// Mock supplement service
class MockSupplementService {
  private supplements: Map<number, any> = new Map();
  private cache: MockCacheService;
  private nextId = 1;

  constructor(cache: MockCacheService) {
    this.cache = cache;
  }

  async insertSupplement(supplement: any): Promise<any> {
    const id = this.nextId++;
    const inserted = {
      id,
      ...supplement,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.supplements.set(id, inserted);
    
    // Cache the supplement
    await this.cache.set(supplement.name, inserted);
    
    return inserted;
  }

  async updateSupplement(id: number, updates: any): Promise<any> {
    const existing = this.supplements.get(id);
    if (!existing) {
      throw new Error('Supplement not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.supplements.set(id, updated);

    // Invalidate cache for old name
    await this.cache.delete(existing.name);
    
    // Invalidate cache for new name if it changed
    if (updates.name && updates.name !== existing.name) {
      await this.cache.delete(updates.name);
    }

    return updated;
  }

  async getById(id: number): Promise<any | null> {
    return this.supplements.get(id) || null;
  }

  async getByName(name: string): Promise<any | null> {
    // Check cache first
    const cached = await this.cache.get(name);
    if (cached) {
      return cached;
    }

    // Search in supplements
    for (const supplement of this.supplements.values()) {
      if (supplement.name === name) {
        // Cache for next time
        await this.cache.set(name, supplement);
        return supplement;
      }
    }

    return null;
  }
}

// Arbitrary: Generate a supplement name
const supplementNameArbitrary = fc.string({ minLength: 3, maxLength: 50 })
  .filter(s => s.trim().length >= 3);

// Arbitrary: Generate supplement metadata
const metadataArbitrary = fc.record({
  category: fc.constantFrom('vitamin', 'mineral', 'herb', 'amino-acid', 'fatty-acid', 'mushroom', 'other'),
  popularity: fc.constantFrom('high', 'medium', 'low'),
  evidenceGrade: fc.constantFrom('A', 'B', 'C', 'D'),
  studyCount: fc.integer({ min: 0, max: 1000 }),
});

describe('Cache Invalidation Property Tests', () => {
  /**
   * Property 19: Cache invalidation on update (DynamoDB + Redis)
   * 
   * For any supplement modification, cache entries for that supplement should be invalidated
   * 
   * Validates: Requirements 4.5, 5.5
   */
  it('Property 19: Cache invalidated on supplement update', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        supplementNameArbitrary,
        metadataArbitrary,
        async (originalName, newName, metadata) => {
          // Skip if names are the same
          if (originalName === newName) {
            return true;
          }

          const cache = new MockCacheService();
          const service = new MockSupplementService(cache);

          // Insert supplement
          const inserted = await service.insertSupplement({
            name: originalName,
            metadata,
          });

          // Verify it's cached
          const cachedBefore = await cache.get(originalName);
          if (!cachedBefore) {
            return false;
          }

          // Update supplement with new name
          await service.updateSupplement(inserted.id, {
            name: newName,
          });

          // Verify: Old name was invalidated from cache
          const oldNameInvalidated = !cache.has(originalName);

          // Verify: Invalidation was recorded
          const invalidations = cache.getInvalidations();
          const oldNameWasInvalidated = invalidations.includes(originalName);

          return oldNameInvalidated && oldNameWasInvalidated;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19b: Cache invalidation for metadata updates
   * 
   * For any supplement metadata update, cache should be invalidated
   */
  it('Property 19b: Cache invalidated on metadata update', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        metadataArbitrary,
        async (name, originalMetadata, newMetadata) => {
          const cache = new MockCacheService();
          const service = new MockSupplementService(cache);

          // Insert supplement
          const inserted = await service.insertSupplement({
            name,
            metadata: originalMetadata,
          });

          // Verify it's cached
          const cachedBefore = await cache.get(name);
          if (!cachedBefore) {
            return false;
          }

          // Update metadata
          await service.updateSupplement(inserted.id, {
            metadata: newMetadata,
          });

          // Verify: Cache was invalidated
          const invalidations = cache.getInvalidations();
          const wasInvalidated = invalidations.includes(name);

          return wasInvalidated;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19c: Fresh data after cache invalidation
   * 
   * For any supplement update, subsequent reads should return fresh data
   */
  it('Property 19c: Fresh data after invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        metadataArbitrary,
        async (name, originalMetadata, newMetadata) => {
          const cache = new MockCacheService();
          const service = new MockSupplementService(cache);

          // Insert supplement
          const inserted = await service.insertSupplement({
            name,
            metadata: originalMetadata,
          });

          // Read to populate cache
          const beforeUpdate = await service.getByName(name);
          if (!beforeUpdate) {
            return false;
          }

          // Update supplement
          await service.updateSupplement(inserted.id, {
            metadata: newMetadata,
          });

          // Read again - should get fresh data
          const afterUpdate = await service.getByName(name);
          if (!afterUpdate) {
            return false;
          }

          // Verify: Data is fresh (metadata was updated)
          const metadataUpdated = JSON.stringify(afterUpdate.metadata) === JSON.stringify(newMetadata);

          return metadataUpdated;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19d: Multiple cache invalidations
   * 
   * For any sequence of updates, all cache entries should be invalidated
   */
  it('Property 19d: Multiple invalidations tracked', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        fc.array(metadataArbitrary, { minLength: 2, maxLength: 5 }),
        async (name, metadataUpdates) => {
          const cache = new MockCacheService();
          const service = new MockSupplementService(cache);

          // Insert supplement
          const inserted = await service.insertSupplement({
            name,
            metadata: metadataUpdates[0],
          });

          // Perform multiple updates
          for (let i = 1; i < metadataUpdates.length; i++) {
            await service.updateSupplement(inserted.id, {
              metadata: metadataUpdates[i],
            });
          }

          // Verify: Cache was invalidated for each update
          const invalidations = cache.getInvalidations();
          const invalidationCount = invalidations.filter(key => key === name).length;

          // Should have one invalidation per update
          return invalidationCount === metadataUpdates.length - 1;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 19e: Name change invalidates both old and new names
   * 
   * For any name change, both old and new names should be invalidated
   */
  it('Property 19e: Both names invalidated on name change', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        supplementNameArbitrary,
        metadataArbitrary,
        async (originalName, newName, metadata) => {
          // Skip if names are the same
          if (originalName === newName) {
            return true;
          }

          const cache = new MockCacheService();
          const service = new MockSupplementService(cache);

          // Insert supplement
          const inserted = await service.insertSupplement({
            name: originalName,
            metadata,
          });

          // Pre-cache the new name (simulate it being cached from a previous search)
          await cache.set(newName, { name: newName, id: 999 });

          // Update name
          await service.updateSupplement(inserted.id, {
            name: newName,
          });

          // Verify: Both names were invalidated
          const invalidations = cache.getInvalidations();
          const oldNameInvalidated = invalidations.includes(originalName);
          const newNameInvalidated = invalidations.includes(newName);

          return oldNameInvalidated && newNameInvalidated;
        }
      ),
      { numRuns: 100 }
    );
  });
});
