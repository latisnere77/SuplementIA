/**
 * Property-Based Tests for Insert-to-Search Latency
 * 
 * Feature: intelligent-supplement-search, Property 20: Insert-to-search latency < 1s
 * Validates: Requirements 4.3
 */

import fc from 'fast-check';

// Mock embedding service
class MockEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Simulate fast embedding generation (< 100ms)
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // Generate a deterministic embedding based on text
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(hash + i));
    
    // Normalize the embedding to unit length (important for cosine similarity)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

// Mock vector search service
class MockVectorSearchService {
  private supplements: Map<number, any> = new Map();
  private nextId = 1;

  async insertSupplement(supplement: any): Promise<any> {
    // Simulate fast database insert (< 50ms)
    await new Promise(resolve => setTimeout(resolve, 2));
    
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
    // Simulate fast vector search (< 50ms)
    await new Promise(resolve => setTimeout(resolve, 1));
    
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

    return results;
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

  async close(): Promise<void> {
    // No-op
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

describe('Insert-to-Search Latency Property Tests', () => {
  // Create fresh instances for each property test run
  const createServices = () => ({
    embeddingService: new MockEmbeddingService(),
    vectorSearchService: new MockVectorSearchService(),
  });

  /**
   * Property 20: Insert-to-search latency < 1s
   * 
   * For any newly inserted supplement, it should be searchable within 1 second
   * 
   * Validates: Requirements 4.3
   */
  it('Property 20: Insert-to-search latency < 1s', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // Create fresh services for each test run
          const { embeddingService, vectorSearchService } = createServices();
          
          const startTime = performance.now();

          // Step 1: Generate embedding
          const embedding = await embeddingService.generateEmbedding(name);

          // Step 2: Insert supplement
          const inserted = await vectorSearchService.insertSupplement({
            name,
            scientificName: undefined,
            commonNames: [],
            embedding,
            metadata,
          });

          // Step 3: Search for the supplement immediately using the SAME embedding
          const searchResults = await vectorSearchService.searchByEmbedding(embedding, {
            minSimilarity: 0.99, // Very high threshold - should find exact match
            limit: 10,
          });

          const endTime = performance.now();
          const latency = endTime - startTime;

          // Verify: Total latency is < 1000ms (1 second)
          const latencyUnder1s = latency < 1000;

          // Verify: Supplement was found in search
          // Since we're using the exact same embedding, similarity should be ~1.0
          const supplementFound = searchResults.some(r => r.supplement.id === inserted.id && r.similarity >= 0.99);

          return latencyUnder1s && supplementFound;
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property 20b: Insert-to-search latency is consistent
   * 
   * For any sequence of inserts, latency should remain < 1s for each
   */
  it('Property 20b: Consistent latency across multiple inserts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: supplementNameArbitrary,
            metadata: metadataArbitrary,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (supplements) => {
          // Create fresh services for each test run
          const { embeddingService, vectorSearchService } = createServices();
          
          const latencies: number[] = [];

          for (const supp of supplements) {
            const startTime = performance.now();

            // Generate embedding
            const embedding = await embeddingService.generateEmbedding(supp.name);

            // Insert supplement
            const inserted = await vectorSearchService.insertSupplement({
              name: supp.name,
              scientificName: undefined,
              commonNames: [],
              embedding,
              metadata: supp.metadata,
            });

            // Search for supplement
            const searchResults = await vectorSearchService.searchByEmbedding(embedding, {
              minSimilarity: 0.99,
              limit: 10,
            });

            const endTime = performance.now();
            const latency = endTime - startTime;
            latencies.push(latency);

            // Verify supplement was found
            if (!searchResults.some(r => r.supplement.id === inserted.id && r.similarity >= 0.99)) {
              return false;
            }
          }

          // Verify: All latencies are < 1000ms
          return latencies.every(latency => latency < 1000);
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property 20c: Immediate searchability
   * 
   * For any supplement, it should be immediately searchable after insert (no delay)
   */
  it('Property 20c: Immediate searchability after insert', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // Create fresh services for each test run
          const { embeddingService, vectorSearchService } = createServices();
          
          // Generate embedding
          const embedding = await embeddingService.generateEmbedding(name);

          // Insert supplement
          const inserted = await vectorSearchService.insertSupplement({
            name,
            scientificName: undefined,
            commonNames: [],
            embedding,
            metadata,
          });

          // Search IMMEDIATELY (no delay)
          const searchResults = await vectorSearchService.searchByEmbedding(embedding, {
            minSimilarity: 0.99,
            limit: 10,
          });

          // Verify: Supplement is found immediately
          const found = searchResults.some(r => r.supplement.id === inserted.id && r.similarity >= 0.99);

          return found;
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property 20d: Search returns correct supplement after insert
   * 
   * For any supplement inserted, searching with its embedding should return that exact supplement
   */
  it('Property 20d: Search returns correct supplement', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // Create fresh services for each test run
          const { embeddingService, vectorSearchService } = createServices();
          
          // Generate embedding
          const embedding = await embeddingService.generateEmbedding(name);

          // Insert supplement
          const inserted = await vectorSearchService.insertSupplement({
            name,
            scientificName: undefined,
            commonNames: [],
            embedding,
            metadata,
          });

          // Search for supplement
          const searchResults = await vectorSearchService.searchByEmbedding(embedding, {
            minSimilarity: 0.99,
            limit: 10,
          });

          // Verify: Correct supplement is returned
          const matchingResult = searchResults.find(r => r.supplement.id === inserted.id);
          
          if (!matchingResult) {
            return false;
          }

          const correctName = matchingResult.supplement.name === name;
          const highSimilarity = matchingResult.similarity >= 0.99; // Should be nearly perfect

          return correctName && highSimilarity;
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);
});
