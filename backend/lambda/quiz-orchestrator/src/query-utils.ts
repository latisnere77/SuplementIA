/**
 * Query utilities - validation, sanitization, and abbreviation expansion
 */

// Common abbreviations mapping (Spanish to English)
const COMMON_ABBREVIATIONS: Record<string, string> = {
  // Vitamins
  b12: 'vitamin b12',
  'vit b12': 'vitamin b12',
  'vitamina b12': 'vitamin b12',
  b6: 'vitamin b6',
  b1: 'vitamin b1',
  b2: 'vitamin b2',
  b3: 'vitamin b3',
  b5: 'vitamin b5',
  b7: 'vitamin b7',
  b9: 'vitamin b9',
  'vit d': 'vitamin d',
  'd3': 'vitamin d3',
  'vitamina d': 'vitamin d',
  'vitamina d3': 'vitamin d3',
  'vit c': 'vitamin c',
  'vitamina c': 'vitamin c',
  'vit e': 'vitamin e',
  'vitamina e': 'vitamin e',
  'vit a': 'vitamin a',
  'vitamina a': 'vitamin a',
  'vit k': 'vitamin k',
  'vitamina k': 'vitamin k',
  'vit k2': 'vitamin k2',
  'vitamina k2': 'vitamin k2',

  // Coenzymes
  q10: 'coenzyme q10',
  coq10: 'coenzyme q10',
  ubiquinol: 'coenzyme q10',

  // Amino acids
  bcaa: 'branched-chain amino acids',
  'aminoacidos ramificados': 'branched-chain amino acids',
  glutamina: 'glutamine',
  arginina: 'arginine',
  lisina: 'lysine',
  taurina: 'taurine',
  glicina: 'glycine',
  tirosina: 'tyrosine',
  triptofano: 'tryptophan',
  metionina: 'methionine',
  cisteina: 'cysteine',
  leucina: 'leucine',
  isoleucina: 'isoleucine',
  valina: 'valine',

  // Carnitine variants
  carnitina: 'l-carnitine',
  'l-carnitina': 'l-carnitine',
  levocarnitina: 'l-carnitine',
  'acetil l carnitina': 'acetyl-l-carnitine',
  'acetil-l-carnitina': 'acetyl-l-carnitine',
  'acetil carnitina': 'acetyl-l-carnitine',
  alcar: 'acetyl-l-carnitine',

  // Minerals
  magnesio: 'magnesium',
  zinc: 'zinc',
  hierro: 'iron',
  calcio: 'calcium',
  potasio: 'potassium',
  selenio: 'selenium',
  cromo: 'chromium',
  cobre: 'copper',
  manganeso: 'manganese',
  yodo: 'iodine',

  // Omega fatty acids
  omega3: 'omega-3',
  'omega 3': 'omega-3',
  'aceite de pescado': 'fish oil',
  'fish oil': 'omega-3 fish oil',
  dha: 'docosahexaenoic acid',
  epa: 'eicosapentaenoic acid',

  // Popular supplements
  creatina: 'creatine',
  proteina: 'protein',
  'proteina whey': 'whey protein',
  'whey protein': 'whey protein',
  melatonina: 'melatonin',
  ashwagandha: 'ashwagandha',
  curcuma: 'turmeric curcumin',
  curcumina: 'curcumin',
  jengibre: 'ginger',
  ajo: 'garlic',
  'ginkgo biloba': 'ginkgo biloba',
  ginseng: 'ginseng',
  'rhodiola rosea': 'rhodiola rosea',
  rhodiola: 'rhodiola rosea',
  maca: 'maca root',
  'saw palmetto': 'saw palmetto',
  colageno: 'collagen',
  'acido hialuronico': 'hyaluronic acid',
  biotina: 'biotin',
  probioticos: 'probiotics',
  prebioticos: 'prebiotics',
  fibra: 'fiber',
  psyllium: 'psyllium husk',
  spirulina: 'spirulina',
  chlorella: 'chlorella',
};

// Dangerous substances that should be rejected
const DANGEROUS_SUBSTANCES = [
  'cianuro',
  'cyanide',
  'arsenico',
  'arsenic',
  'mercurio',
  'mercury',
  'plomo',
  'lead',
  'veneno',
  'poison',
];

// Known medications that should trigger a warning
const MEDICATIONS = [
  'paracetamol',
  'ibuprofeno',
  'aspirina',
  'metformina',
  'omeprazol',
  'atorvastatina',
  'losartan',
  'amlodipino',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Validate a supplement query
 */
export function validateSupplementQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return {
      valid: false,
      error: 'Query is required',
      severity: 'error',
    };
  }

  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'Query too short',
      suggestion: 'Please enter at least 2 characters',
      severity: 'error',
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      error: 'Query too long',
      suggestion: 'Please enter less than 200 characters',
      severity: 'error',
    };
  }

  const lowerQuery = trimmed.toLowerCase();

  // Check for dangerous substances
  for (const substance of DANGEROUS_SUBSTANCES) {
    if (lowerQuery.includes(substance)) {
      return {
        valid: false,
        error: 'This substance is dangerous and not recommended',
        severity: 'error',
      };
    }
  }

  // Check for medications (warning only)
  for (const medication of MEDICATIONS) {
    if (lowerQuery.includes(medication)) {
      return {
        valid: true, // Still valid, just a warning
        suggestion: `"${medication}" is a medication, not a supplement. Please consult a doctor.`,
        severity: 'warning',
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize a query string
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>\"'`]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200); // Limit length
}

/**
 * Expand abbreviations to canonical names
 */
export function expandAbbreviation(query: string): {
  original: string;
  expanded: string;
  wasExpanded: boolean;
} {
  const lowerQuery = query.toLowerCase().trim();
  const expanded = COMMON_ABBREVIATIONS[lowerQuery];

  if (expanded) {
    return {
      original: query,
      expanded,
      wasExpanded: true,
    };
  }

  // Check for partial matches (e.g., "vitamina b12 para energia")
  for (const [abbrev, canonical] of Object.entries(COMMON_ABBREVIATIONS)) {
    if (lowerQuery.startsWith(abbrev + ' ')) {
      const rest = lowerQuery.substring(abbrev.length);
      return {
        original: query,
        expanded: canonical + rest,
        wasExpanded: true,
      };
    }
  }

  return {
    original: query,
    expanded: query,
    wasExpanded: false,
  };
}

/**
 * Detect altitude from location
 */
export function detectAltitude(location: string): number {
  const altitudeMap: Record<string, number> = {
    CDMX: 2250,
    'Mexico City': 2250,
    'Ciudad de México': 2250,
    Bogotá: 2640,
    Bogota: 2640,
    Quito: 2850,
    'La Paz': 3640,
  };
  return altitudeMap[location] || 0;
}

/**
 * Detect climate from location
 */
export function detectClimate(location: string): string {
  const tropicalLocations = [
    'CDMX',
    'Mexico City',
    'Ciudad de México',
    'Cancún',
    'Cancun',
    'Mérida',
    'Merida',
  ];
  return tropicalLocations.includes(location) ? 'tropical' : 'temperate';
}
