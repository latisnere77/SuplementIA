/**
 * Supplement Name Suggestions
 * Provides "Did you mean...?" functionality for common misspellings and variations
 */

interface SupplementSuggestion {
  query: string;
  suggestion: string;
  reason: string;
}

/**
 * Common supplement name variations and corrections
 */
const SUPPLEMENT_CORRECTIONS: Record<string, string> = {
  // CoQ10 variations
  'co q12': 'CoQ10',
  'co q 12': 'CoQ10',
  'coq12': 'CoQ10',
  'co q': 'CoQ10',
  'coenzima q': 'CoQ10',
  'coenzima q10': 'CoQ10',
  'q10': 'CoQ10',
  'enzima q': 'CoQ10',
  'enzima q10': 'CoQ10',
  'enzima q15': 'CoQ10',
  'enzima q12': 'CoQ10',
  'coq': 'CoQ10',

  // Vitamin D variations
  'vitamina d': 'Vitamin D',
  'vitamina d3': 'Vitamin D3',
  'd3': 'Vitamin D3',

  // Omega-3
  'omega 3': 'Omega-3',
  'omega3': 'Omega-3',
  'omega-3 fatty acids': 'Omega-3',
  'fish oil': 'Omega-3',
  'aceite de pescado': 'Omega-3',

  // Magnesium and forms
  'magnesio': 'Magnesium',
  'magenesio': 'Magnesium', // common typo
  'mg': 'Magnesium',
  'glicinato de magnesio': 'Magnesium Glycinate',
  'glicinato de magenesio': 'Magnesium Glycinate', // typo
  'magnesium glycinate': 'Magnesium Glycinate',
  'citrato de magnesio': 'Magnesium Citrate',
  'citrato de magenesio': 'Magnesium Citrate', // typo
  'magnesium citrate': 'Magnesium Citrate',
  'oxido de magnesio': 'Magnesium Oxide',
  'óxido de magnesio': 'Magnesium Oxide',
  'magnesium oxide': 'Magnesium Oxide',
  'malato de magnesio': 'Magnesium Malate',
  'magnesium malate': 'Magnesium Malate',
  'treonato de magnesio': 'Magnesium Threonate',
  'magnesium threonate': 'Magnesium Threonate',
  'magnesium l-threonate': 'Magnesium Threonate',

  // Zinc
  'zinc': 'Zinc',
  'zinco': 'Zinc',

  // Melatonin
  'melatonina': 'Melatonin',
  'melantonin': 'Melatonin',
  'melatonine': 'Melatonin',

  // St. John's Wort
  'st john wort': "St. John's Wort",
  'st johns wort': "St. John's Wort",
  'hypericum': "St. John's Wort",

  // Ashwagandha
  'ashwaganda': 'Ashwagandha',
  'ashwagandha': 'Ashwagandha',
  'aswagandha': 'Ashwagandha',
  'ashawagandha': 'Ashwagandha',
  'withania': 'Ashwagandha',

  // Turmeric
  'curcuma': 'Turmeric',
  'curcumin': 'Turmeric',
  'cúrcuma': 'Turmeric',
  'turmeric': 'Turmeric',
  'curcumina': 'Turmeric',
  'curry': 'Turmeric',

  // Probiotics
  'probiotics': 'Probiotics',
  'probioticos': 'Probiotics',
  'probiotic': 'Probiotics',

  // Vitamin C
  'vitamina c': 'Vitamin C',
  'vitamin c': 'Vitamin C',
  'ascorbic acid': 'Vitamin C',
  'ácido ascórbico': 'Vitamin C',
  'acido ascorbico': 'Vitamin C',
  'vit c': 'Vitamin C',

  // B Complex
  'vitamina b': 'Vitamin B Complex',
  'b complex': 'Vitamin B Complex',
  'complejo b': 'Vitamin B Complex',
  'b12': 'Vitamin B12',
  'vitamina b12': 'Vitamin B12',
  'cianocobalamina': 'Vitamin B12',
  'b6': 'Vitamin B6',
  'b1': 'Vitamin B1',

  // Retinol/Vitamin A
  'retinol': 'Vitamin A',
  'vitamina a': 'Vitamin A',
  'retinoid': 'Vitamin A',

  // Creatine variations
  'creatina': 'Creatine',
  'creatine monohydrate': 'Creatine',
  'creatina monohidratada': 'Creatine',

  // Protein variations
  'proteina': 'Protein',
  'whey protein': 'Whey Protein',
  'proteina de suero': 'Whey Protein',
  'suero de leche': 'Whey Protein',

  // Collagen variations
  'colageno': 'Collagen',
  'colágeno': 'Collagen',
  'colageno hidrolizado': 'Collagen',
  'collagen peptides': 'Collagen',

  // (Melatonin, Omega-3, Magnesium, Zinc already defined above - skipping duplicates)

  // Common typos and abbreviations
  'vit d': 'Vitamin D',
  'vit d3': 'Vitamin D3',
  'k2': 'Vitamin K2',
  'vit k': 'Vitamin K',
  'calcio': 'Calcium',
  'hierro': 'Iron',
  'potasio': 'Potassium',

  // Superfoods and Algae
  'espirulina': 'Spirulina',
  'spirulina': 'Spirulina',
  'alga espirulina': 'Spirulina',
  'chlorella': 'Chlorella',
  'clorella': 'Chlorella',
  'alga chlorella': 'Chlorella',
  
  // Herbal variations
  'ginseng': 'Ginseng',
  'ginsen': 'Ginseng',
  'te verde': 'Green Tea Extract',
  'té verde': 'Green Tea Extract',
  'green tea': 'Green Tea Extract',
  'maca': 'Maca Root',
  'raiz de maca': 'Maca Root',
  'jengibre': 'Ginger',
  'ginger': 'Ginger',
  'ginkgo': 'Ginkgo Biloba',
  'ginkgo biloba': 'Ginkgo Biloba',
  'saw palmetto': 'Saw Palmetto',
  'palma enana': 'Saw Palmetto',
  'tribulus': 'Tribulus Terrestris',
  'tribulus terrestris': 'Tribulus Terrestris',

  // ========== CARNITINA / L-CARNITINE VARIATIONS (ADDED 2025-11-21) ==========
  // Spanish variations
  'carnitina': 'L-Carnitine',
  'l-carnitina': 'L-Carnitine',
  'l carnitina': 'L-Carnitine',
  'levo carnitina': 'L-Carnitine',
  'levocarnitina': 'L-Carnitine',
  'carnita': 'L-Carnitine', // common typo
  'karnitina': 'L-Carnitine', // k/c confusion
  'carnitin': 'L-Carnitine',
  'carniti': 'L-Carnitine',
  'cartinine': 'L-Carnitine', // common confusion
  'carantine': 'L-Carnitine',

  // English variations
  'carnitine': 'L-Carnitine',
  'l-carnitine': 'L-Carnitine',
  'l carnitine': 'L-Carnitine',
  'levocarnitine': 'L-Carnitine',
  'levo carnitine': 'L-Carnitine',

  // Acetyl-L-Carnitine variations
  'acetil carnitina': 'Acetyl-L-Carnitine',
  'acetil-l-carnitina': 'Acetyl-L-Carnitine',
  'acetil l carnitina': 'Acetyl-L-Carnitine',
  'acetyl carnitine': 'Acetyl-L-Carnitine',
  'acetyl-l-carnitine': 'Acetyl-L-Carnitine',
  'acetyl l carnitine': 'Acetyl-L-Carnitine',
  'alcar': 'Acetyl-L-Carnitine', // common abbreviation
  'acetylcarnitine': 'Acetyl-L-Carnitine',
  'n-acetyl-l-carnitine': 'Acetyl-L-Carnitine',

  // Propionyl-L-Carnitine variations
  'propionil carnitina': 'Propionyl-L-Carnitine',
  'propionyl carnitine': 'Propionyl-L-Carnitine',
  'propionyl-l-carnitine': 'Propionyl-L-Carnitine',
  'propionyl l carnitine': 'Propionyl-L-Carnitine',
  'plc': 'Propionyl-L-Carnitine', // abbreviation

  // L-Carnitine Tartrate variations
  'carnitina tartrato': 'L-Carnitine Tartrate',
  'carnitine tartrate': 'L-Carnitine Tartrate',
  'l-carnitine tartrate': 'L-Carnitine Tartrate',
  'carnitina tartrate': 'L-Carnitine Tartrate',

  // Common misspellings and variations
  'carnit': 'L-Carnitine',
  'karnitin': 'L-Carnitine',
  'carnithine': 'L-Carnitine',
};

