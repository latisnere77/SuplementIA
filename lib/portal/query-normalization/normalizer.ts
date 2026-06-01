/**
 * Query Normalization Module (DEPRECATED)
 * 
 * @deprecated This module is deprecated and will be removed in v2.0.0.
 * Use intelligent search API instead: `/api/portal/search` or `useIntelligentSearch()` hook.
 * 
 * **Why deprecated:**
 * - Hardcoded list of ~70 supplements (not scalable)
 * - Requires manual updates for each new supplement
 * - Cannot handle typos or semantic variations
 * - No multilingual support beyond hardcoded translations
 * 
 * **Migration:**
 * ```typescript
 * // Old (deprecated)
 * import { normalizeQuery } from '@/lib/portal/query-normalization/normalizer';
 * const result = normalizeQuery('equinácea');
 * 
 * // New (recommended)
 * import { useIntelligentSearch } from '@/lib/portal/useIntelligentSearch';
 * const { search } = useIntelligentSearch();
 * const result = await search('equinácea');
 * ```
 * 
 * **Removal timeline:**
 * - Now: Marked as deprecated, warnings added
 * - 2 months: After 100% intelligent search rollout
 * - 3 months: Moved to _archived/
 * - 4 months: Deleted
 * 
 * @see /api/portal/search - Intelligent search API
 * @see useIntelligentSearch - React hook for intelligent search
 * @see backend/lambda/search-api - Vector search implementation
 */

import { getBotanicalPubMedQueryPhrases } from '@/lib/services/botanical-identity';

