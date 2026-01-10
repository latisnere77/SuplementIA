/**
 * Search Service - Uses LanceDB (local) or Lambda Function URL fallback
 *
 * Primary: Local LanceDB with PRISTINE QUALITY supplements (156, Grade A/B/C)
 * Fallback: Lambda Function URL (if LanceDB unavailable)
 */

import { searchLanceDB, type LanceDBResult } from './lancedb-service';

// Lambda Function URL for search (fallback only)
const SEARCH_API_URL = process.env.SEARCH_API_URL ||
  'https://ogmnjgz664uws4h4t522agsmj40gbpyr.lambda-url.us-east-1.on.aws/';

// Feature flag: USE_LANCEDB=true (default), USE_LANCEDB=false (lambda only)
const USE_LANCEDB = process.env.USE_LANCEDB !== 'false';

export interface SearchResult {
  title?: string;
  name?: string;
  abstract?: string;
  description?: string;
  mechanisms?: string;
  ingredients?: string[];
  conditions?: string[];
  year?: number;
  score?: number;
  study_count?: number;
  evidence_grade?: string;
}

/**
 * Search supplements using LanceDB (primary) or Lambda (fallback)
 */
export async function searchSupplements(query: string, limit: number = 5): Promise<SearchResult[]> {
  // Try LanceDB first (if enabled)
  if (USE_LANCEDB) {
    try {
      console.log(`[SearchService] 🚀 Using LanceDB (PRISTINE QUALITY) for: "${query}"`);
      const lanceResults = await searchLanceDB(query, limit);

      if (lanceResults && lanceResults.length > 0) {
        console.log(`[SearchService] ✅ LanceDB returned ${lanceResults.length} results`);
        return lanceResults.map(mapLanceDBResult);
      }

      console.warn('[SearchService] ⚠️  LanceDB returned no results, falling back to Lambda');
    } catch (error) {
      console.error('[SearchService] ❌ LanceDB error, falling back to Lambda:', error);
      // Fall through to Lambda
    }
  }

  // Fallback to Lambda Function URL
  return searchViaLambda(query, limit);
}

/**
 * Map LanceDB result to SearchResult format
 */
function mapLanceDBResult(result: LanceDBResult): SearchResult {
  const { name, metadata, common_names, similarity } = result;

  // Generate description based on evidence grade and study count
  const gradeDescriptions: Record<string, string> = {
    'A': 'Alta calidad de evidencia basada en múltiples ensayos clínicos aleatorizados y meta-análisis',
    'B': 'Buena calidad de evidencia con algunos ensayos clínicos controlados',
    'C': 'Evidencia preliminar basada en estudios observacionales'
  };

  const description = metadata.evidence_grade
    ? gradeDescriptions[metadata.evidence_grade] || 'Suplemento analizado con evidencia científica'
    : `Suplemento analizado basado en ${metadata.study_count || 0} estudios científicos`;

  return {
    name: name,
    title: name,
    abstract: description,
    description: description,
    ingredients: common_names || [],
    conditions: [], // Not in LanceDB metadata
    score: similarity,
    study_count: metadata.study_count || 0,
    evidence_grade: metadata.evidence_grade || 'C'
  };
}

/**
 * Search via Lambda Function URL (fallback)
 */
async function searchViaLambda(query: string, limit: number): Promise<SearchResult[]> {
  const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&top_k=${limit}`;

  console.log(`[SearchService] 📡 Fetching from Lambda Function URL: "${query}"`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Search API error (${response.status}): ${errorText}`);
  }

  const body = await response.json();

  // The LanceDB lambda returns { success: true, supplement: {...}, alternativeMatches: [...] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hits: any[] = [];

  if (body.supplement) {
    hits = [body.supplement];
    // Include alternativeMatches if available (for variant detection)
    if (Array.isArray(body.alternativeMatches)) {
      hits = hits.concat(body.alternativeMatches);
    }
  } else if (Array.isArray(body.matches)) {
    hits = body.matches;
  } else if (Array.isArray(body.results)) {
    hits = body.results;
  } else if (Array.isArray(body)) {
    hits = body;
  }

  if (!Array.isArray(hits) || hits.length === 0) {
    console.warn("[SearchService] Unexpected or empty response format:", body);
    return [];
  }

  // Map to unified format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hits.map((hit: any) => ({
    title: hit.name || hit.title,
    abstract: hit.metadata?.description || `Supplement found with ${hit.metadata?.study_count || 0} studies.`,
    ingredients: hit.commonNames || hit.common_names || hit.ingredients || [],
    score: hit.similarity ?? (hit.score || (hit._distance ? (1 - hit._distance) : 0)),
    study_count: hit.metadata?.study_count || 0,
    evidence_grade: hit.metadata?.evidence_grade || 'C'
  }));
}
