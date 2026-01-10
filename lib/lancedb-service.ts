/**
 * LanceDB Service - Local vector search with PRISTINE QUALITY supplements
 *
 * Uses:
 * - Local LanceDB at /tmp/lancedb-pristine (156 supplements, Grade A/B/C only)
 * - Amazon Bedrock Titan V2 for query embeddings (512D)
 * - Cosine similarity for semantic search
 *
 * Quality: 85/100 score, 42.3% Grade A, all mainstream supplements included
 */

import { connect as lancedbConnect } from '@lancedb/lancedb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Configuration
const LANCEDB_PATH = process.env.LANCEDB_PATH || '/tmp/lancedb-pristine';
const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0';
const EMBEDDING_DIMENSIONS = 512;

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

// Singleton database connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbConnection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supplementsTable: any = null;

export interface LanceDBResult {
  id: number;
  name: string;
  scientific_name: string;
  common_names: string[];
  metadata: {
    category: string;
    ingredient_type: string;
    evidence_grade: string;
    study_count: number;
    rct_count: number;
    pubmed_query: string;
    data_quality_score: number;
    molecular_formula?: string;
    molecular_weight?: number;
    botanical_family?: string;
    plant_part?: string;
  };
  similarity: number;
  _distance?: number;
}

/**
 * Generate embedding using Bedrock Titan V2
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: EMBEDDING_MODEL,
      body: JSON.stringify({
        inputText: text,
        dimensions: EMBEDDING_DIMENSIONS,
        normalize: true
      })
    }));

    const bodyText = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyText);
    return result.embedding;
  } catch (error) {
    console.error('[LanceDB] Bedrock embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get or initialize LanceDB connection
 */
async function getLanceDB() {
  if (!supplementsTable) {
    console.log(`[LanceDB] Connecting to: ${LANCEDB_PATH}`);

    try {
      dbConnection = await lancedbConnect(LANCEDB_PATH);
      supplementsTable = await dbConnection.openTable('supplements');

      const count = await supplementsTable.countRows();
      console.log(`[LanceDB] Connected successfully. ${count} supplements available.`);
    } catch (error) {
      console.error('[LanceDB] Connection failed:', error);
      throw new Error(`Failed to connect to LanceDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return supplementsTable;
}

/**
 * Search supplements using vector similarity
 *
 * @param query - Natural language query (e.g., "magnesium for sleep")
 * @param limit - Maximum number of results to return
 * @returns Array of matching supplements with similarity scores
 */
export async function searchLanceDB(query: string, limit: number = 10): Promise<LanceDBResult[]> {
  const searchStart = Date.now();
  console.log(`[LanceDB] Vector search: "${query}" (limit: ${limit})`);

  try {
    // Get table connection
    const table = await getLanceDB();

    // Generate query embedding
    const embedding = await generateEmbedding(query);
    console.log(`[LanceDB] Embedding generated (${embedding.length}D)`);

    // Perform vector search
    const results = await table
      .search(embedding)
      .limit(limit)
      .toArray();

    console.log(`[LanceDB] Found ${results.length} results in ${Date.now() - searchStart}ms`);

    // Helper to convert BigInt to Number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toNumber = (val: any): number => {
      if (typeof val === 'bigint') return Number(val);
      if (typeof val === 'number') return val;
      return 0;
    };

    // Map results to standardized format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedResults: LanceDBResult[] = results.map((r: any) => ({
      id: toNumber(r.id),
      name: String(r.name || ''),
      scientific_name: String(r.scientific_name || ''),
      common_names: Array.isArray(r.common_names) ? r.common_names.map(String) : [],
      metadata: {
        category: String(r.metadata?.category || 'other'),
        ingredient_type: String(r.metadata?.ingredient_type || 'other'),
        evidence_grade: String(r.metadata?.evidence_grade || 'C'),
        study_count: toNumber(r.metadata?.study_count || 0),
        rct_count: toNumber(r.metadata?.rct_count || 0),
        pubmed_query: String(r.metadata?.pubmed_query || ''),
        data_quality_score: toNumber(r.metadata?.data_quality_score || 0),
        molecular_formula: r.metadata?.molecular_formula ? String(r.metadata.molecular_formula) : undefined,
        molecular_weight: r.metadata?.molecular_weight ? toNumber(r.metadata.molecular_weight) : undefined,
        botanical_family: r.metadata?.botanical_family ? String(r.metadata.botanical_family) : undefined,
        plant_part: r.metadata?.plant_part ? String(r.metadata.plant_part) : undefined
      },
      similarity: r._distance !== undefined ? (1 - Number(r._distance)) : 0,
      _distance: r._distance !== undefined ? Number(r._distance) : undefined
    }));

    // Log top result for debugging
    if (mappedResults.length > 0) {
      const top = mappedResults[0];
      console.log(`[LanceDB] Top match: ${top.name} (grade ${top.metadata.evidence_grade}, ${top.metadata.study_count} studies, similarity: ${top.similarity.toFixed(3)})`);
    }

    return mappedResults;
  } catch (error) {
    console.error('[LanceDB] Search error:', error);
    throw error;
  }
}

/**
 * Get supplement by exact name match
 *
 * @param name - Exact supplement name (case-insensitive)
 * @returns Supplement data or null if not found
 */
export async function getSupplementByName(name: string): Promise<LanceDBResult | null> {
  console.log(`[LanceDB] Exact name lookup: "${name}"`);

  try {
    const table = await getLanceDB();
    const normalized = name.toLowerCase().trim();

    // Search with exact name
    const results = await table
      .search(normalized)
      .limit(10)
      .toArray();

    // Find exact match (case-insensitive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exactMatch = results.find((r: any) =>
      r.name.toLowerCase() === normalized ||
      r.common_names?.some((n: string) => n.toLowerCase() === normalized)
    );

    if (exactMatch) {
      console.log(`[LanceDB] Exact match found: ${exactMatch.name}`);
      return {
        id: exactMatch.id,
        name: exactMatch.name,
        scientific_name: exactMatch.scientific_name || '',
        common_names: exactMatch.common_names || [],
        metadata: exactMatch.metadata,
        similarity: 1.0,
        _distance: 0
      };
    }

    console.log(`[LanceDB] No exact match for "${name}"`);
    return null;
  } catch (error) {
    console.error('[LanceDB] Lookup error:', error);
    return null;
  }
}

/**
 * Get database statistics
 */
export async function getLanceDBStats() {
  try {
    await getLanceDB();
    const count = await supplementsTable.countRows();

    return {
      total_supplements: count,
      database_path: LANCEDB_PATH,
      embedding_model: EMBEDDING_MODEL,
      embedding_dimensions: EMBEDDING_DIMENSIONS,
      status: 'connected'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Close database connection (for cleanup)
 */
export async function closeLanceDB() {
  if (dbConnection) {
    console.log('[LanceDB] Closing connection');
    supplementsTable = null;
    dbConnection = null;
  }
}