export type SupplementCategory =
  | 'amino_acid'
  | 'vitamin'
  | 'mineral'
  | 'herb'
  | 'fatty_acid'
  | 'protein'
  | 'other'
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
  'omega': { canonical: 'Omega-3', category: 'fatty_acid' },
  'fish oil': { canonical: 'Omega-3', category: 'fatty_acid' },
  'aceite de pescado': { canonical: 'Omega-3', category: 'fatty_acid' },
  'aceite pescado': { canonical: 'Omega-3', category: 'fatty_acid' },
  'dha': { canonical: 'Omega-3 DHA', category: 'fatty_acid' },
  'epa': { canonical: 'Omega-3 EPA', category: 'fatty_acid' },

  // ========== VITAMINS ==========
  
  // Vitamin A
  'vitamina a': { canonical: 'Vitamin A', category: 'vitamin' },
  'vitamin a': { canonical: 'Vitamin A', category: 'vitamin' },
  'vit a': { canonical: 'Vitamin A', category: 'vitamin' },
  'retinol': { canonical: 'Vitamin A', category: 'vitamin' },
  'beta caroteno': { canonical: 'Vitamin A', category: 'vitamin' },
  'beta carotene': { canonical: 'Vitamin A', category: 'vitamin' },

  // Vitamin B Complex (generic)
  'vitamina b': { canonical: 'Vitamin B Complex', category: 'vitamin' },
  'vitamin b': { canonical: 'Vitamin B Complex', category: 'vitamin' },
  'vit b': { canonical: 'Vitamin B Complex', category: 'vitamin' },
  'complejo b': { canonical: 'Vitamin B Complex', category: 'vitamin' },
  'b complex': { canonical: 'Vitamin B Complex', category: 'vitamin' },
  'vitamin b complex': { canonical: 'Vitamin B Complex', category: 'vitamin' },

  // Vitamin B1 (Thiamine)
  'vitamina b1': { canonical: 'Vitamin B1', category: 'vitamin' },
  'vitamin b1': { canonical: 'Vitamin B1', category: 'vitamin' },
  'b1': { canonical: 'Vitamin B1', category: 'vitamin' },
  'tiamina': { canonical: 'Vitamin B1', category: 'vitamin' },
  'thiamine': { canonical: 'Vitamin B1', category: 'vitamin' },

  // Vitamin B2 (Riboflavin)
  'vitamina b2': { canonical: 'Vitamin B2', category: 'vitamin' },
  'vitamin b2': { canonical: 'Vitamin B2', category: 'vitamin' },
  'b2': { canonical: 'Vitamin B2', category: 'vitamin' },
  'riboflavina': { canonical: 'Vitamin B2', category: 'vitamin' },
  'riboflavin': { canonical: 'Vitamin B2', category: 'vitamin' },

  // Vitamin B3 (Niacin)
  'vitamina b3': { canonical: 'Vitamin B3', category: 'vitamin' },
  'vitamin b3': { canonical: 'Vitamin B3', category: 'vitamin' },
  'b3': { canonical: 'Vitamin B3', category: 'vitamin' },
  'niacina': { canonical: 'Vitamin B3', category: 'vitamin' },
  'niacin': { canonical: 'Vitamin B3', category: 'vitamin' },
  'nicotinamida': { canonical: 'Vitamin B3', category: 'vitamin' },
  'nicotinamide': { canonical: 'Vitamin B3', category: 'vitamin' },

  // Vitamin B5 (Pantothenic Acid)
  'vitamina b5': { canonical: 'Vitamin B5', category: 'vitamin' },
  'vitamin b5': { canonical: 'Vitamin B5', category: 'vitamin' },
  'b5': { canonical: 'Vitamin B5', category: 'vitamin' },
  'acido pantotenico': { canonical: 'Vitamin B5', category: 'vitamin' },
  'pantothenic acid': { canonical: 'Vitamin B5', category: 'vitamin' },

  // Vitamin B6 (Pyridoxine)
  'vitamina b6': { canonical: 'Vitamin B6', category: 'vitamin' },
  'vitamin b6': { canonical: 'Vitamin B6', category: 'vitamin' },
  'b6': { canonical: 'Vitamin B6', category: 'vitamin' },
  'piridoxina': { canonical: 'Vitamin B6', category: 'vitamin' },
  'pyridoxine': { canonical: 'Vitamin B6', category: 'vitamin' },

  // Vitamin B7 (Biotin)
  'biotina': { canonical: 'Biotin', category: 'vitamin' },
  'biotin': { canonical: 'Biotin', category: 'vitamin' },
  'vitamina b7': { canonical: 'Biotin', category: 'vitamin' },
  'vitamin b7': { canonical: 'Biotin', category: 'vitamin' },
  'vitamina h': { canonical: 'Biotin', category: 'vitamin' },
  'vitamin h': { canonical: 'Biotin', category: 'vitamin' },

  // Vitamin B9 (Folate)
  'vitamina b9': { canonical: 'Vitamin B9', category: 'vitamin' },
  'vitamin b9': { canonical: 'Vitamin B9', category: 'vitamin' },
  'b9': { canonical: 'Vitamin B9', category: 'vitamin' },
  'acido folico': { canonical: 'Folic Acid', category: 'vitamin' },
  'folic acid': { canonical: 'Folic Acid', category: 'vitamin' },
  'folato': { canonical: 'Folate', category: 'vitamin' },
  'folate': { canonical: 'Folate', category: 'vitamin' },

  // Vitamin B12 (Cobalamin)
  'vitamina b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'vitamin b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'b12': { canonical: 'Vitamin B12', category: 'vitamin' },
  'cianocobalamina': { canonical: 'Vitamin B12', category: 'vitamin' },
  'cyanocobalamin': { canonical: 'Vitamin B12', category: 'vitamin' },
  'metilcobalamina': { canonical: 'Methylcobalamin', category: 'vitamin' },
  'methylcobalamin': { canonical: 'Methylcobalamin', category: 'vitamin' },

  // Vitamin C
  'vitamina c': { canonical: 'Vitamin C', category: 'vitamin' },
  'vitamin c': { canonical: 'Vitamin C', category: 'vitamin' },
  'vit c': { canonical: 'Vitamin C', category: 'vitamin' },
  'acido ascorbico': { canonical: 'Vitamin C', category: 'vitamin' },
  'ascorbic acid': { canonical: 'Vitamin C', category: 'vitamin' },

  // Vitamin D
  'vitamina d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vitamin d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vit d': { canonical: 'Vitamin D', category: 'vitamin' },
  'vitamina d2': { canonical: 'Vitamin D2', category: 'vitamin' },
  'vitamin d2': { canonical: 'Vitamin D2', category: 'vitamin' },
  'ergocalciferol': { canonical: 'Vitamin D2', category: 'vitamin' },
  'vitamina d3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'vitamin d3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'd3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'vit d3': { canonical: 'Vitamin D3', category: 'vitamin' },
  'colecalciferol': { canonical: 'Vitamin D3', category: 'vitamin' },
  'cholecalciferol': { canonical: 'Vitamin D3', category: 'vitamin' },

  // Vitamin E
  'vitamina e': { canonical: 'Vitamin E', category: 'vitamin' },
  'vitamin e': { canonical: 'Vitamin E', category: 'vitamin' },
  'vit e': { canonical: 'Vitamin E', category: 'vitamin' },
  'tocoferol': { canonical: 'Vitamin E', category: 'vitamin' },
  'tocopherol': { canonical: 'Vitamin E', category: 'vitamin' },
  'alfa tocoferol': { canonical: 'Vitamin E', category: 'vitamin' },
  'alpha tocopherol': { canonical: 'Vitamin E', category: 'vitamin' },

  // Vitamin K
  'vitamina k': { canonical: 'Vitamin K', category: 'vitamin' },
  'vitamin k': { canonical: 'Vitamin K', category: 'vitamin' },
  'vit k': { canonical: 'Vitamin K', category: 'vitamin' },
  'vitamina k1': { canonical: 'Vitamin K1', category: 'vitamin' },
  'vitamin k1': { canonical: 'Vitamin K1', category: 'vitamin' },
  'filoquinona': { canonical: 'Vitamin K1', category: 'vitamin' },
  'phylloquinone': { canonical: 'Vitamin K1', category: 'vitamin' },
  'vitamina k2': { canonical: 'Vitamin K2', category: 'vitamin' },
  'vitamin k2': { canonical: 'Vitamin K2', category: 'vitamin' },
  'menaquinona': { canonical: 'Vitamin K2', category: 'vitamin' },
  'menaquinone': { canonical: 'Vitamin K2', category: 'vitamin' },
  'mk-7': { canonical: 'Vitamin K2 MK-7', category: 'vitamin' },
  'mk7': { canonical: 'Vitamin K2 MK-7', category: 'vitamin' },

  // ========== AMINO ACIDS ==========
  'creatina': { canonical: 'Creatine', category: 'amino_acid' },
  'creatine': { canonical: 'Creatine', category: 'amino_acid' },
  'creatine monohydrate': { canonical: 'Creatine Monohydrate', category: 'amino_acid' },

  // N-Acetyl Cysteine (NAC)
  'nac': { canonical: 'N-Acetyl Cysteine', category: 'amino_acid' },
  'n-acetyl cysteine': { canonical: 'N-Acetyl Cysteine', category: 'amino_acid' },
  'n acetyl cysteine': { canonical: 'N-Acetyl Cysteine', category: 'amino_acid' },
  'acetylcysteine': { canonical: 'N-Acetyl Cysteine', category: 'amino_acid' },
  'acetilcisteina': { canonical: 'N-Acetyl Cysteine', category: 'amino_acid' },

  'fenilalanina': { canonical: 'L-Phenylalanine', category: 'amino_acid' },
  'phenylalanine': { canonical: 'L-Phenylalanine', category: 'amino_acid' },
  'l-fenilalanina': { canonical: 'L-Phenylalanine', category: 'amino_acid' },
  'l-phenylalanine': { canonical: 'L-Phenylalanine', category: 'amino_acid' },
  'l fenilalanina': { canonical: 'L-Phenylalanine', category: 'amino_acid' },
  'l phenylalanine': { canonical: 'L-Phenylalanine', category: 'amino_acid' },

  'proteina': { canonical: 'Protein', category: 'protein' },
  'protein': { canonical: 'Protein', category: 'protein' },
  'whey protein': { canonical: 'Whey Protein', category: 'protein' },
  'proteina de suero': { canonical: 'Whey Protein', category: 'protein' },

  // ========== HERBS ==========
  'ashwagandha': { canonical: 'Ashwagandha', category: 'herb' },
  'ashwaganda': { canonical: 'Ashwagandha', category: 'herb' },
  'withania': { canonical: 'Ashwagandha', category: 'herb' },
  'mimosa tenuiflora': { canonical: 'Mimosa tenuiflora', category: 'herb' },
  'mimosa hostilis': { canonical: 'Mimosa tenuiflora', category: 'herb' },
  'tepezcohuite': { canonical: 'Mimosa tenuiflora', category: 'herb' },
  'tepescohuite': { canonical: 'Mimosa tenuiflora', category: 'herb' },

  'ginseng': { canonical: 'Ginseng', category: 'herb' },
  'ginseng coreano': { canonical: 'Ginseng', category: 'herb' },
  'panax ginseng': { canonical: 'Ginseng', category: 'herb' },
  'ginseng rojo': { canonical: 'Ginseng', category: 'herb' },
  'korean ginseng': { canonical: 'Ginseng', category: 'herb' },

  'curcuma': { canonical: 'Turmeric', category: 'herb' },
  'cúrcuma': { canonical: 'Turmeric', category: 'herb' },
  'curcumin': { canonical: 'Turmeric', category: 'herb' },
  'turmeric': { canonical: 'Turmeric', category: 'herb' },

  'equinacea': { canonical: 'Echinacea', category: 'herb' },
  'equinácea': { canonical: 'Echinacea', category: 'herb' },
  'echinacea': { canonical: 'Echinacea', category: 'herb' },
  'equinacea purpurea': { canonical: 'Echinacea', category: 'herb' },
  'echinacea purpurea': { canonical: 'Echinacea', category: 'herb' },

  // ========== MINERALS ==========
  'zinc': { canonical: 'Zinc', category: 'mineral' },
  'zinco': { canonical: 'Zinc', category: 'mineral' },
  'calcio': { canonical: 'Calcium', category: 'mineral' },
  'calcium': { canonical: 'Calcium', category: 'mineral' },
  'hierro': { canonical: 'Iron', category: 'mineral' },
  'iron': { canonical: 'Iron', category: 'mineral' },

  // ========== PEPTIDES ==========
  'copper peptides': { canonical: 'Copper Peptides', category: 'mineral' },
  'peptidos de cobre': { canonical: 'Copper Peptides', category: 'mineral' },
  'gkh-cu': { canonical: 'Copper Peptides', category: 'mineral' },
  'ghk cu': { canonical: 'Copper Peptides', category: 'mineral' },
  'copper peptide': { canonical: 'Copper Peptides', category: 'mineral' },

  // ========== ALOE VERA ==========
  'sabila': { canonical: 'Aloe Vera', category: 'herb' },
  'sábila': { canonical: 'Aloe Vera', category: 'herb' },
  'aloe': { canonical: 'Aloe Vera', category: 'herb' },
  'aloe vera': { canonical: 'Aloe Vera', category: 'herb' },

  // ========== COENZYME Q10 ==========
  'q10': { canonical: 'Coenzyme Q10', category: 'other' },
  'coq10': { canonical: 'Coenzyme Q10', category: 'other' },
  'coenzyme q10': { canonical: 'Coenzyme Q10', category: 'other' },
  'coenzima q10': { canonical: 'Coenzyme Q10', category: 'other' },
  'ubiquinona': { canonical: 'Coenzyme Q10', category: 'other' },
  'ubiquinone': { canonical: 'Coenzyme Q10', category: 'other' },
  'ubidecarenona': { canonical: 'Coenzyme Q10', category: 'other' },
  'ubidecarenone': { canonical: 'Coenzyme Q10', category: 'other' },

  // ========== OTHER COMMON MISSING ==========
  'cbd': { canonical: 'CBD', category: 'other' },
  'cannabidiol': { canonical: 'CBD', category: 'other' },
  'resveratrol': { canonical: 'Resveratrol', category: 'other' },
  'berberina': { canonical: 'Berberine', category: 'herb' },
  'berberine': { canonical: 'Berberine', category: 'herb' },
  'nmn': { canonical: 'Nicotinamide Mononucleotide', category: 'other' },
  'nad': { canonical: 'NAD+', category: 'other' },
  'nad+': { canonical: 'NAD+', category: 'other' },
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
  'Vitamin A': () => [
    'Vitamin A',
    'Retinol',
    'Beta Carotene',
    'Vitamin A supplementation',
    '(Vitamin A OR Retinol OR Beta Carotene)',
  ],
  'Vitamin B Complex': () => [
    'Vitamin B Complex',
    'B Complex',
    'B Vitamins',
    'Vitamin B supplementation',
    '(Vitamin B Complex OR B Complex OR B Vitamins)',
  ],
  'Vitamin B1': () => [
    'Vitamin B1',
    'Thiamine',
    'Thiamin',
    'Vitamin B1 supplementation',
    '(Vitamin B1 OR Thiamine)',
  ],
  'Vitamin B2': () => [
    'Vitamin B2',
    'Riboflavin',
    'Vitamin B2 supplementation',
    '(Vitamin B2 OR Riboflavin)',
  ],
  'Vitamin B3': () => [
    'Vitamin B3',
    'Niacin',
    'Nicotinamide',
    'Niacinamide',
    'Vitamin B3 supplementation',
    '(Vitamin B3 OR Niacin OR Nicotinamide)',
  ],
  'Vitamin B5': () => [
    'Vitamin B5',
    'Pantothenic Acid',
    'Vitamin B5 supplementation',
    '(Vitamin B5 OR Pantothenic Acid)',
  ],
  'Vitamin B6': () => [
    'Vitamin B6',
    'Pyridoxine',
    'Vitamin B6 supplementation',
    '(Vitamin B6 OR Pyridoxine)',
  ],
  'Vitamin B9': () => [
    'Vitamin B9',
    'Folate',
    'Folic Acid',
    'Vitamin B9 supplementation',
    '(Vitamin B9 OR Folate OR Folic Acid)',
  ],
  'Vitamin B12': () => [
    'Vitamin B12',
    'Cobalamin',
    'Cyanocobalamin',
    'Methylcobalamin',
    'Vitamin B12 supplementation',
    '(Vitamin B12 OR Cobalamin OR Cyanocobalamin OR Methylcobalamin)',
  ],
  'Vitamin C': () => [
    'Vitamin C',
    'Ascorbic Acid',
    'Vitamin C supplementation',
    '(Vitamin C OR Ascorbic Acid)',
  ],
  'Vitamin D': () => [
    'Vitamin D',
    'Cholecalciferol',
    'Vitamin D3',
    'Vitamin D supplementation',
    '(Vitamin D OR Cholecalciferol OR Vitamin D3)',
  ],
  'Vitamin E': () => [
    'Vitamin E',
    'Tocopherol',
    'Alpha Tocopherol',
    'Vitamin E supplementation',
    '(Vitamin E OR Tocopherol OR Alpha Tocopherol)',
  ],
  'Vitamin K': () => [
    'Vitamin K',
    'Vitamin K1',
    'Vitamin K2',
    'Phylloquinone',
    'Menaquinone',
    'Vitamin K supplementation',
    '(Vitamin K OR Vitamin K1 OR Vitamin K2)',
  ],
  'Vitamin K2': () => [
    'Vitamin K2',
    'Menaquinone',
    'MK-7',
    'MK-4',
    'Vitamin K2 supplementation',
    '(Vitamin K2 OR Menaquinone OR MK-7)',
  ],
  'Creatine': () => [
    'Creatine',
    'Creatine Monohydrate',
    'Creatine supplementation',
    '(Creatine OR Creatine Monohydrate)',
  ],
  'CBD': () => [
    'CBD',
    'Cannabidiol',
    'pharmaceutical cannabidiol',
    '(CBD OR Cannabidiol)',
  ],
  'Echinacea': () => [
    'Echinacea',
    'Echinacea purpurea',
    'Purple coneflower',
    'Echinacea supplementation',
    '(Echinacea OR Echinacea purpurea OR Purple coneflower)',
  ],
  'Mimosa tenuiflora': () => getBotanicalPubMedQueryPhrases('Mimosa tenuiflora'),
};

