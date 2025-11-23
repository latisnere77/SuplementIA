/**
 * Query Normalization Service
 * Handles typo correction, Spanish→English translation, and chemical form mapping
 */

// Common typos and their corrections
const TYPO_CORRECTIONS: Record<string, string> = {
  // Magnesio
  'magenesio': 'magnesio',
  'magnesio': 'magnesium',
  'glicinato de magenesio': 'magnesium glycinate',
  'glicinato de magnesio': 'magnesium glycinate',
  'citrato de magenesio': 'magnesium citrate',
  'citrato de magnesio': 'magnesium citrate',
  'oxido de magnesio': 'magnesium oxide',
  'óxido de magnesio': 'magnesium oxide',
  'malato de magnesio': 'magnesium malate',
  'treonato de magnesio': 'magnesium threonate',
  
  // Zinc
  'zinc': 'zinc',
  'cinc': 'zinc',
  'picolinato de zinc': 'zinc picolinate',
  'gluconato de zinc': 'zinc gluconate',
  'citrato de zinc': 'zinc citrate',
  
  // Vitaminas
  'vitamina d': 'vitamin d',
  'vitamina d3': 'vitamin d3',
  'colecalciferol': 'cholecalciferol',
  'vitamina c': 'vitamin c',
  'acido ascorbico': 'ascorbic acid',
  'ácido ascórbico': 'ascorbic acid',
  'vitamina b12': 'vitamin b12',
  'cobalamina': 'cobalamin',
  
  // Omega
  'omega 3': 'omega-3',
  'omega-3': 'omega-3',
  'omega 6': 'omega-6',
  'omega-6': 'omega-6',
  'aceite de pescado': 'fish oil',
  'epa': 'epa',
  'dha': 'dha',
  
  // Aminoácidos
  'l-carnitina': 'l-carnitine',
  'carnitina': 'l-carnitine',
  'l-teanina': 'l-theanine',
  'teanina': 'l-theanine',
  'l-glutamina': 'l-glutamine',
  'glutamina': 'l-glutamine',
  
  // Adaptógenos
  'ashwagandha': 'ashwagandha',
  'rhodiola': 'rhodiola',
  'ginseng': 'ginseng',
  
  // Superfoods y Algas
  'espirulina': 'spirulina',
  'spirulina': 'spirulina',
  'chlorella': 'chlorella',
  'clorella': 'chlorella',
  'alga espirulina': 'spirulina',
  'alga chlorella': 'chlorella',
  
  // Probióticos y Prebióticos
  'probioticos': 'probiotics',
  'probióticos': 'probiotics',
  'prebioticos': 'prebiotics',
  'prebióticos': 'prebiotics',
  'lactobacillus': 'lactobacillus',
  'bifidobacterium': 'bifidobacterium',
  
  // Hierbas y Extractos
  'curcuma': 'turmeric',
  'cúrcuma': 'turmeric',
  'curcumina': 'curcumin',
  'jengibre': 'ginger',
  'te verde': 'green tea',
  'té verde': 'green tea',
  'maca': 'maca',
  'raiz de maca': 'maca root',
  'raíz de maca': 'maca root',
  'ginkgo': 'ginkgo biloba',
  'ginkgo biloba': 'ginkgo biloba',
  'saw palmetto': 'saw palmetto',
  'palma enana': 'saw palmetto',
  'tribulus': 'tribulus terrestris',
  'tribulus terrestris': 'tribulus terrestris',
  
  // Antioxidantes
  'coenzima q10': 'coq10',
  'coenzima q': 'coq10',
  'co q10': 'coq10',
  'coq10': 'coq10',
  'resveratrol': 'resveratrol',
  'astaxantina': 'astaxanthin',
  'astaxanthin': 'astaxanthin',
  'licopeno': 'lycopene',
  'lycopene': 'lycopene',
  
  // Minerales adicionales
  'hierro': 'iron',
  'calcio': 'calcium',
  'potasio': 'potassium',
  'selenio': 'selenium',
  'cromo': 'chromium',
  'cobre': 'copper',
  'manganeso': 'manganese',
  'yodo': 'iodine',
  'molibdeno': 'molybdenum',
  'boro': 'boron',
  
  // Ácidos Grasos
  'acido alfa lipoico': 'alpha lipoic acid',
  'ácido alfa lipoico': 'alpha lipoic acid',
  'ala': 'alpha lipoic acid',
  'cla': 'conjugated linoleic acid',
  'acido linoleico conjugado': 'conjugated linoleic acid',
  'ácido linoleico conjugado': 'conjugated linoleic acid',
  
  // Fibras
  'psyllium': 'psyllium',
  'psilio': 'psyllium',
  'glucomanano': 'glucomannan',
  'glucomannan': 'glucomannan',
  'inulina': 'inulin',
  'inulin': 'inulin',
  
  // Otros
  'creatina': 'creatine',
  'colageno': 'collagen',
  'colágeno': 'collagen',
  'proteina': 'protein',
  'proteína': 'protein',
  'whey': 'whey protein',
  'suero de leche': 'whey protein',
  'bcaa': 'bcaa',
  'aminoacidos ramificados': 'bcaa',
  'aminoácidos ramificados': 'bcaa',
  'beta alanina': 'beta-alanine',
  'beta-alanina': 'beta-alanine',
  'hmb': 'hmb',
  'citrulina': 'citrulline',
  'citrulline': 'citrulline',
  'arginina': 'arginine',
  'arginine': 'arginine',
};

