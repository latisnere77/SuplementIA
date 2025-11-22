/**
 * Query Normalization Module
 * Normalizes supplement names and generates search variations
 *
 * Purpose:
 * - Convert user queries to canonical supplement names
 * - Generate search variations for better PubMed results
 * - Categorize supplements by type
 *
 * Design:
 * - Zero external dependencies
 * - Standalone module (can be imported anywhere)
 * - Fast performance (< 1ms per query)
 */

export type SupplementCategory =
  | 'amino_acid'
  | 'vitamin'
  | 'mineral'
  | 'herb'
  | 'fatty_acid'
  | 'protein'
  | 'general';

export interface NormalizedQuery {
  /** Original user query */
  original: string;
  /** Normalized canonical name */
  normalized: string;
  /** Search variations for PubMed/databases */
  variations: string[];
  /** Supplement category */
  category: SupplementCategory;
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Normalization Map
 * Maps user inputs → canonical supplement names
 */
const NORMALIZATION_MAP: Record<string, { canonical: string; category: SupplementCategory }> = {
  // ========== CARNITINA / L-CARNITINE ==========
  'carnitina': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'carnitine': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'l-carnitina': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'l-carnitine': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'l carnitina': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'l carnitine': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'levocarnitina': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'levocarnitine': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'levo carnitina': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'carnita': { canonical: 'L-Carnitine', category: 'amino_acid' }, // common typo
  'karnitina': { canonical: 'L-Carnitine', category: 'amino_acid' }, // k/c confusion
  'carnitin': { canonical: 'L-Carnitine', category: 'amino_acid' },
  'carnit': { canonical: 'L-Carnitine', category: 'amino_acid' },

  // Acetyl-L-Carnitine
  'acetil carnitina': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'acetil-l-carnitina': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'acetil l carnitina': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'acetyl carnitine': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'acetyl-l-carnitine': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'acetyl l carnitine': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },
  'alcar': { canonical: 'Acetyl-L-Carnitine', category: 'amino_acid' },

  // Propionyl-L-Carnitine
  'propionil carnitina': { canonical: 'Propionyl-L-Carnitine', category: 'amino_acid' },
  'propionyl carnitine': { canonical: 'Propionyl-L-Carnitine', category: 'amino_acid' },
  'propionyl-l-carnitine': { canonical: 'Propionyl-L-Carnitine', category: 'amino_acid' },
  'plc': { canonical: 'Propionyl-L-Carnitine', category: 'amino_acid' },

  // L-Carnitine Tartrate
  'carnitina tartrato': { canonical: 'L-Carnitine Tartrate', category: 'amino_acid' },
  'carnitine tartrate': { canonical: 'L-Carnitine Tartrate', category: 'amino_acid' },
  'l-carnitine tartrate': { canonical: 'L-Carnitine Tartrate', category: 'amino_acid' },

  // ========== MAGNESIUM ==========
  'magnesio': { canonical: 'Magnesium', category: 'mineral' },
  'magnesium': { canonical: 'Magnesium', category: 'mineral' },
  'mg': { canonical: 'Magnesium', category: 'mineral' },
  'magnesio citrato': { canonical: 'Magnesium Citrate', category: 'mineral' },
  'magnesium citrate': { canonical: 'Magnesium Citrate', category: 'mineral' },
  'magnesio glicinato': { canonical: 'Magnesium Glycinate', category: 'mineral' },
  'magnesium glycinate': { canonical: 'Magnesium Glycinate', category: 'mineral' },

  // ========== OMEGA-3 ==========
  'omega 3': { canonical: 'Omega-3', category: 'fatty_acid' },
  'omega-3': { canonical: 'Omega-3', category: 'fatty_acid' },
  'omega3': { canonical: 'Omega-3', category: 'fatty_acid' },
  'fish oil': { canonical: 'Omega-3', category: 'fatty_acid' },
  'aceite de pescado': { canonical: 'Omega-3', category: 'fatty_acid' },
  'dha': { canonical: 'Omega-3 DHA', category: 'fatty_acid' },
  'epa': { canonical: 'Omega-3 EPA', category: 'fatty_acid' },

  // ========== VITAMINS ==========
  'vitamina d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vitamin d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vitamina d3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'vitamin d3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'd3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'vit d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vit d3': { canonical: 'Vitamin D3', category: 'vitamin' },

  'vitamina c': { canonical: 'Vitamin C', category: 'vitamin' },
  'vitamin c': { canonical: 'Vitamin C', category: 'vitamin' },
  'vit c': { canonical: 'Vitamin C', category: 'vitamin' },
  'acido ascorbico': { canonical: 'Vitamin C', category: 'vitamin' },
  'ascorbic acid': { canonical: 'Vitamin C', category: 'vitamin' },

  'vitamina b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'vitamin b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'cianocobalamina': { canonical: 'Vitamin B12', category: 'vitamin' },
  'cyanocobalamin': { canonical: 'Vitamin B12', category: 'vitamin' },

  // ========== AMINO ACIDS ==========
  'creatina': { canonical: 'Creatine', category: 'amino_acid' },
  'creatine': { canonical: 'Creatine', category: 'amino_acid' },
  'creatine monohydrate': { canonical: 'Creatine Monohydrate', category: 'amino_acid' },

  'proteina': { canonical: 'Protein', category: 'protein' },
  'protein': { canonical: 'Protein', category: 'protein' },
  'whey protein': { canonical: 'Whey Protein', category: 'protein' },
  'proteina de suero': { canonical: 'Whey Protein', category: 'protein' },

  // ========== HERBS ==========
  'ashwagandha': { canonical: 'Ashwagandha', category: 'herb' },
  'ashwaganda': { canonical: 'Ashwagandha', category: 'herb' },
  'withania': { canonical: 'Ashwagandha', category: 'herb' },

