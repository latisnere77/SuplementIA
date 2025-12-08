/**
 * Shared Query Utilities
 * Reusable across all Backend Lambdas
 *
 * Purpose:
 * - Normalize supplement queries
 * - Generate search variations for PubMed
 * - Shared logic to prevent duplication
 *
 * Design:
 * - Zero dependencies (pure JavaScript)
 * - Can be imported by any Lambda
 * - Synchronized with frontend normalizer
 */

/**
 * Query Expansion Map
 * Maps normalized supplement names → PubMed search variations
 */
const QUERY_VARIATIONS = {
  // ========== CARNITINA / L-CARNITINE ==========
  'carnitina': {
    canonical: 'L-Carnitine',
    variations: [
      'L-Carnitine',
      'Levocarnitine',
      'Acetyl-L-Carnitine',
      'ALCAR',
      'L Carnitine supplementation',
      '(L-Carnitine OR Levocarnitine OR Acetyl-L-Carnitine OR ALCAR)'
    ]
  },
  'carnitine': {
    canonical: 'L-Carnitine',
    variations: [
      'L-Carnitine',
      'Levocarnitine',
      'Acetyl-L-Carnitine',
      'ALCAR',
      '(L-Carnitine OR Levocarnitine)'
    ]
  },
  'l-carnitine': {
    canonical: 'L-Carnitine',
    variations: [
      'L-Carnitine',
      'Levocarnitine',
      'Acetyl-L-Carnitine',
      '(L-Carnitine OR Levocarnitine OR Acetyl-L-Carnitine)'
    ]
  },

  // ========== MAGNESIUM ==========
  'magnesio': {
    canonical: 'Magnesium',
    variations: [
      'Magnesium',
      'Magnesium supplementation',
      'Magnesium Glycinate',
      'Magnesium Citrate',
      '(Magnesium OR Magnesium supplementation)'
    ]
  },
  'magnesium': {
    canonical: 'Magnesium',
    variations: [
      'Magnesium',
      'Magnesium supplementation',
      'Magnesium Glycinate',
      'Magnesium Citrate',
      '(Magnesium OR Magnesium supplementation)'
    ]
  },

  // ========== OMEGA-3 ==========
  'omega 3': {
    canonical: 'Omega-3',
    variations: [
      'Omega-3',
      'Fish Oil',
      'EPA DHA',
      'Omega-3 Fatty Acids',
      'n-3 PUFA',
      '(Omega-3 OR Fish Oil OR EPA OR DHA)'
    ]
  },
  'omega-3': {
    canonical: 'Omega-3',
    variations: [
      'Omega-3',
      'Fish Oil',
      'EPA DHA',
      '(Omega-3 OR Fish Oil)'
    ]
  },

  // ========== VITAMINS ==========
  'vitamina d': {
    canonical: 'Vitamin D',
    variations: [
      'Vitamin D',
      'Cholecalciferol',
      'Vitamin D3',
      'Vitamin D supplementation',
      '(Vitamin D OR Cholecalciferol OR Vitamin D3)'
    ]
  },
  'vitamin d': {
    canonical: 'Vitamin D',
    variations: [
      'Vitamin D',
      'Cholecalciferol',
      'Vitamin D3',
      '(Vitamin D OR Vitamin D3)'
    ]
  },

  // ========== CREATINE ==========
  'creatina': {
    canonical: 'Creatine',
    variations: [
      'Creatine',
      'Creatine Monohydrate',
      'Creatine supplementation',
      '(Creatine OR Creatine Monohydrate)'
    ]
  },
  'creatine': {
    canonical: 'Creatine',
    variations: [
      'Creatine',
      'Creatine Monohydrate',
      '(Creatine OR Creatine Monohydrate)'
    ]
  },

  // ========== ASHWAGANDHA ==========
  'ashwagandha': {
    canonical: 'Ashwagandha',
    variations: [
      'Ashwagandha',
      'Withania somnifera',
      'Ashwagandha supplementation',
      '(Ashwagandha OR Withania somnifera)'
    ]
  },

  // ========== TURMERIC / CURCUMA ==========
  'curcuma': {
    canonical: 'Turmeric',
    variations: [
      'Turmeric',
      'Curcumin',
      'Curcuma longa',
      '(Turmeric OR Curcumin)'
    ]
  },
  'turmeric': {
    canonical: 'Turmeric',
    variations: [
      'Turmeric',
      'Curcumin',
      '(Turmeric OR Curcumin)'
    ]
  },
};

