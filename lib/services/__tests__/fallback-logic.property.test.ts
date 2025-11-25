/**
 * Property Test: Fallback to Legacy System
 * 
 * **Feature: intelligent-supplement-search, Property 32: Fallback to legacy system**
 * 
 * Tests that when the new vector search system fails, requests automatically
 * fallback to the legacy supplement-mappings system.
 * 
 * **Validates: Requirements 9.2**
 */

import fc from 'fast-check';
import { CompatibilityLayer } from '../compatibility-layer';
import { VectorSearchService } from '../vector-search';
import { EmbeddingService } from '../embedding-service';
import { Pool } from 'pg';

describe('Property 32: Fallback to legacy system', () => {
  let pool: Pool;
  let vectorSearch: VectorSearchService;
  let embeddingService: EmbeddingService;
  let compatibilityLayer: CompatibilityLayer;

  beforeAll(() => {
    // Create mock services
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE || 'supplements_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD,
    });

    vectorSearch = new VectorSearchService(pool);
    
    embeddingService = new EmbeddingService({
      endpoint: process.env.EMBEDDING_SERVICE_ENDPOINT || 'http://localhost:8080',
      timeout: 5000,
    });

    compatibilityLayer = new CompatibilityLayer(vectorSearch, embeddingService);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should fallback to legacy system when vector search fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random supplement names that exist in legacy system
        fc.constantFrom(
          'Magnesium',
          'Vitamin D',
          'Omega-3',
          'Ashwagandha',
          'Rhodiola',
          'CoQ10',
          'Zinc',
          'Vitamin B12',
          'Turmeric',
          'Ginkgo Biloba'
        ),
        async (supplementName) => {
          // Create a failing vector search by using invalid database connection
          const failingPool = new Pool({
            host: 'invalid-host-that-does-not-exist',
            port: 9999,
            database: 'invalid',
            user: 'invalid',
            password: 'invalid',
            connectionTimeoutMillis: 1000,
          });

          const failingVectorSearch = new VectorSearchService(failingPool);
          const failingCompatibilityLayer = new CompatibilityLayer(
            failingVectorSearch,
            embeddingService
          );

          // Search should fallback to legacy system
          const result = await failingCompatibilityLayer.search(supplementName, {
            useVectorSearch: true,
            fallbackToLegacy: true,
          });

          // Cleanup
          await failingPool.end();

          // Assertions
          // 1. Search should succeed despite vector search failure
          expect(result.success).toBe(true);

          // 2. Source should be 'legacy' (fallback was used)
          expect(result.source).toBe('legacy');

          // 3. Fallback flag should be true
          expect(result.fallbackUsed).toBe(true);

          // 4. Should return a valid supplement
          expect(result.supplement).not.toBeNull();
          expect(result.supplement?.normalizedName).toBeTruthy();

          // 5. Should have legacy system fields
          expect(result.supplement?.pubmedQuery).toBeTruthy();
          expect(result.supplement?.category).toBeTruthy();
          expect(result.supplement?.commonNames).toBeInstanceOf(Array);

          return true;
        }
      ),
      { numRuns: 10 } // Run 10 times with different supplements
    );
  }, 60000); // 60s timeout for property test

  it('should use vector search when available and not fallback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'Magnesium',
          'Vitamin D',
          'Omega-3'
        ),
        async (supplementName) => {
          // Mock successful vector search
          const mockVectorSearch = {
            searchByEmbedding: jest.fn().mockResolvedValue([
              {
                supplement: {
                  id: 1,
                  name: supplementName,
                  scientificName: `${supplementName} Scientific`,
                  commonNames: [supplementName],
                  embedding: new Array(384).fill(0),
                  metadata: {
                    category: 'vitamin',
                    popularity: 'high',
                    pubmedQuery: `${supplementName} AND health`,
                  },
                  searchCount: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                similarity: 0.95,
              },
            ]),
          } as any;

          const mockEmbeddingService = {
            generateEmbedding: jest.fn().mockResolvedValue(new Array(384).fill(0)),
          } as any;

          const testCompatibilityLayer = new CompatibilityLayer(
            mockVectorSearch,
            mockEmbeddingService
          );

          // Search should use vector search
          const result = await testCompatibilityLayer.search(supplementName, {
            useVectorSearch: true,
            fallbackToLegacy: true,
          });

          // Assertions
          // 1. Search should succeed
          expect(result.success).toBe(true);

          // 2. Source should be 'vector' (no fallback)
          expect(result.source).toBe('vector');

          // 3. Fallback flag should be false
          expect(result.fallbackUsed).toBe(false);

          // 4. Should have similarity score
          expect(result.similarity).toBeGreaterThanOrEqual(0.85);

          // 5. Vector search should have been called
          expect(mockVectorSearch.searchByEmbedding).toHaveBeenCalled();
          expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should fail gracefully when both systems fail and fallback is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }),
        async (query) => {
          // Create failing services
          const failingPool = new Pool({
            host: 'invalid-host',
            port: 9999,
            database: 'invalid',
            user: 'invalid',
            password: 'invalid',
            connectionTimeoutMillis: 1000,
          });

          const failingVectorSearch = new VectorSearchService(failingPool);
          const testCompatibilityLayer = new CompatibilityLayer(
            failingVectorSearch,
            embeddingService
          );

          // Search with fallback disabled
          const result = await testCompatibilityLayer.search(query, {
            useVectorSearch: true,
            fallbackToLegacy: false, // Disable fallback
          });

          // Cleanup
          await failingPool.end();

          // Assertions
          // 1. Search should fail
          expect(result.success).toBe(false);

          // 2. Should have error message
          expect(result.error).toBeTruthy();

          // 3. Fallback should not be used
          expect(result.fallbackUsed).toBe(false);

          // 4. Supplement should be null
          expect(result.supplement).toBeNull();

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should preserve error information when fallback occurs', async () => {
    // Spy on console.warn BEFORE creating the compatibility layer
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Magnesium', 'Zinc', 'Vitamin D'),
        async (supplementName) => {
          // Create a service that will fail with a specific error
          const failingPool = new Pool({
            host: 'invalid-host-for-testing',
            port: 9999,
            database: 'invalid',
            user: 'invalid',
            password: 'invalid',
            connectionTimeoutMillis: 1000,
          });

          const failingVectorSearch = new VectorSearchService(failingPool);
          const testCompatibilityLayer = new CompatibilityLayer(
            failingVectorSearch,
            embeddingService
          );

          // Clear previous calls
          warnSpy.mockClear();

          const result = await testCompatibilityLayer.search(supplementName, {
            useVectorSearch: true,
            fallbackToLegacy: true,
          });

          // Cleanup
          await failingPool.end();

          // Assertions
          // 1. Should have logged warning about vector search failure
          expect(warnSpy).toHaveBeenCalled();
          const warningMessage = warnSpy.mock.calls[0][0];
          expect(warningMessage).toContain('Vector search failed');
          expect(warningMessage).toContain(supplementName);

          // 2. Should still succeed via fallback
          expect(result.success).toBe(true);
          expect(result.source).toBe('legacy');
          expect(result.fallbackUsed).toBe(true);

          return true;
        }
      ),
      { numRuns: 5 }
    );

    // Restore after all tests
    warnSpy.mockRestore();
  });
});
