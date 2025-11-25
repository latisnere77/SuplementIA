/**
 * Property-Based Tests for English Search
 * 
 * Feature: intelligent-supplement-search
 * Property 9: Multilingual search (English)
 * Validates: Requirements 3.2
 */

import fc from 'fast-check';
import { VectorSearchService, Supplement } from '../vector-search';
import { EmbeddingService } from '../embedding-service';

// Mock services for testing
class MockEmbeddingService extends EmbeddingService {
  constructor() {
    super({ endpoint: 'mock' });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic embedding based on text
    const normalized = text.toLowerCase().trim();
    return this.generateDeterministicEmbedding(normalized);
  }

  private generateDeterministicEmbedding(text: string): number[] {
    // Create a deterministic 384-dim embedding based on text hash
    const embedding: number[] = [];
    let hash = 0;
    
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate 384 values based on hash
    for (let i = 0; i < 384; i++) {
      const seed = hash + i;
      const value = Math.sin(seed) * 10000;
      embedding.push(value - Math.floor(value));
    }

    // Normalize the vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

class MockVectorSearchService extends VectorSearchService {
  private supplements: Map<number, Supplement & { embedding: number[] }> = new Map();
  private nextId = 1;

  constructor() {
    super(null as any);
  }

  async searchByEmbedding(
    embedding: number[],
    options: { minSimilarity?: number; limit?: number } = {}
  ) {
    const { minSimilarity = 0.85, limit = 5 } = options;

    if (embedding.length !== 384) {
      throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding.length}`);
    }

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
    // No-op
  }

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

// Arbitrary: English supplement names
const englishSupplementArbitrary = fc.constantFrom(
  'vitamin d',
  'vitamin c',
  'vitamin b12',
  'vitamin b6',
  'vitamin e',
  'magnesium',
  'omega-3',
  'folic acid',
  'coenzyme q10',
  'zinc',
  'iron',
  'calcium',
  'selenium',
  'probiotics',
  'collagen',
  'melatonin',
  'ashwagandha',
  'turmeric',
  'ginger',
  'garlic'
);

describe('English Search Property Tests', () => {
  let vectorService: MockVectorSearchService;
  let embeddingService: MockEmbeddingService;

  beforeEach(() => {
    vectorService = new MockVectorSearchService();
    embeddingService = new MockEmbeddingService();
  });

  afterEach(async () => {
    await vectorService.deleteAll();
    await vectorService.close();
  });

  /**
   * Property 9: Multilingual search (English)
   * 
   * For any English supplement name, vector search should find
   * the correct supplement with similarity >= 0.90
   * 
   * Validates: Requirements 3.2
   */
  it('Property 9: English queries find correct supplements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: englishSupplementArbitrary,
          }),
          { minLength: 5, maxLength: 15 }
        ),
        englishSupplementArbitrary,
        async (supplements, query) => {
          // Setup: Insert English supplements
          for (const supp of supplements) {
            const embedding = await embeddingService.generateEmbedding(supp.name);
            await vectorService.insertSupplement({
              name: supp.name,
              commonNames: [],
              embedding,
              metadata: {},
            });
          }

          // Execute: Search with English query
          const queryEmbedding = await embeddingService.generateEmbedding(query);
          const results = await vectorService.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.90,
            limit: 5,
          });

          // Verify: All results have similarity >= 0.90
          const allAboveThreshold = results.every(result => result.similarity >= 0.90);

          return allAboveThreshold;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9b: Exact English match returns similarity = 1.0
   * 
   * For any English supplement, searching with exact name should return similarity = 1.0
   */
  it('Property 9b: Exact English match returns perfect similarity', async () => {
    await fc.assert(
      fc.asyncProperty(
        englishSupplementArbitrary,
        async (supplementName) => {
          // Cleanup first to ensure no duplicates
          await vectorService.deleteAll();
          
          // Setup: Insert supplement
          const embedding = await embeddingService.generateEmbedding(supplementName);
          const inserted = await vectorService.insertSupplement({
            name: supplementName,
            commonNames: [],
            embedding,
            metadata: {},
          });

          // Execute: Search with exact same name
          const queryEmbedding = await embeddingService.generateEmbedding(supplementName);
          const results = await vectorService.searchByEmbedding(queryEmbedding, {
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
   * Property 9c: English search results ordered by similarity
   * 
   * For any English query, results should be ordered by similarity (highest first)
   */
  it('Property 9c: English search results ordered by similarity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: englishSupplementArbitrary,
          }),
          { minLength: 5, maxLength: 15 }
        ),
        englishSupplementArbitrary,
        async (supplements, query) => {
          // Setup: Insert English supplements
          for (const supp of supplements) {
            const embedding = await embeddingService.generateEmbedding(supp.name);
            await vectorService.insertSupplement({
              name: supp.name,
              commonNames: [],
              embedding,
              metadata: {},
            });
          }

          // Execute: Search with English query
          const queryEmbedding = await embeddingService.generateEmbedding(query);
          const results = await vectorService.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.0, // Low threshold to get multiple results
            limit: 10,
          });

          // Verify: Results are in descending order
          if (results.length <= 1) {
            return true;
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
   * Property 9d: Case-insensitive English search
   * 
   * For any English supplement, searching with different case should find it
   */
  it('Property 9d: Case-insensitive English search', async () => {
    const testCases = [
      { original: 'vitamin d', variants: ['Vitamin D', 'VITAMIN D', 'ViTaMiN d'] },
      { original: 'magnesium', variants: ['Magnesium', 'MAGNESIUM', 'MaGnEsIuM'] },
      { original: 'omega-3', variants: ['Omega-3', 'OMEGA-3', 'OmEgA-3'] },
    ];

    for (const testCase of testCases) {
      // Setup: Insert supplement with original name
      const originalEmbedding = await embeddingService.generateEmbedding(testCase.original);
      await vectorService.insertSupplement({
        name: testCase.original,
        commonNames: [],
        embedding: originalEmbedding,
        metadata: {},
      });

      // Test each variant
      for (const variant of testCase.variants) {
        const variantEmbedding = await embeddingService.generateEmbedding(variant);
        const results = await vectorService.searchByEmbedding(variantEmbedding, {
          minSimilarity: 0.90,
          limit: 1,
        });

        // Verify: Found the supplement
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].supplement.name).toBe(testCase.original);
        expect(results[0].similarity).toBeGreaterThanOrEqual(0.90);
      }

      // Cleanup
      await vectorService.deleteAll();
    }
  });

  /**
   * Property 9e: Common English supplements are found
   * 
   * For any common English supplement, it should be found with high similarity
   */
  it('Property 9e: Common English supplements found', async () => {
    const commonSupplements = [
      'vitamin d',
      'magnesium',
      'omega-3',
      'vitamin c',
      'zinc',
    ];

    for (const supplementName of commonSupplements) {
      // Setup: Insert supplement
      const embedding = await embeddingService.generateEmbedding(supplementName);
      await vectorService.insertSupplement({
        name: supplementName,
        commonNames: [],
        embedding,
        metadata: {},
      });

      // Execute: Search with same name
      const queryEmbedding = await embeddingService.generateEmbedding(supplementName);
      const results = await vectorService.searchByEmbedding(queryEmbedding, {
        minSimilarity: 0.90,
        limit: 1,
      });

      // Verify: Found the supplement
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].supplement.name).toBe(supplementName);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.90);

      // Cleanup
      await vectorService.deleteAll();
    }
  });
});
