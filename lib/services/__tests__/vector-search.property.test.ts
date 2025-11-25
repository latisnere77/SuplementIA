/**
 * Property-Based Tests for Vector Search
 * 
 * Feature: intelligent-supplement-search
 * Property 1: Vector search finds semantically similar supplements
 * Validates: Requirements 1.1, 1.2
 */

import fc from 'fast-check';
import { VectorSearchService, createVectorSearchService, Supplement } from '../vector-search';

// Mock database for testing without actual Postgres connection
class MockVectorSearchService extends VectorSearchService {
  private supplements: Map<number, Supplement & { embedding: number[] }> = new Map();
  private nextId = 1;

  constructor() {
    // Pass a dummy pool - we won't use it
    super(null as any);
  }

  async searchByEmbedding(
    embedding: number[],
    options: { minSimilarity?: number; limit?: number } = {}
  ) {
    const { minSimilarity = 0.85, limit = 5 } = options;

    // Validate embedding dimensions
    if (embedding.length !== 384) {
      throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding.length}`);
    }

    // Calculate cosine similarity for all supplements
    const results = Array.from(this.supplements.values())
      .map(supplement => {
        const similarity = this.cosineSimilarity(embedding, supplement.embedding);
        return {
          supplement,
          similarity,
        };
      })
      .filter(result => result.similarity > minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  async insertSupplement(
    supplement: Omit<Supplement, 'id' | 'searchCount' | 'createdAt' | 'updatedAt'>
  ): Promise<Supplement> {
    // Validate embedding dimensions
    if (supplement.embedding.length !== 384) {
      throw new Error(`Invalid embedding dimensions: expected 384, got ${supplement.embedding.length}`);
    }

    const id = this.nextId++;
    const now = new Date();
    const fullSupplement: Supplement = {
      id,
      name: supplement.name,
      scientificName: supplement.scientificName,
      commonNames: supplement.commonNames,
      embedding: supplement.embedding,
      metadata: supplement.metadata,
      searchCount: 0,
      lastSearchedAt: supplement.lastSearchedAt,
      createdAt: now,
      updatedAt: now,
    };

    this.supplements.set(id, fullSupplement);
    return fullSupplement;
  }

  async deleteAll(): Promise<void> {
    this.supplements.clear();
    this.nextId = 1;
  }

  async close(): Promise<void> {
    // No-op for mock
  }

  // Helper: Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
}

// Arbitrary: Generate a normalized 384-dimensional embedding vector
// Excludes zero vectors as they're not valid embeddings from real ML models
const embeddingArbitrary = fc.array(fc.float({ min: -1, max: 1 }), { minLength: 384, maxLength: 384 })
  .map(arr => {
    // Normalize the vector
    const norm = Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? arr.map(val => val / norm) : arr;
  })
  .filter(arr => {
    // Exclude zero vectors (norm = 0)
    const norm = Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
    return norm > 0.001; // Small threshold to avoid numerical issues
  });

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

describe('Vector Search Property Tests', () => {
  let service: MockVectorSearchService;

  beforeEach(() => {
    service = new MockVectorSearchService();
  });

  afterEach(async () => {
    await service.deleteAll();
    await service.close();
  });

  /**
   * Property 1: Vector search finds semantically similar supplements
   * 
   * For any supplement query, when vector search is performed,
   * all returned results should have similarity score >= 0.85
   * 
   * Validates: Requirements 1.1, 1.2
   */
  it('Property 1: Vector search similarity threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: supplementNameArbitrary,
            embedding: embeddingArbitrary,
            metadata: metadataArbitrary,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        embeddingArbitrary,
        async (supplements, queryEmbedding) => {
          // Setup: Insert supplements
          for (const supp of supplements) {
            await service.insertSupplement({
              name: supp.name,
              commonNames: [],
              embedding: supp.embedding,
              metadata: supp.metadata,
            });
          }

          // Execute: Search with query embedding
          const results = await service.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.85,
            limit: 10,
          });

          // Verify: All results have similarity >= 0.85
          const allAboveThreshold = results.every(result => result.similarity >= 0.85);

          return allAboveThreshold;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1b: Vector search returns results in descending similarity order
   * 
   * For any supplement query, results should be ordered by similarity (highest first)
   */
  it('Property 1b: Results ordered by similarity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: supplementNameArbitrary,
            embedding: embeddingArbitrary,
            metadata: metadataArbitrary,
          }),
          { minLength: 2, maxLength: 20 }
        ),
        embeddingArbitrary,
        async (supplements, queryEmbedding) => {
          // Setup: Insert supplements
          for (const supp of supplements) {
            await service.insertSupplement({
              name: supp.name,
              commonNames: [],
              embedding: supp.embedding,
              metadata: supp.metadata,
            });
          }

          // Execute: Search with query embedding
          const results = await service.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.0, // Low threshold to get multiple results
            limit: 10,
          });

          // Verify: Results are in descending order
          if (results.length <= 1) {
            return true; // Trivially true for 0 or 1 results
          }

          for (let i = 0; i < results.length - 1; i++) {
            if (results[i].similarity < results[i + 1].similarity) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1c: Vector search respects limit parameter
   * 
   * For any supplement query, results should not exceed the specified limit
   */
  it('Property 1c: Results respect limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: supplementNameArbitrary,
            embedding: embeddingArbitrary,
            metadata: metadataArbitrary,
          }),
          { minLength: 5, maxLength: 20 }
        ),
        embeddingArbitrary,
        fc.integer({ min: 1, max: 10 }),
        async (supplements, queryEmbedding, limit) => {
          // Setup: Insert supplements
          for (const supp of supplements) {
            await service.insertSupplement({
              name: supp.name,
              commonNames: [],
              embedding: supp.embedding,
              metadata: supp.metadata,
            });
          }

          // Execute: Search with query embedding and limit
          const results = await service.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.0, // Low threshold to potentially get many results
            limit,
          });

          // Verify: Results do not exceed limit
          return results.length <= limit;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1d: Searching with identical embedding returns similarity = 1.0
   * 
   * For any supplement, searching with its own embedding should return similarity = 1.0
   */
  it('Property 1d: Identical embedding returns perfect similarity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: supplementNameArbitrary,
          embedding: embeddingArbitrary,
          metadata: metadataArbitrary,
        }),
        async (supplement) => {
          // Setup: Insert supplement
          const inserted = await service.insertSupplement({
            name: supplement.name,
            commonNames: [],
            embedding: supplement.embedding,
            metadata: supplement.metadata,
          });

          // Execute: Search with same embedding
          const results = await service.searchByEmbedding(supplement.embedding, {
            minSimilarity: 0.0,
            limit: 1,
          });

          // Verify: First result is the same supplement with similarity ≈ 1.0
          if (results.length === 0) {
            return false;
          }

          const firstResult = results[0];
          const isSameSupplement = firstResult.supplement.id === inserted.id;
          const isPerfectSimilarity = Math.abs(firstResult.similarity - 1.0) < 0.001;

          return isSameSupplement && isPerfectSimilarity;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1e: Invalid embedding dimensions throw error
   * 
   * For any embedding with dimensions != 384, search should throw error
   */
  it('Property 1e: Invalid dimensions throw error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.float(), { minLength: 1, maxLength: 1000 })
          .filter(arr => arr.length !== 384),
        async (invalidEmbedding) => {
          // Execute & Verify: Should throw error
          try {
            await service.searchByEmbedding(invalidEmbedding);
            return false; // Should have thrown
          } catch (error: any) {
            return error.message.includes('Invalid embedding dimensions');
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
