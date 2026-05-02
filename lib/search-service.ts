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

const LOCAL_SUPPLEMENT_DESCRIPTIONS: Record<string, string> = {
  ashwagandha: 'Ashwagandha (Withania somnifera) is an adaptogenic botanical used in supplements standardized for withanolides and evaluated mainly for stress, sleep quality, and perceived well-being.',
  'vitamin b complex': 'Vitamin B Complex combines several B vitamins that act as cofactors in energy metabolism, nervous system function, red blood cell formation, and methylation pathways.',
  'vitamina b complex': 'Vitamin B Complex combines several B vitamins that act as cofactors in energy metabolism, nervous system function, red blood cell formation, and methylation pathways.',
  'vitamina d': 'Vitamin D is a fat-soluble vitamin and prohormone involved in calcium balance, bone mineralization, immune signaling, and muscle function.',
  'vitamin d': 'Vitamin D is a fat-soluble vitamin and prohormone involved in calcium balance, bone mineralization, immune signaling, and muscle function.',
  'omega 3': 'Omega-3 supplements provide long-chain fatty acids such as EPA and DHA, which are structural components of cell membranes and are studied for cardiovascular, inflammatory, and metabolic outcomes.',
  magnesium: 'Magnesium is an essential mineral involved in nerve signaling, muscle contraction, energy production, protein synthesis, and electrolyte balance.',
  magnesio: 'Magnesium is an essential mineral involved in nerve signaling, muscle contraction, energy production, protein synthesis, and electrolyte balance.',
  creatine: 'Creatine is a nitrogen-containing compound stored mainly in muscle as phosphocreatine, where it helps regenerate ATP during short bursts of high-intensity activity.',
  zinc: 'Zinc is an essential trace mineral required for immune function, DNA synthesis, wound healing, taste perception, and normal reproductive physiology.',
  collagen: 'Collagen supplements provide collagen peptides or gelatin-derived amino acids that supply building blocks for connective tissues such as skin, tendons, ligaments, and cartilage.',
  colageno: 'Collagen supplements provide collagen peptides or gelatin-derived amino acids that supply building blocks for connective tissues such as skin, tendons, ligaments, and cartilage.',
  'aloe vera': 'Aloe vera (Aloe barbadensis) is a succulent plant used in supplements and topical products; oral preparations are usually positioned for digestive comfort while topical gels are used for skin support.',
  turmeric: 'Turmeric (Curcuma longa) is a botanical source of curcuminoids, especially curcumin, which are studied for inflammatory signaling, joint comfort, and antioxidant pathways.',
  curcuma: 'Turmeric (Curcuma longa) is a botanical source of curcuminoids, especially curcumin, which are studied for inflammatory signaling, joint comfort, and antioxidant pathways.',
  'coenzyme q10': 'Coenzyme Q10 is a vitamin-like quinone involved in mitochondrial electron transport and cellular energy production, with concentrated use in cardiovascular and statin-associated contexts.',
  'coenzima q10': 'Coenzyme Q10 is a vitamin-like quinone involved in mitochondrial electron transport and cellular energy production, with concentrated use in cardiovascular and statin-associated contexts.',
  'lions mane': 'Lion\'s Mane (Hericium erinaceus) is a medicinal mushroom studied for compounds such as hericenones and erinacines that may influence nerve growth factor signaling and cognition.',
  'melena de leon': 'Lion\'s Mane (Hericium erinaceus) is a medicinal mushroom studied for compounds such as hericenones and erinacines that may influence nerve growth factor signaling and cognition.',
  'milk thistle': 'Milk thistle (Silybum marianum) is a botanical source of silymarin flavonolignans, commonly evaluated for liver enzyme markers and hepatic oxidative stress.',
  'cardo mariano': 'Milk thistle (Silybum marianum) is a botanical source of silymarin flavonolignans, commonly evaluated for liver enzyme markers and hepatic oxidative stress.',
  valerian: 'Valerian (Valeriana officinalis) is a botanical root preparation traditionally used for sleep quality and relaxation, with research focused on GABA-related calming pathways.',
  valeriana: 'Valerian (Valeriana officinalis) is a botanical root preparation traditionally used for sleep quality and relaxation, with research focused on GABA-related calming pathways.',
  ginseng: 'Ginseng refers to Panax species such as Panax ginseng, which contain ginsenosides studied for fatigue, cognition, physical performance, and stress resilience.',
  'ginkgo biloba': 'Ginkgo biloba is a standardized leaf extract rich in flavone glycosides and terpene lactones, studied mainly for circulation, cognition, and age-related cognitive symptoms.',
  resveratrol: 'Resveratrol is a plant polyphenol found in grapes and other botanicals, studied for cardiometabolic signaling, oxidative stress, and healthy aging pathways.',
};

function getLocalSupplementDescription(entry: SupplementEntry): string {
  const descriptionKeys = [
    entry.name,
    entry.id.replace(/-(en|es)$/, ''),
    ...entry.aliases,
  ].map(normalizeSearchText);

  for (const key of descriptionKeys) {
    const description = LOCAL_SUPPLEMENT_DESCRIPTIONS[key];
    if (description) return description;
  }

  return `${entry.name} is a dietary supplement ingredient indexed for evidence review in SuplementAI.`;
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
      const description = getLocalSupplementDescription(entry);

      return {
        title: entry.name,
        name: entry.name,
        abstract: description,
        description,
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
