/**
 * Query Normalization Service
 * Handles typo correction, Spanish→English translation, and chemical form mapping
 */

// Common typos and their corrections
const TYPO_CORRECTIONS: Record<string, string> = {
  // Magnesio
  'magenesio': 'Magnesium',
  'magnesio': 'Magnesium',
  'glicinato de magenesio': 'Magnesium Glycinate',
  'glicinato de magnesio': 'Magnesium Glycinate',
  'citrato de magenesio': 'Magnesium Citrate',
  'citrato de magnesio': 'Magnesium Citrate',
  'oxido de magnesio': 'Magnesium Oxide',
  'óxido de magnesio': 'Magnesium Oxide',
  'malato de magnesio': 'Magnesium Malate',
  'treonato de magnesio': 'Magnesium Threonate',
  
  // Zinc
  'zinc': 'Zinc',
  'cinc': 'Zinc',
  'picolinato de zinc': 'Zinc Picolinate',
  'gluconato de zinc': 'Zinc Gluconate',
  'citrato de zinc': 'Zinc Citrate',
  
  // Vitaminas
  'vitamina d': 'Vitamin D',
  'vitamina d3': 'Vitamin D3',
  'colecalciferol': 'Cholecalciferol',
  'vitamina c': 'Vitamin C',
  'acido ascorbico': 'Ascorbic Acid',
  'ácido ascórbico': 'Ascorbic Acid',
  'vitamina b12': 'Vitamin B12',
  'cobalamina': 'Cobalamin',
  'vitamina b2': 'Riboflavin',
  'vitamin b2': 'Riboflavin',
  'riboflavina': 'Riboflavin',
  'vitamina b1': 'Thiamine',
  'vitamin b1': 'Thiamine',
  'tiamina': 'Thiamine',
  'vitamina b3': 'Niacin',
  'vitamin b3': 'Niacin',
  'niacina': 'Niacin',
  'vitamina b5': 'Pantothenic Acid',
  'vitamin b5': 'Pantothenic Acid',
  'acido pantotenico': 'Pantothenic Acid',
  'ácido pantoténico': 'Pantothenic Acid',
  'vitamina b6': 'Pyridoxine',
  'vitamin b6': 'Pyridoxine',
  'piridoxina': 'Pyridoxine',
  'vitamina b7': 'Biotin',
  'vitamin b7': 'Biotin',
  'biotina': 'Biotin',
  'vitamina b9': 'Folate',
  'vitamin b9': 'Folate',
  'acido folico': 'Folate',
  'ácido fólico': 'Folate',
  'folato': 'Folate',
  'folic acid': 'Folate',
  'folate': 'Folate',
  'riboflavin': 'Riboflavin',
  'thiamine': 'Thiamine',
  'thiamin': 'Thiamine',
  'niacin': 'Niacin',
  'pyridoxine': 'Pyridoxine',
  'biotin': 'Biotin',
  'pantothenic acid': 'Pantothenic Acid',
  
  // Omega
  'omega 3': 'Omega-3',
  'omega-3': 'Omega-3',
  'omega 6': 'Omega-6',
  'omega-6': 'Omega-6',
  'aceite de pescado': 'Fish Oil',
  'epa': 'EPA',
  'dha': 'DHA',
  
  // Aminoácidos
  'l-carnitina': 'L-Carnitine',
  'l carnitina': 'L-Carnitine', // with space instead of hyphen
  'carnitina': 'L-Carnitine',
  'l-teanina': 'L-Theanine',
  'l teanina': 'L-Theanine', // with space instead of hyphen
  'teanina': 'L-Theanine',
  'l-glutamina': 'L-Glutamine',
  'l glutamina': 'L-Glutamine', // with space instead of hyphen
  'glutamina': 'L-Glutamine',
  
  // Adaptógenos
  'ashwagandha': 'Ashwagandha',
  'rhodiola': 'Rhodiola',
  'ginseng': 'Ginseng',
  
  // Superfoods y Algas
  'espirulina': 'Spirulina',
  'spirulina': 'Spirulina',
  'chlorella': 'Chlorella',
  'clorella': 'Chlorella',
  'alga espirulina': 'Spirulina',
  'alga chlorella': 'Chlorella',
  
  // Probióticos y Prebióticos
  'probioticos': 'Probiotics',
  'probióticos': 'Probiotics',
  'prebioticos': 'Prebiotics',
  'prebióticos': 'Prebiotics',
  'lactobacillus': 'Lactobacillus',
  'bifidobacterium': 'Bifidobacterium',
  
  // Hierbas y Extractos
  'curcuma': 'Turmeric',
  'cúrcuma': 'Turmeric',
  'curcumina': 'Curcumin',
  'jengibre': 'Ginger',
  'te verde': 'Green Tea',
  'té verde': 'Green Tea',
  'maca': 'Maca',
  'raiz de maca': 'Maca Root',
  'raíz de maca': 'Maca Root',
  'ginkgo': 'Ginkgo Biloba',
  'ginkgo biloba': 'Ginkgo Biloba',
  'saw palmetto': 'Saw Palmetto',
  'palma enana': 'Saw Palmetto',
  'tribulus': 'Tribulus Terrestris',
  'tribulus terrestris': 'Tribulus Terrestris',
  
  // Hongos Medicinales
  'reishi': 'Ganoderma lucidum',
  'reishi mushroom': 'Ganoderma lucidum',
  'hongo reishi': 'Ganoderma lucidum',
  'ganoderma': 'Ganoderma lucidum',
  'lingzhi': 'Ganoderma lucidum',
  'lion\'s mane': 'Hericium erinaceus',
  'lions mane': 'Hericium erinaceus',
  'melena de leon': 'Hericium erinaceus',
  'melena león': 'Hericium erinaceus',
  'hericium': 'Hericium erinaceus',
  'chaga': 'Chaga',
  'chaga mushroom': 'Chaga',
  'hongo chaga': 'Chaga',
  'inonotus obliquus': 'Chaga',
  'cordyceps': 'Cordyceps',
  'cordyceps sinensis': 'Cordyceps',
  'hongo cordyceps': 'Cordyceps',
  'turkey tail': 'Turkey Tail',
  'cola de pavo': 'Turkey Tail',
  'trametes versicolor': 'Turkey Tail',
  'coriolus': 'Turkey Tail',
  'shiitake': 'Shiitake',
  'lentinula edodes': 'Shiitake',
  'maitake': 'Maitake',
  'grifola frondosa': 'Maitake',
  
  // Antioxidantes y Coenzimas
  'coenzima q10': 'CoQ10',
  'coenzima q': 'CoQ10',
  'co q10': 'CoQ10',
  'coq10': 'CoQ10',
  'pqq': 'PQQ',
  'pirroloquinolina quinona': 'PQQ',
  'pyrroloquinoline quinone': 'PQQ',
  'nac': 'NAC',
  'n-acetil cisteina': 'NAC',
  'n-acetyl cysteine': 'NAC',
  'sam': 'SAM-e',
  's-adenosil metionina': 'SAM-e',
  's-adenosyl methionine': 'SAM-e',
  'same': 'SAM-e',
  'tmg': 'TMG',
  'trimetilglicina': 'TMG',
  'trimethylglycine': 'TMG',
  'betaina': 'Betaine',
  'betaine': 'Betaine',
  'nmn': 'NMN',
  'nicotinamida mononucleotido': 'NMN',
  'nicotinamide mononucleotide': 'NMN',
  'nad': 'NAD+',
  'nad+': 'NAD+',
  'nicotinamida adenina dinucleotido': 'NAD+',
  'nicotinamide adenine dinucleotide': 'NAD+',
  'resveratrol': 'Resveratrol',
  'astaxantina': 'Astaxanthin',
  'astaxanthin': 'Astaxanthin',
  'licopeno': 'Lycopene',
  'lycopene': 'Lycopene',
  
  // Minerales adicionales
  'hierro': 'Iron',
  'calcio': 'Calcium',
  'potasio': 'Potassium',
  'selenio': 'Selenium',
  'cromo': 'Chromium',
  'cobre': 'Copper',
  'manganeso': 'Manganese',
  'yodo': 'Iodine',
  'molibdeno': 'Molybdenum',
  'boro': 'Boron',
  
  // Ácidos Grasos
  'acido alfa lipoico': 'Alpha Lipoic Acid',
  'ácido alfa lipoico': 'Alpha Lipoic Acid',
  'ala': 'Alpha Lipoic Acid',
  'cla': 'Conjugated Linoleic Acid',
  'acido linoleico conjugado': 'Conjugated Linoleic Acid',
  'ácido linoleico conjugado': 'Conjugated Linoleic Acid',
  
  // Fibras
  'psyllium': 'Psyllium',
  'psilio': 'Psyllium',
  'glucomanano': 'Glucomannan',
  'glucomannan': 'Glucomannan',
  'inulina': 'Inulin',
  'inulin': 'Inulin',
  
  // Otros
  'creatina': 'Creatine',
  'colageno': 'Collagen',
  'colágeno': 'Collagen',
  'proteina': 'Protein',
  'proteína': 'Protein',
  'whey': 'Whey Protein',
  'suero de leche': 'Whey Protein',
  'bcaa': 'BCAA',
  'aminoacidos ramificados': 'BCAA',
  'aminoácidos ramificados': 'BCAA',
  'beta alanina': 'Beta-Alanine',
  'beta-alanina': 'Beta-Alanine',
  'hmb': 'HMB',
  'citrulina': 'Citrulline',
  'citrulline': 'Citrulline',
  'arginina': 'Arginine',
  'arginine': 'Arginine',
};

