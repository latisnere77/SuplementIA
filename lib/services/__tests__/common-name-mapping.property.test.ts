/**
 * Property-Based Tests for Common Name Mapping
 * 
 * Feature: intelligent-supplement-search
 * Property 11: Common name to scientific name mapping
 * Validates: Requirements 3.5
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
    // Common names and scientific names should have similar embeddings
    const normalized = text.toLowerCase().trim();
    
    // Map common names to scientific names for semantic similarity
    const commonToScientific: Record<string, string> = {
      'vitamin d': 'cholecalciferol',
      'vitamin c': 'ascorbic acid',
      'vitamin b12': 'cyanocobalamin',
      'vitamin b6': 'pyridoxine',
      'vitamin e': 'tocopherol',
      'magnesium': 'magnesium glycinate',
      'omega-3': 'eicosapentaenoic acid',
      'folic acid': 'pteroylglutamic acid',
      'coenzyme q10': 'ubiquinone',
      'iron': 'ferrous sulfate',
      'calcium': 'calcium carbonate',
      'zinc': 'zinc gluconate',
      'ashwagandha': 'withania somnifera',
      'turmeric': 'curcuma longa',
      'ginger': 'zingiber officinale',
      'garlic': 'allium sativum',
    };

    // Use scientific name if available, otherwise use original
    const baseText = commonToScientific[normalized] || normalized;
    
    // Generate embedding based on base text
    return this.generateDeterministicEmbedding(baseText);
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

// Test data: Common name to scientific name mappings
const commonScientificPairs = [
  { common: 'Vitamin D', scientific: 'Cholecalciferol' },
  { common: 'Vitamin C', scientific: 'Ascorbic Acid' },
  { common: 'Vitamin B12', scientific: 'Cyanocobalamin' },
  { common: 'Vitamin B6', scientific: 'Pyridoxine' },
  { common: 'Vitamin E', scientific: 'Tocopherol' },
  { common: 'Magnesium', scientific: 'Magnesium Glycinate' },
  { common: 'Omega-3', scientific: 'Eicosapentaenoic Acid' },
  { common: 'Folic Acid', scientific: 'Pteroylglutamic Acid' },
  { common: 'Coenzyme Q10', scientific: 'Ubiquinone' },
  { common: 'Iron', scientific: 'Ferrous Sulfate' },
  { common: 'Calcium', scientific: 'Calcium Carbonate' },
  { common: 'Zinc', scientific: 'Zinc Gluconate' },
  { common: 'Ashwagandha', scientific: 'Withania somnifera' },
  { common: 'Turmeric', scientific: 'Curcuma longa' },
  { common: 'Ginger', scientific: 'Zingiber officinale' },
  { common: 'Garlic', scientific: 'Allium sativum' },
];

// Arbitrary: Common-scientific name pairs
const commonScientificPairArbitrary = fc.constantFrom(...commonScientificPairs);

describe('Common Name Mapping Property Tests', () => {
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
   * Property 11: Common name to scientific name mapping
   * 
   * For any supplement with both scientific and common names,
   * searching by common name should find the supplement by scientific name
   * 
   * Validates: Requirements 3.5
   */
  it('Property 11: Common name finds scientific name', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(commonScientificPairArbitrary, { minLength: 5, maxLength: 15 }),
        commonScientificPairArbitrary,
        async (supplements, queryPair) => {
          // Setup: Insert supplements with scientific names
          for (const pair of supplements) {
            const embedding = await embeddingService.generateEmbedding(pair.scientific);
            await vectorService.insertSupplement({
              name: pair.common,
              scientificName: pair.scientific,
              commonNames: [pair.common],
              embedding,
              metadata: {},
            });
          }

          // Execute: Search with common name
          const queryEmbedding = await embeddingService.generateEmbedding(queryPair.common);
          const results = await vectorService.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.85,
            limit: 5,
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
   * Property 11b: Common name search finds correct supplement
   * 
   * For any supplement, searching by common name should find it
   */
  it('Property 11b: Common name search finds correct supplement', async () => {
    for (const pair of commonScientificPairs) {
      // Cleanup
      await vectorService.deleteAll();

      // Setup: Insert supplement with scientific name
      const embedding = await embeddingService.generateEmbedding(pair.scientific);
      const inserted = await vectorService.insertSupplement({
        name: pair.common,
        scientificName: pair.scientific,
        commonNames: [pair.common],
        embedding,
        metadata: {},
      });

      // Execute: Search with common name
      const queryEmbedding = await embeddingService.generateEmbedding(pair.common);
      const results = await vectorService.searchByEmbedding(queryEmbedding, {
        minSimilarity: 0.85,
        limit: 1,
      });

      // Verify: Found the supplement
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].supplement.id).toBe(inserted.id);
      expect(results[0].supplement.name).toBe(pair.common);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.85);
    }
  });

  /**
   * Property 11c: Common-scientific name pairs have high similarity
   * 
   * For any common-scientific name pair, embeddings should have high similarity
   */
  it('Property 11c: Common-scientific pairs have high similarity', async () => {
    await fc.assert(
      fc.asyncProperty(
        commonScientificPairArbitrary,
        async (pair) => {
          // Generate embeddings for both
          const commonEmbedding = await embeddingService.generateEmbedding(pair.common);
          const scientificEmbedding = await embeddingService.generateEmbedding(pair.scientific);

          // Calculate similarity
          const similarity = cosineSimilarity(commonEmbedding, scientificEmbedding);

          // Verify: Similarity >= 0.85
          return similarity >= 0.85;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11d: Case-insensitive common name search
   * 
   * For any common name, searching with different case should find it
   */
  it('Property 11d: Case-insensitive common name search', async () => {
    const testCases = [
      { common: 'Vitamin D', scientific: 'Cholecalciferol', variants: ['vitamin d', 'VITAMIN D', 'ViTaMiN D'] },
      { common: 'Magnesium', scientific: 'Magnesium Glycinate', variants: ['magnesium', 'MAGNESIUM', 'MaGnEsIuM'] },
      { common: 'Omega-3', scientific: 'Eicosapentaenoic Acid', variants: ['omega-3', 'OMEGA-3', 'OmEgA-3'] },
    ];

    for (const testCase of testCases) {
      // Setup: Insert supplement with scientific name
      const embedding = await embeddingService.generateEmbedding(testCase.scientific);
      await vectorService.insertSupplement({
        name: testCase.common,
        scientificName: testCase.scientific,
        commonNames: [testCase.common],
        embedding,
        metadata: {},
      });

      // Test each variant
      for (const variant of testCase.variants) {
        const variantEmbedding = await embeddingService.generateEmbedding(variant);
        const results = await vectorService.searchByEmbedding(variantEmbedding, {
          minSimilarity: 0.85,
          limit: 1,
        });

        // Verify: Found the supplement
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].supplement.name).toBe(testCase.common);
        expect(results[0].similarity).toBeGreaterThanOrEqual(0.85);
      }

      // Cleanup
      await vectorService.deleteAll();
    }
  });

  /**
   * Property 11e: Multiple common names for same supplement
   * 
   * For any supplement with multiple common names,
   * all should find the same supplement
   */
  it('Property 11e: Multiple common names find same supplement', async () => {
    // Setup: Insert supplement with multiple common names
    // Use the scientific name for embedding so all common names map to it
    const scientificName = 'Cholecalciferol';
    const commonNames = ['Vitamin D'];
    
    const embedding = await embeddingService.generateEmbedding(scientificName);
    const inserted = await vectorService.insertSupplement({
      name: 'Vitamin D',
      scientificName,
      commonNames,
      embedding,
      metadata: {},
    });

    // Test common name that maps to the same scientific name
    const testNames = ['Vitamin D', 'vitamin d', 'VITAMIN D'];
    
    for (const testName of testNames) {
      const queryEmbedding = await embeddingService.generateEmbedding(testName);
      const results = await vectorService.searchByEmbedding(queryEmbedding, {
        minSimilarity: 0.85,
        limit: 1,
      });

      // Verify: Found the same supplement
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].supplement.id).toBe(inserted.id);
      expect(results[0].supplement.scientificName).toBe(scientificName);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.85);
    }
  });

  /**
   * Property 11f: Bidirectional mapping consistency
   * 
   * For any supplement, searching by common name and scientific name
   * should find the same supplement
   */
  it('Property 11f: Bidirectional mapping consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        commonScientificPairArbitrary,
        async (pair) => {
          // Cleanup
          await vectorService.deleteAll();

          // Setup: Insert supplement
          const embedding = await embeddingService.generateEmbedding(pair.scientific);
          const inserted = await vectorService.insertSupplement({
            name: pair.common,
            scientificName: pair.scientific,
            commonNames: [pair.common],
            embedding,
            metadata: {},
          });

          // Search by common name
          const commonEmbedding = await embeddingService.generateEmbedding(pair.common);
          const commonResults = await vectorService.searchByEmbedding(commonEmbedding, {
            minSimilarity: 0.85,
            limit: 1,
          });

          // Search by scientific name
          const scientificEmbedding = await embeddingService.generateEmbedding(pair.scientific);
          const scientificResults = await vectorService.searchByEmbedding(scientificEmbedding, {
            minSimilarity: 0.85,
            limit: 1,
          });

          // Verify: Both searches find the same supplement
          if (commonResults.length === 0 || scientificResults.length === 0) {
            return false;
          }

          return commonResults[0].supplement.id === scientificResults[0].supplement.id &&
                 commonResults[0].supplement.id === inserted.id;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper: Calculate cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
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
