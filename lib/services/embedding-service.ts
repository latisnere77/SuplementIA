/**
 * Embedding Service Client
 * 
 * Client for calling the Lambda embedding generation service.
 * Generates 384-dimensional embeddings using Sentence Transformers (all-MiniLM-L6-v2).
 * 
 * Multilingual Support:
 * - Supports 100+ languages including Spanish, English, Portuguese
 * - Semantic similarity works across languages (e.g., "vitamina d" ≈ "vitamin d")
 * - No language detection required - model handles all languages automatically
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  latency: number;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  count: number;
  latency: number;
}

export interface EmbeddingServiceConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Embedding Service Client
 */
export class EmbeddingService {
  private endpoint: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: EmbeddingServiceConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000; // 30s default
  }

  /**
   * Generate embedding for a single text
   * 
   * @param text - Text to embed
   * @returns 384-dimensional embedding
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.callLambda({ text });
    
    if (!response.embedding || response.embedding.length !== 384) {
      throw new Error(`Invalid embedding response: expected 384 dimensions, got ${response.embedding?.length || 0}`);
    }
    
    return response.embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * 
   * @param texts - Array of texts to embed
   * @returns Array of 384-dimensional embeddings
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.callLambdaBatch({ texts });
    
    // Validate all embeddings have correct dimensions
    for (const embedding of response.embeddings) {
      if (embedding.length !== 384) {
        throw new Error(`Invalid embedding response: expected 384 dimensions, got ${embedding.length}`);
      }
    }
    
    return response.embeddings;
  }

  /**
   * Call Lambda function for single embedding
   */
  private async callLambda(body: { text: string }): Promise<EmbeddingResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Embedding service error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Handle Lambda response format
      if (data.body) {
        return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Embedding service timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Call Lambda function for batch embeddings
   */
  private async callLambdaBatch(body: { texts: string[] }): Promise<BatchEmbeddingResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Embedding service error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Handle Lambda response format
      if (data.body) {
        return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }
      
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Embedding service timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}

/**
 * Create an EmbeddingService instance
 * 
 * @param config - Service configuration
 * @returns EmbeddingService instance
 */
export function createEmbeddingService(config?: Partial<EmbeddingServiceConfig>): EmbeddingService {
  return new EmbeddingService({
    endpoint: config?.endpoint || process.env.EMBEDDING_SERVICE_ENDPOINT || '',
    apiKey: config?.apiKey || process.env.EMBEDDING_SERVICE_API_KEY,
    timeout: config?.timeout,
  });
}