// Chemical forms mapping (for specific compound searches)
const CHEMICAL_FORMS: Record<string, { base: string; form: string }> = {
  'Magnesium Glycinate': { base: 'Magnesium', form: 'Glycinate' },
  'Magnesium Citrate': { base: 'Magnesium', form: 'Citrate' },
  'Magnesium Oxide': { base: 'Magnesium', form: 'Oxide' },
  'Magnesium Malate': { base: 'Magnesium', form: 'Malate' },
  'Magnesium Threonate': { base: 'Magnesium', form: 'Threonate' },
  'Zinc Picolinate': { base: 'Zinc', form: 'Picolinate' },
  'Zinc Gluconate': { base: 'Zinc', form: 'Gluconate' },
  'Zinc Citrate': { base: 'Zinc', form: 'Citrate' },
};

// Spanish to English common terms
const SPANISH_TO_ENGLISH: Record<string, string> = {
  'magnesio': 'Magnesium',
  'zinc': 'Zinc',
  'cinc': 'Zinc',
  'hierro': 'Iron',
  'calcio': 'Calcium',
  'potasio': 'Potassium',
  'selenio': 'Selenium',
  'cromo': 'Chromium',
  'cobre': 'Copper',
  'manganeso': 'Manganese',
  'yodo': 'Iodine',
  'vitamina': 'Vitamin',
  'proteina': 'Protein',
  'proteína': 'Protein',
  'aminoacido': 'Amino Acid',
  'aminoácido': 'Amino Acid',
  'acido': 'Acid',
  'ácido': 'Acid',
  'aceite': 'Oil',
  'extracto': 'Extract',
  'polvo': 'Powder',
  'capsula': 'Capsule',
  'cápsula': 'Capsule',
  'tableta': 'Tablet',
};

