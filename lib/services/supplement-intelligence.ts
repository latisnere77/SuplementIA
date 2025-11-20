/**
 * Supplement Intelligence System
 * Advanced detection, translation, disambiguation, and fuzzy matching
 */

// ====================================
// TYPES
// ====================================

export interface SupplementCandidate {
  term: string;
  type: 'translation' | 'synonym' | 'scientific_name' | 'compound' | 'fuzzy_match';
  confidence: number;
  source: string;
}

export interface IntelligentSearchResult {
  originalQuery: string;
  candidates: SupplementCandidate[];
  bestCandidate: SupplementCandidate;
  strategy: string;
}

// ====================================
// MULTI-SYNONYM DICTIONARY
// ====================================

/**
 * Expandido: No solo traducciones, sino MÚLTIPLES sinónimos
 * Cada suplemento puede tener múltiples nombres científicos, comunes, compuestos
 */
const SUPPLEMENT_SYNONYMS: Record<string, string[]> = {
  // Cardo Santo - MÚLTIPLES CANDIDATOS
  'cardo santo': [
    'milk thistle',           // Más común (Silybum marianum)
    'silymarin',              // Compuesto activo
    'blessed thistle',        // Alternativo (Cnicus benedictus)
    'Silybum marianum',       // Nombre científico
  ],
  'cardo mariano': [
    'milk thistle',
    'silymarin',
    'Silybum marianum',
  ],

  // Cúrcuma - Múltiples formas
  'curcuma': [
    'turmeric',
    'curcumin',               // Compuesto activo
    'Curcuma longa',          // Nombre científico
  ],
  'cúrcuma': [
    'turmeric',
    'curcumin',
    'Curcuma longa',
  ],

  // Vitamina C - Múltiples formas
  'vitamina c': [
    'vitamin c',
    'ascorbic acid',          // Nombre químico
    'ascorbate',
  ],
  'acido ascorbico': [
    'ascorbic acid',
    'vitamin c',
  ],
  'ácido ascórbico': [
    'ascorbic acid',
    'vitamin c',
  ],

  // Colágeno - Tipos específicos
  'colageno': [
    'collagen peptides',
    'hydrolyzed collagen',
    'type II collagen',
    'collagen',
  ],
  'colágeno': [
    'collagen peptides',
    'hydrolyzed collagen',
    'type II collagen',
  ],
  'colageno tipo 2': [
    'type II collagen',
    'collagen type 2',
  ],
  'colageno hidrolizado': [
    'hydrolyzed collagen',
    'collagen peptides',
  ],

  // Omega-3 - Formas específicas
  'omega 3': [
    'omega-3 fatty acids',
    'EPA DHA',
    'fish oil',
    'eicosapentaenoic acid',
  ],
  'omega-3': [
    'omega-3 fatty acids',
    'EPA DHA',
    'fish oil',
  ],

  // Melatonina
  'melatonina': [
    'melatonin',
    'N-acetyl-5-methoxytryptamine', // Nombre químico
  ],

  // Ashwagandha
  'ashwagandha': [
    'Withania somnifera',     // Nombre científico
    'Indian ginseng',
    'winter cherry',
  ],

  // Ginseng
  'ginseng': [
    'Panax ginseng',
    'Korean ginseng',
    'Asian ginseng',
  ],
  'ginseng coreano': [
    'Korean ginseng',
    'Panax ginseng',
  ],
};

// ====================================
// FUZZY MATCHING
// ====================================

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find best fuzzy match from dictionary
 */
function findFuzzyMatch(query: string, threshold: number = 3): string | null {
  const normalized = query.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestDistance = threshold + 1;

  // Check all keys in dictionary
  for (const key of Object.keys(SUPPLEMENT_SYNONYMS)) {
    const distance = levenshteinDistance(normalized, key);
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = key;
    }
  }

  return bestMatch;
}

// ====================================
// TEXT NORMALIZATION
// ====================================

/**
 * Normalize query: remove accents, extra spaces, etc.
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Common misspellings and autocorrections
 */
