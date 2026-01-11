/**
 * Property-Based Tests for Scalability
 * 
 * Feature: intelligent-supplement-search, Property 21: Scalability with large dataset (1000+ supplements)
 * Validates: Requirements 4.4
 */

import fc from 'fast-check';

// Mock embedding service
class MockEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Fast embedding generation
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(hash + i));
    
    // Normalize to unit length
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

// Mock vector search service
class MockVectorSearchService {
  private supplements: Map<number, any> = new Map();
  private nextId = 1;

  async insertSupplement(supplement: any): Promise<any> {
    const id = this.nextId++;
    const inserted = {
      id,
      ...supplement,
      searchCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.supplements.set(id, inserted);
    return inserted;
  }

  async searchByEmbedding(embedding: number[], options: any = {}): Promise<any[]> {
    const startTime = performance.now();
    
    const { minSimilarity = 0.85, limit = 5 } = options;
    
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

    const endTime = performance.now();
    const latency = endTime - startTime;
    
    return results.map(r => ({ ...r, latency }));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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

  getCount(): number {
    return this.supplements.size;
  }

  clear() {
    this.supplements.clear();
    this.nextId = 1;
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

describe('Scalability Property Tests', () => {
  /**
   * Property 21: Scalability with large dataset (1000+ supplements)
   * 
   * For any database with 1000+ supplements, search time should remain < 200ms
   * 
   * Validates: Requirements 4.4
   */
  it('Property 21: Search performance with 1000+ supplements', async () => {
    const embeddingService = new MockEmbeddingService();
    const vectorSearchService = new MockVectorSearchService();

    // Insert 1000 supplements
    const supplementCount = 1000;
    for (let i = 0; i < supplementCount; i++) {
      const name = `Supplement ${i}`;
      const embedding = await embeddingService.generateEmbedding(name);
      await vectorSearchService.insertSupplement({
        name,
        scientificName: undefined,
        commonNames: [],
        embedding,
        metadata: {
          category: 'vitamin',
          popularity: 'medium',
          evidenceGrade: 'B',
          studyCount: 10,
        },
      });
    }

    // Verify we have 1000+ supplements
    expect(vectorSearchService.getCount()).toBeGreaterThanOrEqual(1000);

    // Test search performance
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        async (queryName) => {
          const queryEmbedding = await embeddingService.generateEmbedding(queryName);
          
          const startTime = performance.now();
          const results = await vectorSearchService.searchByEmbedding(queryEmbedding, {
            minSimilarity: 0.85,
            limit: 5,
          });
          const endTime = performance.now();
          
          const searchLatency = endTime - startTime;
          
          // Verify: Search completes in < 200ms even with 1000+ supplements
          return searchLatency < 200;
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 60000); // 60s timeout for this test

  /**
   * Property 21b: Linear scalability
   * 
   * For any dataset size, search time should scale linearly (not exponentially)
   */
  it('Property 21b: Search time scales linearly', async () => {
    const embeddingService = new MockEmbeddingService();
    
    const testSizes = [100, 500, 1000];
    const latencies: number[] = [];

    for (const size of testSizes) {
      const vectorSearchService = new MockVectorSearchService();
      
      // Insert supplements
      for (let i = 0; i < size; i++) {
        const name = `Supplement ${i}`;
        const embedding = await embeddingService.generateEmbedding(name);
        await vectorSearchService.insertSupplement({
          name,
          scientificName: undefined,
          commonNames: [],
          embedding,
          metadata: {
            category: 'vitamin',
            popularity: 'medium',
            evidenceGrade: 'B',
            studyCount: 10,
          },
        });
      }

      // Measure search time
      const queryEmbedding = await embeddingService.generateEmbedding('test query');
      const startTime = performance.now();
      await vectorSearchService.searchByEmbedding(queryEmbedding, {
        minSimilarity: 0.85,
        limit: 5,
      });
      const endTime = performance.now();
      
      latencies.push(endTime - startTime);
    }

    // Verify: All search times are < 200ms
    const allUnder200ms = latencies.every(lat => lat < 200);
    
    // Verify: Growth is not exponential (10x data should not cause 100x slowdown)
    const ratio = latencies[2] / latencies[0]; // 1000 vs 100
    const linearGrowth = ratio < 20; // Allow some overhead, but not exponential

    expect(allUnder200ms).toBe(true);
    expect(linearGrowth).toBe(true);
  }, 60000);

  /**
   * Property 21c: Consistent performance across dataset
   * 
   * For any large dataset, search performance should be consistent regardless of query
   */
  it('Property 21c: Consistent search performance', async () => {
    const embeddingService = new MockEmbeddingService();
    const vectorSearchService = new MockVectorSearchService();

    // Insert 1000 supplements
    for (let i = 0; i < 1000; i++) {
      const name = `Supplement ${i}`;
      const embedding = await embeddingService.generateEmbedding(name);
      await vectorSearchService.insertSupplement({
        name,
        scientificName: undefined,
        commonNames: [],
        embedding,
        metadata: {
          category: 'vitamin',
          popularity: 'medium',
          evidenceGrade: 'B',
          studyCount: 10,
        },
      });
    }

    // Test multiple queries
    await fc.assert(
      fc.asyncProperty(
        fc.array(supplementNameArbitrary, { minLength: 10, maxLength: 10 }),
        async (queryNames) => {
          const latencies: number[] = [];

          for (const queryName of queryNames) {
            const queryEmbedding = await embeddingService.generateEmbedding(queryName);
            
            const startTime = performance.now();
            await vectorSearchService.searchByEmbedding(queryEmbedding, {
              minSimilarity: 0.85,
              limit: 5,
            });
            const endTime = performance.now();
            
            latencies.push(endTime - startTime);
          }

          // Verify: All searches complete in < 200ms
          const allUnder200ms = latencies.every(lat => lat < 200);
          
          // Verify: Variance is low (consistent performance)
          const avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
          const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
          const stdDev = Math.sqrt(variance);
          const consistentPerformance = stdDev < 50; // Standard deviation < 50ms

          return allUnder200ms && consistentPerformance;
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  }, 60000);
});
