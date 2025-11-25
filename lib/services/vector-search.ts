/**
 * Vector Search Service
 * 
 * Provides semantic search functionality using pgvector in RDS Postgres.
 * Searches for supplements by vector similarity using embeddings.
 */

import { Pool, PoolClient } from 'pg';

export interface Supplement {
  id: number;
  name: string;
  scientificName?: string;
  commonNames: string[];
  embedding: number[];
  metadata: {
    category?: string;
    popularity?: 'high' | 'medium' | 'low';
    evidenceGrade?: 'A' | 'B' | 'C' | 'D';
    studyCount?: number;
    pubmedQuery?: string;
  };
  searchCount: number;
  lastSearchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  supplement: Supplement;
  similarity: number;
}

export interface VectorSearchOptions {
  minSimilarity?: number;
  limit?: number;
}

/**
 * Vector Search Service
 */
export class VectorSearchService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Search for supplements by vector similarity
   * 
   * @param embedding - 384-dimensional embedding vector
   * @param options - Search options (minSimilarity, limit)
   * @returns Array of search results with similarity scores
   */
  async searchByEmbedding(
    embedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    const { minSimilarity = 0.85, limit = 5 } = options;

    // Validate embedding dimensions
    if (embedding.length !== 384) {
      throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding.length}`);
    }

    // Convert embedding to pgvector format
    const embeddingStr = `[${embedding.join(',')}]`;

    const query = `
      SELECT 
        id,
        name,
        scientific_name,
        common_names,
        embedding,
        metadata,
        search_count,
        last_searched_at,
        created_at,
        updated_at,
        1 - (embedding <=> $1::vector) as similarity
      FROM supplements
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY similarity DESC
      LIMIT $3
    `;

    const result = await this.pool.query(query, [embeddingStr, minSimilarity, limit]);

    return result.rows.map(row => ({
      supplement: {
        id: row.id,
        name: row.name,
        scientificName: row.scientific_name,
        commonNames: row.common_names || [],
        embedding: row.embedding,
        metadata: row.metadata || {},
        searchCount: row.search_count,
        lastSearchedAt: row.last_searched_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Insert a supplement with embedding
   * 
   * @param supplement - Supplement data with embedding
   * @returns Inserted supplement with ID
   */
  async insertSupplement(supplement: Omit<Supplement, 'id' | 'searchCount' | 'createdAt' | 'updatedAt'>): Promise<Supplement> {
    // Validate embedding dimensions
    if (supplement.embedding.length !== 384) {
      throw new Error(`Invalid embedding dimensions: expected 384, got ${supplement.embedding.length}`);
    }

    const embeddingStr = `[${supplement.embedding.join(',')}]`;

    const query = `
      INSERT INTO supplements (
        name,
        scientific_name,
        common_names,
        embedding,
        metadata,
        last_searched_at
      ) VALUES ($1, $2, $3, $4::vector, $5, $6)
      RETURNING 
        id,
        name,
        scientific_name,
        common_names,
        embedding,
        metadata,
        search_count,
        last_searched_at,
        created_at,
        updated_at
    `;

    const result = await this.pool.query(query, [
      supplement.name,
      supplement.scientificName || null,
      supplement.commonNames,
      embeddingStr,
      JSON.stringify(supplement.metadata),
      supplement.lastSearchedAt || null,
    ]);

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      scientificName: row.scientific_name,
      commonNames: row.common_names || [],
      embedding: row.embedding,
      metadata: row.metadata || {},
      searchCount: row.search_count,
      lastSearchedAt: row.last_searched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Increment search count for a supplement
   * 
   * @param supplementId - ID of the supplement
   */
  async incrementSearchCount(supplementId: number): Promise<void> {
    await this.pool.query('SELECT increment_search_count($1)', [supplementId]);
  }

  /**
   * Get supplement by ID
   * 
   * @param id - Supplement ID
   * @returns Supplement or null if not found
   */
  async getById(id: number): Promise<Supplement | null> {
    const result = await this.pool.query(
      `SELECT 
        id,
        name,
        scientific_name,
        common_names,
        embedding,
        metadata,
        search_count,
        last_searched_at,
        created_at,
        updated_at
      FROM supplements
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      scientificName: row.scientific_name,
      commonNames: row.common_names || [],
      embedding: row.embedding,
      metadata: row.metadata || {},
      searchCount: row.search_count,
      lastSearchedAt: row.last_searched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete all supplements (for testing)
   */
  async deleteAll(): Promise<void> {
    await this.pool.query('DELETE FROM supplements');
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Create a VectorSearchService instance
 * 
 * @param config - Database configuration
 * @returns VectorSearchService instance
 */
export function createVectorSearchService(config?: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}): VectorSearchService {
  const pool = new Pool({
    host: config?.host || process.env.POSTGRES_HOST || 'localhost',
    port: config?.port || parseInt(process.env.POSTGRES_PORT || '5432'),
    database: config?.database || process.env.POSTGRES_DATABASE || 'supplements',
    user: config?.user || process.env.POSTGRES_USER || 'postgres',
    password: config?.password || process.env.POSTGRES_PASSWORD,
    ssl: config?.ssl !== undefined ? config.ssl : process.env.POSTGRES_SSL === 'true',
  });

  return new VectorSearchService(pool);
}