/**
 * Normalize a user query
 * 
 * @deprecated Use intelligent search API instead
 * @see /api/portal/search
 * @see useIntelligentSearch
 */
export function normalizeQuery(query: string): NormalizedQuery {
  // Deprecation warning (only in development)
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PORTAL === 'true') {
    console.info(
      '[DEPRECATED] normalizeQuery() is deprecated. ' +
      'Use intelligent search API (/api/portal/search) or useIntelligentSearch() hook instead. ' +
      'This function will be removed in v2.0.0.'
    );
  }

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
 * Fuzzy matching using multiple strategies
 * Strategy 1: Levenshtein distance (typos, missing chars)
 * Strategy 2: Substring matching (partial matches)
 * Strategy 3: Word-boundary matching (handles hyphens, spaces)
 */
function findFuzzyMatch(
  query: string
): { key: string; confidence: number } | null {
  // Reject very short queries (< 3 chars) to avoid false positives
  if (query.length < 3) {
    return null;
  }

  // Three-letter uppercase-style acronyms are too collision-prone for fuzzy
  // matching (CBD vs NAD, NAC, DHA, EPA). Exact aliases above still normalize.
  if (/^[a-z0-9+]{3,4}$/.test(query)) {
    return null;
  }

  const threshold = 2; // Strict threshold for quality matches
  let bestMatch: { key: string; distance: number; matchType: string } | null = null;

  // Normalize query: remove hyphens, extra spaces
  const normalizedQuery = query.replace(/[-\s]+/g, ' ').trim();
  const compactQuery = query.replace(/[-\s]+/g, ''); // "lcarnitina"

  for (const key of Object.keys(NORMALIZATION_MAP)) {
    const normalizedKey = key.replace(/[-\s]+/g, ' ').trim();
    const compactKey = key.replace(/[-\s]+/g, '');

    // Skip if key is too short or too different in length
    if (key.length < 3) continue;
    const lengthDiff = Math.abs(query.length - key.length);
    if (lengthDiff > 3) continue; // Reject if length difference > 3

    // SEMANTIC FILTERING: Prevent matching vitamins with different letters
    // E.g., "vitamina b" should NOT match "vitamina d"
    const vitaminPattern = /vitamin[ae]?\s*([a-k]|b\d{1,2}|d\d?|k\d?)/i;
    const queryVitMatch = normalizedQuery.match(vitaminPattern);
    const keyVitMatch = normalizedKey.match(vitaminPattern);
    
    if (queryVitMatch && keyVitMatch) {
      // Both are vitamins - check if they have different identifiers
      const queryVitId = queryVitMatch[1].toLowerCase();
      const keyVitId = keyVitMatch[1].toLowerCase();
      
      // Reject if vitamin identifiers are different
      // "vitamina b" (b) should NOT match "vitamina d" (d)
      // "vitamina b12" (b12) should NOT match "vitamina b6" (b6)
      if (queryVitId !== keyVitId) {
        continue; // Skip this match - semantically different vitamins
      }
    }

    // Strategy 1: Exact Levenshtein on normalized strings
    const distance = levenshteinDistance(normalizedQuery, normalizedKey);

    // Strategy 2: Compact matching (ignore hyphens/spaces entirely)
    const compactDistance = levenshteinDistance(compactQuery, compactKey);

    // Strategy 3: Substring matching (contains) - only for longer queries
    const isSubstring = query.length >= 5 && (
      normalizedKey.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedKey)
    );

    // Pick best strategy
    const minDistance = Math.min(distance, compactDistance);
    const finalDistance = isSubstring ? Math.min(minDistance, 1) : minDistance;

    if (finalDistance <= threshold && finalDistance > 0) {
      if (!bestMatch || finalDistance < bestMatch.distance) {
        bestMatch = {
          key,
          distance: finalDistance,
          matchType: isSubstring ? 'substring' : (finalDistance === compactDistance ? 'compact' : 'normal')
        };
      }
    }
  }

  if (bestMatch) {
    // Improved confidence calculation
    // distance=1 → 0.80, distance=2 → 0.70
    const confidence = bestMatch.distance === 1 ? 0.80 : 0.70;

    console.log(`Fuzzy match found: "${query}" → "${bestMatch.key}" (distance: ${bestMatch.distance}, type: ${bestMatch.matchType}, confidence: ${confidence.toFixed(2)})`);

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
