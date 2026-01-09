/**
 * Search Service - Uses Lambda Function URL for vector search
 * Account: 643942183354 (SuplementAI)
 */

// Lambda Function URL for search (AuthType: NONE - no credentials needed)
const SEARCH_API_URL = process.env.SEARCH_API_URL ||
  'https://ogmnjgz664uws4h4t522agsmj40gbpyr.lambda-url.us-east-1.on.aws/';

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

export async function searchSupplements(query: string, limit: number = 5): Promise<SearchResult[]> {
  const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&top_k=${limit}`;

  console.log(`[SearchService] Fetching from Lambda Function URL: "${query}"`);

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
  return hits.map((hit: any) => ({
    title: hit.name || hit.title,
    abstract: hit.metadata?.description || `Supplement found with ${hit.metadata?.study_count || 0} studies.`,
    ingredients: hit.commonNames || hit.common_names || hit.ingredients || [],
    score: hit.similarity ?? (hit.score || (hit._distance ? (1 - hit._distance) : 0)),
    study_count: hit.metadata?.study_count || 0,
    evidence_grade: hit.metadata?.evidence_grade || 'C'
  }));
}