/**
 * Suggests a correction for a supplement name query
 * @param query - The user's search query
 * @returns Suggestion object if found, null otherwise
 */
export function suggestSupplementCorrection(query: string): SupplementSuggestion | null {
  const normalized = query.toLowerCase().trim();

  // Exact match
  if (SUPPLEMENT_CORRECTIONS[normalized]) {
    return {
      query,
      suggestion: SUPPLEMENT_CORRECTIONS[normalized],
      reason: 'common_variation',
    };
  }

  // Fuzzy match (simple Levenshtein-like approach)
  const threshold = 2; // Max edit distance
  for (const [key, value] of Object.entries(SUPPLEMENT_CORRECTIONS)) {
    const distance = levenshteinDistance(normalized, key);
    if (distance <= threshold && distance > 0) {
      return {
        query,
        suggestion: value,
        reason: 'fuzzy_match',
      };
    }
  }

  return null;
}

/**
 * Simple Levenshtein distance calculation
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
 * Get multiple suggestions (for future expansion)
 */
export function getSupplementSuggestions(query: string, maxSuggestions = 3): string[] {
  const normalized = query.toLowerCase().trim();
  const suggestions: string[] = [];

  // Add exact match
  if (SUPPLEMENT_CORRECTIONS[normalized]) {
    suggestions.push(SUPPLEMENT_CORRECTIONS[normalized]);
  }

  // Add fuzzy matches
  const fuzzyMatches: Array<{ supplement: string; distance: number }> = [];
  for (const [key, value] of Object.entries(SUPPLEMENT_CORRECTIONS)) {
    const distance = levenshteinDistance(normalized, key);
    if (distance > 0 && distance <= 3) {
      fuzzyMatches.push({ supplement: value, distance });
    }
  }

  // Sort by distance and add unique suggestions
  fuzzyMatches
    .sort((a, b) => a.distance - b.distance)
    .forEach(({ supplement }) => {
      if (!suggestions.includes(supplement) && suggestions.length < maxSuggestions) {
        suggestions.push(supplement);
      }
    });

  return suggestions;
}