  'ginseng': { canonical: 'Ginseng', category: 'herb' },
  'ginseng coreano': { canonical: 'Ginseng', category: 'herb' },
  'panax ginseng': { canonical: 'Ginseng', category: 'herb' },
  'ginseng rojo': { canonical: 'Ginseng', category: 'herb' },
  'korean ginseng': { canonical: 'Ginseng', category: 'herb' },

  'curcuma': { canonical: 'Turmeric', category: 'herb' },
  'cúrcuma': { canonical: 'Turmeric', category: 'herb' },
  'curcumin': { canonical: 'Turmeric', category: 'herb' },
  'turmeric': { canonical: 'Turmeric', category: 'herb' },

  // ========== MINERALS ==========
  'zinc': { canonical: 'Zinc', category: 'mineral' },
  'zinco': { canonical: 'Zinc', category: 'mineral' },
  'calcio': { canonical: 'Calcium', category: 'mineral' },
  'calcium': { canonical: 'Calcium', category: 'mineral' },
  'hierro': { canonical: 'Iron', category: 'mineral' },
  'iron': { canonical: 'Iron', category: 'mineral' },
};

/**
 * Variation Generators
 * Generate search variations for PubMed queries
 */
const VARIATION_GENERATORS: Record<string, (canonical: string) => string[]> = {
  'L-Carnitine': () => [
    'L-Carnitine',
    'Levocarnitine',
    'Acetyl-L-Carnitine',
    'ALCAR',
    'L Carnitine supplementation',
    '(L-Carnitine OR Levocarnitine OR Acetyl-L-Carnitine)',
  ],
  'Acetyl-L-Carnitine': () => [
    'Acetyl-L-Carnitine',
    'ALCAR',
    'Acetylcarnitine',
    'N-Acetyl-L-Carnitine',
    '(Acetyl-L-Carnitine OR ALCAR)',
  ],
  'Magnesium': () => [
    'Magnesium',
    'Magnesium supplementation',
    'Magnesium Glycinate',
    'Magnesium Citrate',
    '(Magnesium OR Magnesium supplementation)',
  ],
  'Omega-3': () => [
    'Omega-3',
    'Fish Oil',
    'EPA DHA',
    'Omega-3 Fatty Acids',
    'n-3 PUFA',
    '(Omega-3 OR Fish Oil OR EPA OR DHA)',
  ],
  'Vitamin D': () => [
    'Vitamin D',
    'Cholecalciferol',
    'Vitamin D3',
    'Vitamin D supplementation',
    '(Vitamin D OR Cholecalciferol OR Vitamin D3)',
  ],
  'Creatine': () => [
    'Creatine',
    'Creatine Monohydrate',
    'Creatine supplementation',
    '(Creatine OR Creatine Monohydrate)',
  ],
};

/**
 * Normalize a user query
 */
export function normalizeQuery(query: string): NormalizedQuery {
  const lowercased = query.toLowerCase().trim();

  // Exact match in normalization map
  const exactMatch = NORMALIZATION_MAP[lowercased];
  if (exactMatch) {
    return {
      original: query,
      normalized: exactMatch.canonical,
      variations: generateVariations(exactMatch.canonical),
      category: exactMatch.category,
      confidence: 1.0,
    };
  }

  // Fuzzy match (simple Levenshtein-based)
  const fuzzyMatch = findFuzzyMatch(lowercased);
  if (fuzzyMatch) {
    const match = NORMALIZATION_MAP[fuzzyMatch.key];
    return {
      original: query,
      normalized: match.canonical,
      variations: generateVariations(match.canonical),
      category: match.category,
      confidence: fuzzyMatch.confidence,
    };
  }

  // No match - return original query
  return {
    original: query,
    normalized: query,
    variations: [query, `${query} supplementation`],
    category: 'general',
    confidence: 0.0,
  };
}

/**
 * Generate search variations for a canonical name
 */
function generateVariations(canonical: string): string[] {
  // Use custom generator if available
  if (VARIATION_GENERATORS[canonical]) {
    return VARIATION_GENERATORS[canonical](canonical);
  }

  // Default variations
  return [
    canonical,
    `${canonical} supplementation`,
    `${canonical} supplement`,
  ];
}

/**
 * Fuzzy matching using Levenshtein distance
 */
function findFuzzyMatch(
  query: string
): { key: string; confidence: number } | null {
  const threshold = 2; // Max edit distance
  let bestMatch: { key: string; distance: number } | null = null;

  for (const key of Object.keys(NORMALIZATION_MAP)) {
    const distance = levenshteinDistance(query, key);
    if (distance <= threshold && distance > 0) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { key, distance };
      }
    }
  }

  if (bestMatch) {
    // Confidence: 1.0 for distance=1, 0.8 for distance=2
    const confidence = 1 - (bestMatch.distance / (threshold + 1));
    return { key: bestMatch.key, confidence };
  }

  return null;
}

/**
 * Levenshtein distance (simple implementation)
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
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Batch normalize multiple queries (for optimization)
 */
export function normalizeQueries(queries: string[]): NormalizedQuery[] {
  return queries.map(q => normalizeQuery(q));
}

/**
 * Check if a query has a known normalization
 */
export function hasNormalization(query: string): boolean {
  const lowercased = query.toLowerCase().trim();
  return lowercased in NORMALIZATION_MAP;
}

/**
 * Get all supported supplement names (for autocomplete)
 */
export function getAllSupportedSupplements(): string[] {
  const uniqueCanonicals = new Set<string>();
  Object.values(NORMALIZATION_MAP).forEach(v => uniqueCanonicals.add(v.canonical));
  return Array.from(uniqueCanonicals).sort();
}
