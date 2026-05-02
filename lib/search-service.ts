/**
 * Search Service - Uses configured search backends with local catalog fallback
 *
 * Backends are opt-in/configured. When LanceDB or Lambda is not configured,
 * the service uses the deterministic local supplement catalog.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type { LanceDBResult } from './lancedb-service';
import { SUPPLEMENTS_DATABASE, type SupplementEntry } from './portal/supplements-database';

type SearchBackend = 'auto' | 'local' | 'lancedb' | 'lambda';

const SEARCH_API_URL = process.env.SEARCH_API_URL?.trim() || '';
const SEARCH_BACKEND = normalizeSearchBackend(process.env.SEARCH_BACKEND);
const LANCEDB_PATH = process.env.LANCEDB_PATH || '/tmp/lancedb-pristine';
const DEBUG_SEARCH = process.env.DEBUG_SEARCH === 'true';
const USE_LANCEDB = SEARCH_BACKEND !== 'local' && process.env.USE_LANCEDB !== 'false';
const USE_LAMBDA = SEARCH_BACKEND !== 'local' && Boolean(SEARCH_API_URL);

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
  source?: 'lancedb' | 'lambda' | 'local_catalog';
}

function normalizeSearchBackend(value: string | undefined): SearchBackend {
  if (value === 'local' || value === 'lancedb' || value === 'lambda') {
    return value;
  }
  return 'auto';
}

function debugSearch(message: string, details?: unknown): void {
  if (!DEBUG_SEARCH) return;
  if (details === undefined) {
    console.info(message);
    return;
  }
  console.info(message, details);
}

function hasLanceDBTable(): boolean {
  try {
    return existsSync(join(LANCEDB_PATH, 'supplements.lance', '_versions'));
  } catch {
    return false;
  }
}

function shouldUseLanceDB(): boolean {
  if (!USE_LANCEDB) return false;
  if (SEARCH_BACKEND === 'lambda') return false;
  if (SEARCH_BACKEND === 'lancedb') return true;
  return hasLanceDBTable();
}

function shouldUseLambda(): boolean {
  if (!USE_LAMBDA) return false;
  if (SEARCH_BACKEND === 'lancedb') return false;
  return true;
}

/**
 * Search supplements using LanceDB (primary) or Lambda (fallback)
 */
export async function searchSupplements(query: string, limit: number = 5): Promise<SearchResult[]> {
  let lanceError: unknown = null;
  let lambdaError: unknown = null;

  if (SEARCH_BACKEND === 'local') {
    return searchLocalCatalog(query, limit);
  }

  if (shouldUseLanceDB()) {
    try {
      debugSearch(`[SearchService] Using LanceDB for: "${query}"`);
      const { searchLanceDB } = await import('./lancedb-service');
      const lanceResults = await searchLanceDB(query, limit);

      if (lanceResults && lanceResults.length > 0) {
        debugSearch(`[SearchService] LanceDB returned ${lanceResults.length} results`);
        return lanceResults.map(mapLanceDBResult);
      }

      debugSearch('[SearchService] LanceDB returned no results, falling back');
    } catch (error) {
      lanceError = error;
      debugSearch('[SearchService] LanceDB error, falling back', error);
    }
  }

  if (shouldUseLambda()) {
    try {
      const lambdaResults = await searchViaLambda(query, limit);
      if (lambdaResults.length > 0) {
        return lambdaResults;
      }

      debugSearch('[SearchService] Lambda returned no results, falling back to local catalog');
    } catch (error) {
      lambdaError = error;
      debugSearch('[SearchService] Lambda error, falling back to local catalog', error);
    }
  }

  const localResults = searchLocalCatalog(query, limit);
  if (localResults.length > 0) {
    debugSearch(`[SearchService] Local catalog returned ${localResults.length} results for "${query}"`, {
      lanceError: lanceError instanceof Error ? lanceError.message : undefined,
      lambdaError: lambdaError instanceof Error ? lambdaError.message : undefined,
    });
    return localResults;
  }

  if (lambdaError instanceof Error) {
    throw lambdaError;
  }
  if (lanceError instanceof Error) {
    throw lanceError;
  }

  return [];
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
    evidence_grade: metadata.evidence_grade || 'C',
    source: 'lancedb',
  };
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function entrySearchText(entry: SupplementEntry): string {
  return normalizeSearchText([
    entry.name,
    entry.id,
    entry.category,
    ...entry.aliases,
    ...(entry.healthConditions || []),
  ].join(' '));
}

function scoreLocalEntry(query: string, entry: SupplementEntry): number {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(entry.name);
  const normalizedAliases = entry.aliases.map(normalizeSearchText);
  const haystack = entrySearchText(entry);

  if (!normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 1;
  if (normalizedAliases.some(alias => alias === normalizedQuery)) return 0.96;
  if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) return 0.9;
  if (normalizedAliases.some(alias => alias.includes(normalizedQuery) || normalizedQuery.includes(alias))) return 0.86;

  const tokens = normalizedQuery.split(/\s+/).filter(token => token.length > 1);
  if (tokens.length === 0) return 0;

  const matches = tokens.filter(token => haystack.includes(token)).length;
  if (matches === 0) return 0;

  return 0.55 + (matches / tokens.length) * 0.25;
}

export function searchLocalCatalog(query: string, limit: number = 5): SearchResult[] {
  const seenNames = new Set<string>();

  return SUPPLEMENTS_DATABASE
    .map(entry => ({ entry, score: scoreLocalEntry(query, entry) }))
    .filter(({ entry, score }) => score > 0 && entry.category !== 'condition')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.entry.language !== b.entry.language) {
        return a.entry.language === 'en' ? -1 : 1;
      }
      return a.entry.name.localeCompare(b.entry.name);
    })
    .filter(({ entry }) => {
      const key = normalizeSearchText(entry.name);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ entry, score }) => {
      const conditions = entry.healthConditions || [];
      const studyCount = Math.max(conditions.length * 25, 25);

      return {
        title: entry.name,
        name: entry.name,
        abstract: conditions.length > 0
          ? `${entry.name} está asociado en el catálogo local con: ${conditions.join(', ')}.`
          : `${entry.name} está registrado en el catálogo local de suplementos.`,
        description: `${entry.name} está registrado en el catálogo local de suplementos.`,
        ingredients: [entry.name, ...entry.aliases],
        conditions,
        score,
        study_count: studyCount,
        evidence_grade: 'C',
        source: 'local_catalog',
      };
    });
}

/**
 * Search via Lambda Function URL (fallback)
 */
async function searchViaLambda(query: string, limit: number): Promise<SearchResult[]> {
  const url = `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&top_k=${limit}`;

  debugSearch(`[SearchService] Fetching from Lambda Function URL: "${query}"`);

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
    debugSearch("[SearchService] Unexpected or empty response format:", body);
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
    evidence_grade: hit.metadata?.evidence_grade || 'C',
    source: 'lambda',
  }));
}