const AUTOCORRECT: Record<string, string> = {
  'colaeno': 'colageno',
  'colagenno': 'colageno',
  'vitaina': 'vitamina',
  'vitamna': 'vitamina',
  'creatna': 'creatina',
  'creatia': 'creatina',
  'protena': 'proteina',
  'protina': 'proteina',
  'melatonia': 'melatonina',
  'melatonina': 'melatonina',
};

/**
 * Apply autocorrection
 */
function autocorrect(query: string): string {
  const normalized = normalizeQuery(query);
  return AUTOCORRECT[normalized] || query;
}

// ====================================
// MULTI-CANDIDATE SEARCH STRATEGY
// ====================================

/**
 * Get all possible search candidates for a query
 */
export function getSearchCandidates(query: string): SupplementCandidate[] {
  const candidates: SupplementCandidate[] = [];
  const normalized = normalizeQuery(query);
  const corrected = autocorrect(query);

  console.log(`[INTELLIGENCE] Analyzing query: "${query}"`);
  console.log(`[INTELLIGENCE] Normalized: "${normalized}"`);
  if (corrected !== query) {
    console.log(`[INTELLIGENCE] Autocorrected: "${corrected}"`);
  }

  // 1. Try direct lookup in synonyms
  const synonyms = SUPPLEMENT_SYNONYMS[normalized] || SUPPLEMENT_SYNONYMS[corrected];
  if (synonyms && synonyms.length > 0) {
    console.log(`[INTELLIGENCE] Found ${synonyms.length} synonyms`);
    synonyms.forEach((synonym, index) => {
      candidates.push({
        term: synonym,
        type: index === 0 ? 'translation' : 'synonym',
        confidence: 1.0 - (index * 0.1), // First synonym has highest confidence
        source: 'dictionary',
      });
    });
  }

  // 2. Try fuzzy matching
  if (candidates.length === 0) {
    const fuzzyMatch = findFuzzyMatch(normalized);
    if (fuzzyMatch) {
      console.log(`[INTELLIGENCE] Fuzzy match found: "${fuzzyMatch}"`);
      const fuzzySynonyms = SUPPLEMENT_SYNONYMS[fuzzyMatch];
      if (fuzzySynonyms) {
        fuzzySynonyms.forEach((synonym, index) => {
          candidates.push({
            term: synonym,
            type: 'fuzzy_match',
            confidence: 0.8 - (index * 0.1),
            source: `fuzzy_match:${fuzzyMatch}`,
          });
        });
      }
    }
  }

  // 3. If still no candidates, use original query
  if (candidates.length === 0) {
    console.log(`[INTELLIGENCE] No matches found, using original query`);
    candidates.push({
      term: query,
      type: 'translation',
      confidence: 0.5,
      source: 'original',
    });
  }

  return candidates;
}

/**
 * Intelligent search strategy:
 * 1. Get all candidates
 * 2. Return top N candidates for parallel search
 */
export function getIntelligentSearchStrategy(
  query: string,
  maxCandidates: number = 3
): IntelligentSearchResult {
  const candidates = getSearchCandidates(query);
  const topCandidates = candidates.slice(0, maxCandidates);

  console.log(`[INTELLIGENCE] Strategy: Search top ${topCandidates.length} candidates`);
  topCandidates.forEach((c, i) => {
    console.log(`  ${i + 1}. "${c.term}" (${c.type}, confidence: ${c.confidence})`);
  });

  return {
    originalQuery: query,
    candidates: topCandidates,
    bestCandidate: topCandidates[0],
    strategy: 'multi-candidate-parallel',
  };
}

// ====================================
// COMPOUND DETECTION
// ====================================

/**
 * Detect if query contains multiple supplements
 */
export function detectCompounds(query: string): string[] {
  const separators = [' y ', ' and ', ',', ' + ', ' con '];

  for (const sep of separators) {
    if (query.toLowerCase().includes(sep)) {
      return query.split(new RegExp(sep, 'i')).map(s => s.trim());
    }
  }

  return [query];
}

// ====================================
// EXPORTS
// ====================================

export {
  normalizeQuery,
  autocorrect,
  findFuzzyMatch,
  levenshteinDistance,
};