export interface NormalizedQuery {
  original: string;
  normalized: string;
  confidence: number;
  corrections: string[];
  suggestions: string[];
}

/**
 * Clean and normalize a query string for matching
 * - Removes extra spaces
 * - Converts to lowercase
 * - Removes accents
 * - Trims whitespace
 */
function cleanQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Multiple spaces → single space
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove accent marks
}

/**
 * Normalize a search query by correcting typos and translating to English
 * Handles:
 * - Case insensitivity (VitAMin D → Vitamin D)
 * - Extra spaces (vitamin  d → Vitamin D)
 * - Accents (vitamína d → Vitamin D)
 * - Typos via fuzzy matching (vitamina d → Vitamin D)
 * - Spanish→English translation (magnesio → Magnesium)
 */
export function normalizeQuery(query: string): NormalizedQuery {
  const original = query.trim();
  const cleanedQuery = cleanQuery(original);
  const corrections: string[] = [];
  const suggestions: string[] = [];
  
  // Step 1: Check for exact match in TYPO_CORRECTIONS (case-insensitive, accent-insensitive)
  for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
    if (cleanQuery(key) === cleanedQuery) {
      corrections.push(`Exact match: "${original}" → "${value}"`);
      return {
        original,
        normalized: value,
        confidence: 1.0,
        corrections,
        suggestions,
      };
    }
  }
  
  // Step 2: Check for partial matches (word-by-word translation)
  const words = cleanedQuery.split(/\s+/);
  const translatedWords = words.map(word => {
    // Check typo corrections first (case-insensitive)
    for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
      if (cleanQuery(key) === word) {
        corrections.push(`Word corrected: "${word}" → "${value}"`);
        return value;
      }
    }
    
    // Then check Spanish→English (case-insensitive)
    for (const [key, value] of Object.entries(SPANISH_TO_ENGLISH)) {
      if (cleanQuery(key) === word) {
        corrections.push(`Translated: "${word}" → "${value}"`);
        return value;
      }
    }
    
    // Keep original word if no match (capitalize first letter)
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  const partiallyNormalized = translatedWords.join(' ');
  
  // Step 3: Check if the partially normalized query matches a known compound (case-insensitive)
  for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
    if (cleanQuery(key) === cleanQuery(partiallyNormalized)) {
      corrections.push(`Compound matched: "${partiallyNormalized}" → "${value}"`);
      return {
        original,
        normalized: value,
        confidence: 0.9,
        corrections,
        suggestions,
      };
    }
  }
  
  // Step 4: Check for chemical forms (case-insensitive)
  for (const [key, value] of Object.entries(CHEMICAL_FORMS)) {
    if (cleanQuery(key) === cleanQuery(partiallyNormalized)) {
      const { base, form } = value;
      suggestions.push(`Searching for ${form} form of ${base}`);
      suggestions.push(`If no results, will fallback to ${base} (all forms)`);
      return {
        original,
        normalized: key, // Use the properly capitalized version from dictionary
        confidence: 0.95,
        corrections,
        suggestions,
      };
    }
  }
  
  // Step 5: Try fuzzy matching if no exact match found
  if (corrections.length === 0) {
    const fuzzyMatch = findFuzzyMatch(cleanedQuery);
    if (fuzzyMatch) {
      corrections.push(`Fuzzy match: "${original}" → "${fuzzyMatch.match}" (distance: ${fuzzyMatch.distance})`);
      return {
        original,
        normalized: fuzzyMatch.match,
        confidence: 0.7 - (fuzzyMatch.distance * 0.1), // Lower confidence for higher distance
        corrections,
        suggestions: [`Did you mean "${fuzzyMatch.match}"?`],
      };
    }
  }
  
  // Step 6: If we made any corrections, return the partially normalized version
  if (corrections.length > 0) {
    return {
      original,
      normalized: partiallyNormalized,
      confidence: 0.8,
      corrections,
      suggestions,
    };
  }
  
  // Step 7: No corrections needed - capitalize first letter of each word
  const capitalizedQuery = original
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return {
    original,
    normalized: capitalizedQuery,
    confidence: 0.5, // Low confidence - might be a new/unknown term
    corrections: [],
    suggestions: ['No corrections applied - using original query with capitalization'],
  };
}

