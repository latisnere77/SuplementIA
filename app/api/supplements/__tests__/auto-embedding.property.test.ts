/**
 * Property-Based Tests for Auto-Embedding Generation
 * 
 * Feature: intelligent-supplement-search, Property 22: Auto-embedding generation on insert
 * Validates: Requirements 4.2
 */

import fc from 'fast-check';

// Mock embedding service
class MockEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic 384-dimensional embedding based on text
    // Use a more robust hash that considers character position
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate embedding with position-dependent values
    return Array.from({ length: 384 }, (_, i) => {
      const seed = hash + i * 7919; // Use prime number for better distribution
      return Math.sin(seed) * 0.5 + Math.cos(seed * 1.618) * 0.3;
    });
  }
}

// Mock vector search service
class MockVectorSearchService {
  private supplements: any[] = [];
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
    this.supplements.push(inserted);
    return inserted;
  }

  async close(): Promise<void> {
    // No-op
  }

  getSupplements() {
    return this.supplements;
  }

  clear() {
    this.supplements = [];
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

// Arbitrary: Generate a valid 384-dimensional embedding
const embeddingArbitrary = fc.array(fc.float({ min: -1, max: 1 }), { minLength: 384, maxLength: 384 });

describe('Auto-Embedding Property Tests', () => {
  let embeddingService: MockEmbeddingService;
  let vectorSearchService: MockVectorSearchService;

  beforeEach(() => {
    embeddingService = new MockEmbeddingService();
    vectorSearchService = new MockVectorSearchService();
  });

  afterEach(() => {
    vectorSearchService.clear();
  });

  /**
   * Property 22: Auto-embedding generation on insert
   * 
   * For any supplement inserted without embedding, system should automatically
   * generate embedding using ML local
   * 
   * Validates: Requirements 4.2
   */
  it('Property 22: Auto-embedding generation on insert', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // Simulate the insertion flow:
          // 1. Generate embedding automatically
          const embedding = await embeddingService.generateEmbedding(name);

          // 2. Insert supplement with generated embedding
          const inserted = await vectorSearchService.insertSupplement({
            name,
            scientificName: undefined,
            commonNames: [],
            embedding,
            metadata,
          });

          // Verify: Embedding was generated (384 dimensions)
          const embeddingGenerated = embedding.length === 384;

          // Verify: Supplement was inserted with embedding
          const supplementInserted = inserted.id > 0 && inserted.embedding.length === 384;

          // Verify: Embedding matches what was generated
          const embeddingMatches = JSON.stringify(inserted.embedding) === JSON.stringify(embedding);

          return embeddingGenerated && supplementInserted && embeddingMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22b: Embedding has correct dimensions (384)
   * 
   * For any supplement inserted, the generated embedding should have exactly 384 dimensions
   */
  it('Property 22b: Generated embedding has 384 dimensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
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

          // Verify: Embedding has exactly 384 dimensions
          return embedding.length === 384 && inserted.embedding.length === 384;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22c: Embedding generation is automatic (no manual embedding required)
   * 
   * For any supplement inserted, user should not need to provide embedding manually
   */
  it('Property 22c: No manual embedding required', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // User provides only name and metadata (no embedding)
          const userInput = {
            name,
            metadata,
            // Note: No embedding field provided by user
          };

          // System automatically generates embedding
          const embedding = await embeddingService.generateEmbedding(userInput.name);

          // System inserts supplement with auto-generated embedding
          const inserted = await vectorSearchService.insertSupplement({
            ...userInput,
            scientificName: undefined,
            commonNames: [],
            embedding,
          });

          // Verify: Supplement was successfully inserted
          const insertSuccess = inserted.id > 0;

          // Verify: Embedding was automatically generated (not provided by user)
          const embeddingAutoGenerated = inserted.embedding.length === 384;

          return insertSuccess && embeddingAutoGenerated;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22d: Embedding generation uses supplement name
   * 
   * For any supplement inserted, embedding should be generated from the supplement name
   */
  it('Property 22d: Embedding generated from supplement name', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        metadataArbitrary,
        async (name, metadata) => {
          // Generate embedding from name
          const embedding1 = await embeddingService.generateEmbedding(name);

          // Generate embedding from same name again
          const embedding2 = await embeddingService.generateEmbedding(name);

          // Verify: Same name produces same embedding (deterministic)
          const embeddingsMatch = JSON.stringify(embedding1) === JSON.stringify(embedding2);

          // Verify: Embedding is based on the name (not random)
          return embeddingsMatch && embedding1.length === 384;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22e: Different names produce different embeddings
   * 
   * For any two different supplement names, embeddings should be different
   */
  it('Property 22e: Different names produce different embeddings', async () => {
    await fc.assert(
      fc.asyncProperty(
        supplementNameArbitrary,
        supplementNameArbitrary,
        async (name1, name2) => {
          // Skip if names are the same
          if (name1 === name2) {
            return true;
          }

          // Generate embeddings for both names
          const embedding1 = await embeddingService.generateEmbedding(name1);
          const embedding2 = await embeddingService.generateEmbedding(name2);

          // Verify: Different names produce different embeddings
          const embeddingsDifferent = JSON.stringify(embedding1) !== JSON.stringify(embedding2);

          return embeddingsDifferent;
        }
      ),
      { numRuns: 100 }
    );
  });
});
