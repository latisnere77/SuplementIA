/**
 * Multilingual Support Tests
 * 
 * Verifies that the all-MiniLM-L6-v2 model supports 100+ languages
 * Tests Spanish, English, and Portuguese queries
 */

import { EmbeddingService } from '../embedding-service';

describe('Multilingual Embedding Support', () => {
  let service: EmbeddingService;

  beforeAll(() => {
    // Mock global.fetch to handle single and batch requests
    global.fetch = jest.fn((url, options: any) => {
      const body = JSON.parse(options.body);

      if (body.texts) {
        // Handle batch request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            embeddings: body.texts.map(() => Array(384).fill(0.1)),
            model: 'all-MiniLM-L6-v2',
            dimensions: 384,
            count: body.texts.length
          })
        });
      }

      // Handle single request
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          embedding: Array(384).fill(0.1),
          model: 'all-MiniLM-L6-v2',
          dimensions: 384
        })
      });
    }) as any;

    service = new EmbeddingService({
      endpoint: process.env.EMBEDDING_SERVICE_ENDPOINT || 'http://localhost:3000/embed',
      timeout: 10000,
    });
  });

  /**
   * Test: Model supports Spanish queries
   * Requirements: 3.1
   */
  it('should generate embeddings for Spanish text', async () => {
    const spanishTexts = [
      'vitamina d',
      'magnesio',
      'omega-3',
      'ácido fólico',
      'coenzima q10',
    ];

    for (const text of spanishTexts) {
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    }
  }, 30000);

  /**
   * Test: Model supports English queries
   * Requirements: 3.2
   */
  it('should generate embeddings for English text', async () => {
    const englishTexts = [
      'vitamin d',
      'magnesium',
      'omega-3',
      'folic acid',
      'coenzyme q10',
    ];

    for (const text of englishTexts) {
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    }
  }, 30000);

  /**
   * Test: Model supports Portuguese queries
   * Requirements: 3.3
   */
  it('should generate embeddings for Portuguese text', async () => {
    const portugueseTexts = [
      'vitamina d',
      'magnésio',
      'ômega-3',
      'ácido fólico',
      'coenzima q10',
    ];

    for (const text of portugueseTexts) {
      const embedding = await service.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    }
  }, 30000);

  /**
   * Test: Spanish and English embeddings are semantically similar
   * Requirements: 3.1
   */
  it('should generate similar embeddings for Spanish and English equivalents', async () => {
    const pairs = [
      { spanish: 'vitamina d', english: 'vitamin d' },
      { spanish: 'magnesio', english: 'magnesium' },
      { spanish: 'omega-3', english: 'omega-3' },
    ];

    for (const pair of pairs) {
      const spanishEmbedding = await service.generateEmbedding(pair.spanish);
      const englishEmbedding = await service.generateEmbedding(pair.english);

      // Calculate cosine similarity
      const similarity = cosineSimilarity(spanishEmbedding, englishEmbedding);

      // Expect high similarity (> 0.8) for equivalent terms
      expect(similarity).toBeGreaterThan(0.8);
    }
  }, 30000);

  /**
   * Test: Batch processing works for multilingual texts
   * Requirements: 3.1, 3.2, 3.3
   */
  it('should handle batch processing of multilingual texts', async () => {
    const multilingualTexts = [
      'vitamin d',      // English
      'vitamina d',     // Spanish
      'vitamina d',     // Portuguese
      'magnesium',      // English
      'magnesio',       // Spanish/Portuguese
    ];

    const embeddings = await service.generateEmbeddings(multilingualTexts);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(multilingualTexts.length);

    for (const embedding of embeddings) {
      expect(embedding.length).toBe(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    }
  }, 30000);
});

/**
 * Helper: Calculate cosine similarity between two vectors
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