/**
 * Simple Levenshtein distance calculation
 * Measures the minimum number of single-character edits needed to change one word into another
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
 * Find fuzzy match in TYPO_CORRECTIONS dictionary
 * Uses relative similarity threshold to avoid false positives with short words
 * Requires at least 60% similarity to consider a match
 */
function findFuzzyMatch(query: string): { match: string; distance: number } | null {
  // CRITICAL: Fuzzy matching is DISABLED for terms longer than 6 characters
  // Reason: Long terms like "melatonina" (10 chars) were matching "l-teanina" (9 chars)
  // with 63.6% similarity, causing wrong supplement results
  // 
  // For long terms, users should either:
  // 1. Use autocomplete suggestions
  // 2. Rely on LLM expansion (which is more accurate)
  // 3. Get "not found" message (better than wrong supplement!)
  //
  // Fuzzy matching is ONLY for short typos like:
  // - "magenesio" → "magnesio" (1 char typo)
  // - "cinc" → "zinc" (similar short words)
  if (query.length > 6) {
    return null; // Disable fuzzy matching for long terms
  }

  const minSimilarityThreshold = 0.75; // Increased from 60% to 75% for stricter matching
  let bestMatch: { match: string; distance: number } | null = null;
  
  for (const [key, value] of Object.entries(TYPO_CORRECTIONS)) {
    const cleanedKey = cleanQuery(key);
    const distance = levenshteinDistance(query, cleanedKey);
    
    if (distance === 0) continue; // Skip exact matches (handled earlier)
    
    // Calculate similarity as a percentage
    const maxLength = Math.max(query.length, cleanedKey.length);
    const similarity = 1 - (distance / maxLength);
    
    // Only accept if similarity >= 75%
    // This prevents false positives like:
    // - PQQ → EPA (0% similar) ❌
    // - melatonina → l-teanina (63% similar) ❌
    // But still allows real typos like:
    // - magenesio → magnesio (89% similar) ✅
    if (similarity >= minSimilarityThreshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { match: value, distance };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Extract base compound from a chemical form query
 * Example: "Magnesium Glycinate" → "Magnesium"
 */
export function extractBaseCompound(query: string): string | null {
  const normalized = query.trim();
  
  // Check if it's a known chemical form (case-insensitive lookup)
  for (const [key, value] of Object.entries(CHEMICAL_FORMS)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value.base;
    }
  }
  
  // Try to extract base from common patterns
  const patterns = [
    /^(\w+)\s+(glycinate|citrate|oxide|malate|threonate|picolinate|gluconate)$/i,
    /^(\w+)\s+de\s+(\w+)$/i, // Spanish pattern: "glicinato de magnesio"
  ];
  
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const potentialBase = match[2] || match[1];
      // Translate if Spanish (case-insensitive lookup)
      for (const [spanishKey, englishValue] of Object.entries(SPANISH_TO_ENGLISH)) {
        if (spanishKey.toLowerCase() === potentialBase.toLowerCase()) {
          return englishValue;
        }
      }
      // Capitalize first letter if not found in dictionary
      return potentialBase.charAt(0).toUpperCase() + potentialBase.slice(1).toLowerCase();
    }
  }
  
  return null;
}

/**
 * Get search fallback terms for a query
 * Returns an array of terms to try in order of preference
 */
export function getSearchFallbacks(query: string): string[] {
  const normalized = normalizeQuery(query);
  const fallbacks: string[] = [normalized.normalized];
  
  // Add base compound if this is a chemical form
  const base = extractBaseCompound(normalized.normalized);
  if (base && base !== normalized.normalized) {
    fallbacks.push(base);
  }
  
  // Add original query if different from normalized
  if (normalized.original !== normalized.normalized) {
    fallbacks.push(normalized.original);
  }
  
  return [...new Set(fallbacks)]; // Remove duplicates
}