// Chemical forms mapping (for specific compound searches)
const CHEMICAL_FORMS: Record<string, { base: string; form: string }> = {
  'magnesium glycinate': { base: 'magnesium', form: 'glycinate' },
  'magnesium citrate': { base: 'magnesium', form: 'citrate' },
  'magnesium oxide': { base: 'magnesium', form: 'oxide' },
  'magnesium malate': { base: 'magnesium', form: 'malate' },
  'magnesium threonate': { base: 'magnesium', form: 'threonate' },
  'zinc picolinate': { base: 'zinc', form: 'picolinate' },
  'zinc gluconate': { base: 'zinc', form: 'gluconate' },
  'zinc citrate': { base: 'zinc', form: 'citrate' },
};

// Spanish to English common terms
const SPANISH_TO_ENGLISH: Record<string, string> = {
  'magnesio': 'magnesium',
  'zinc': 'zinc',
  'cinc': 'zinc',
  'hierro': 'iron',
  'calcio': 'calcium',
  'potasio': 'potassium',
  'selenio': 'selenium',
  'cromo': 'chromium',
  'cobre': 'copper',
  'manganeso': 'manganese',
  'yodo': 'iodine',
  'vitamina': 'vitamin',
  'proteina': 'protein',
  'proteína': 'protein',
  'aminoacido': 'amino acid',
  'aminoácido': 'amino acid',
  'acido': 'acid',
  'ácido': 'acid',
  'aceite': 'oil',
  'extracto': 'extract',
  'polvo': 'powder',
  'capsula': 'capsule',
  'cápsula': 'capsule',
  'tableta': 'tablet',
};

export interface NormalizedQuery {
  original: string;
  normalized: string;
  confidence: number;
  corrections: string[];
  suggestions: string[];
}

/**
 * Normalize a search query by correcting typos and translating to English
 */
export function normalizeQuery(query: string): NormalizedQuery {
  const original = query.trim();
  const lowerQuery = original.toLowerCase();
  const corrections: string[] = [];
  const suggestions: string[] = [];
  
  // Step 1: Check for exact typo corrections
  if (TYPO_CORRECTIONS[lowerQuery]) {
    const corrected = TYPO_CORRECTIONS[lowerQuery];
    corrections.push(`Typo corrected: "${original}" → "${corrected}"`);
    return {
      original,
      normalized: corrected,
      confidence: 1.0,
      corrections,
      suggestions,
    };
  }
  
  // Step 2: Check for partial matches (word-by-word)
  const words = lowerQuery.split(/\s+/);
  const translatedWords = words.map(word => {
    // Check typo corrections first
    if (TYPO_CORRECTIONS[word]) {
      corrections.push(`Word corrected: "${word}" → "${TYPO_CORRECTIONS[word]}"`);
      return TYPO_CORRECTIONS[word];
    }
    // Then check Spanish→English
    if (SPANISH_TO_ENGLISH[word]) {
      corrections.push(`Translated: "${word}" → "${SPANISH_TO_ENGLISH[word]}"`);
      return SPANISH_TO_ENGLISH[word];
    }
    return word;
  });
  
  const partiallyNormalized = translatedWords.join(' ');
  
  // Step 3: Check if the partially normalized query matches a known compound
  if (TYPO_CORRECTIONS[partiallyNormalized]) {
    const final = TYPO_CORRECTIONS[partiallyNormalized];
    corrections.push(`Compound matched: "${partiallyNormalized}" → "${final}"`);
    return {
      original,
      normalized: final,
      confidence: 0.9,
      corrections,
      suggestions,
    };
  }
  
  // Step 4: Check for chemical forms
  if (CHEMICAL_FORMS[partiallyNormalized]) {
    const { base, form } = CHEMICAL_FORMS[partiallyNormalized];
    suggestions.push(`Searching for ${form} form of ${base}`);
    suggestions.push(`If no results, will fallback to ${base} (all forms)`);
    return {
      original,
      normalized: partiallyNormalized,
      confidence: 0.95,
      corrections,
      suggestions,
    };
  }
  
  // Step 5: If we made any corrections, return the partially normalized version
  if (corrections.length > 0) {
    return {
      original,
      normalized: partiallyNormalized,
      confidence: 0.8,
      corrections,
      suggestions,
    };
  }
  
  // Step 6: No corrections needed
  return {
    original,
    normalized: original,
    confidence: 0.5, // Low confidence - might be a new/unknown term
    corrections: [],
    suggestions: ['No corrections applied - using original query'],
  };
}

/**
 * Extract base compound from a chemical form query
 * Example: "magnesium glycinate" → "magnesium"
 */
export function extractBaseCompound(query: string): string | null {
  const normalized = query.toLowerCase().trim();
  
  if (CHEMICAL_FORMS[normalized]) {
    return CHEMICAL_FORMS[normalized].base;
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
      // Translate if Spanish
      return SPANISH_TO_ENGLISH[potentialBase] || potentialBase;
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