/**
 * Expand a query to multiple search variations
 * @param {string} originalQuery - User's original query
 * @returns {Object} Expanded query with variations
 */
function expandQuery(originalQuery) {
  const normalized = originalQuery.toLowerCase().trim();

  // Exact match in expansion map
  if (QUERY_VARIATIONS[normalized]) {
    const expansion = QUERY_VARIATIONS[normalized];
    return {
      original: originalQuery,
      canonical: expansion.canonical,
      variations: expansion.variations,
      searchStrategy: 'multi_term',
      confidence: 1.0
    };
  }

  // Fuzzy match (simple substring matching for common typos)
  const fuzzyMatch = findFuzzyMatch(normalized);
  if (fuzzyMatch) {
    const expansion = QUERY_VARIATIONS[fuzzyMatch.key];
    return {
      original: originalQuery,
      canonical: expansion.canonical,
      variations: expansion.variations,
      searchStrategy: 'multi_term',
      confidence: fuzzyMatch.confidence
    };
  }

  // Fallback: use query as-is
  return {
    original: originalQuery,
    canonical: originalQuery,
    variations: [originalQuery, `${originalQuery} supplementation`],
    searchStrategy: 'single_term',
    confidence: 0.0
  };
}

/**
 * Simple fuzzy matching
 * @param {string} query - Normalized query
 * @returns {Object|null} Matched key and confidence
 */
function findFuzzyMatch(query) {
  const keys = Object.keys(QUERY_VARIATIONS);

  for (const key of keys) {
    // Substring match
    if (key.includes(query) || query.includes(key)) {
      const lengthRatio = Math.min(query.length, key.length) / Math.max(query.length, key.length);
      return { key, confidence: lengthRatio };
    }

    // Levenshtein distance (simple)
    const distance = levenshteinDistance(query, key);
    if (distance <= 2 && distance > 0) {
      const confidence = 1 - (distance / (query.length + 1));
      return { key, confidence };
    }
  }

  return null;
}

/**
 * Levenshtein distance (simple implementation)
 * @param {string} a
 * @param {string} b
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];

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
 * Get all supported canonical names (for validation)
 * @returns {Array<string>} Canonical supplement names
 */
function getAllCanonicalNames() {
  const canonicals = new Set();
  Object.values(QUERY_VARIATIONS).forEach(v => canonicals.add(v.canonical));
  return Array.from(canonicals).sort();
}

/**
 * Check if a query has known expansions
 * @param {string} query
 * @returns {boolean}
 */
function hasExpansion(query) {
  const normalized = query.toLowerCase().trim();
  return normalized in QUERY_VARIATIONS;
}

// Export functions
module.exports = {
  expandQuery,
  hasExpansion,
  getAllCanonicalNames,
  QUERY_VARIATIONS
};

// For testing
if (require.main === module) {
  console.log('=== Query Expansion Utils - Tests ===\n');

  const testCases = [
    'carnitina',
    'magnesio',
    'omega 3',
    'vitamina d',
    'ashwagandha',
    'unknown supplement'
  ];

  testCases.forEach(query => {
    const result = expandQuery(query);
    console.log(`Query: "${query}"`);
    console.log(`  Canonical: ${result.canonical}`);
    console.log(`  Variations: ${result.variations.length}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Strategy: ${result.searchStrategy}\n`);
  });

  console.log('\n=== Supported Supplements ===');
  console.log(getAllCanonicalNames().join(', '));
}
