/**
 * Benefit Normalization Module
 * Normalizes health benefits/conditions from Spanish to English for scientific search
 *
 * Purpose: Latino users search in Spanish, but scientific sources are in English
 * Example: "crecimiento de cabello" → "hair growth"
 */

export interface NormalizedBenefit {
  /** Original user input */
  original: string;
  /** Normalized English term for scientific search */
  normalized: string;
  /** Alternative search terms */
  alternatives: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Category of benefit */
  category: 'skin' | 'hair' | 'energy' | 'cognitive' | 'sleep' | 'muscle' | 'immune' | 'mood' | 'digestive' | 'joint' | 'general';
}

/**
 * Benefit Normalization Map
 * Maps Spanish health benefits/conditions → English scientific terms
 */
const BENEFIT_MAP: Record<string, {
  english: string;
  alternatives: string[];
  category: NormalizedBenefit['category'];
}> = {
  // ========== CABELLO / HAIR ==========
  'crecimiento de cabello': {
    english: 'hair growth',
    alternatives: ['hair regrowth', 'hair loss prevention', 'alopecia treatment'],
    category: 'hair'
  },
  'crecimiento del cabello': {
    english: 'hair growth',
    alternatives: ['hair regrowth', 'hair loss prevention'],
    category: 'hair'
  },
  'caida de cabello': {
    english: 'hair loss',
    alternatives: ['hair shedding', 'alopecia', 'hair thinning'],
    category: 'hair'
  },
  'caida del cabello': {
    english: 'hair loss',
    alternatives: ['hair shedding', 'alopecia'],
    category: 'hair'
  },
  'pérdida de cabello': {
    english: 'hair loss',
    alternatives: ['alopecia', 'hair thinning'],
    category: 'hair'
  },
  'cabello': {
    english: 'hair health',
    alternatives: ['hair growth', 'hair strength'],
    category: 'hair'
  },
  'pelo': {
    english: 'hair health',
    alternatives: ['hair growth', 'hair strength'],
    category: 'hair'
  },
  'alopecia': {
    english: 'alopecia',
    alternatives: ['hair loss', 'baldness'],
    category: 'hair'
  },
  'calvicie': {
    english: 'baldness',
    alternatives: ['hair loss', 'alopecia'],
    category: 'hair'
  },

  // ========== PIEL / SKIN ==========
  'piel hidratada': {
    english: 'skin hydration',
    alternatives: ['skin moisture', 'dry skin treatment'],
    category: 'skin'
  },
  'hidratacion de la piel': {
    english: 'skin hydration',
    alternatives: ['skin moisture', 'moisturizing'],
    category: 'skin'
  },
  'piel seca': {
    english: 'dry skin',
    alternatives: ['skin dryness', 'xerosis'],
    category: 'skin'
  },
  'arrugas': {
    english: 'wrinkles',
    alternatives: ['anti-aging', 'skin aging', 'fine lines'],
    category: 'skin'
  },
  'envejecimiento': {
    english: 'aging',
    alternatives: ['anti-aging', 'age-related decline'],
    category: 'skin'
  },
  'anti-envejecimiento': {
    english: 'anti-aging',
    alternatives: ['aging prevention', 'longevity'],
    category: 'skin'
  },
  'acne': {
    english: 'acne',
    alternatives: ['pimples', 'acne vulgaris'],
    category: 'skin'
  },
  'espinillas': {
    english: 'acne',
    alternatives: ['pimples', 'blackheads'],
    category: 'skin'
  },
  'manchas': {
    english: 'skin hyperpigmentation',
    alternatives: ['dark spots', 'age spots', 'melasma'],
    category: 'skin'
  },
  'cicatrices': {
    english: 'scars',
    alternatives: ['scar healing', 'wound healing'],
    category: 'skin'
  },
  'piel': {
    english: 'skin health',
    alternatives: ['skin condition', 'dermatological health'],
    category: 'skin'
  },

  // ========== ENERGÍA / ENERGY ==========
  'cansancio': {
    english: 'fatigue',
    alternatives: ['tiredness', 'exhaustion', 'low energy'],
    category: 'energy'
  },
  'fatiga': {
    english: 'fatigue',
    alternatives: ['tiredness', 'exhaustion'],
    category: 'energy'
  },
  'energia': {
    english: 'energy',
    alternatives: ['vitality', 'stamina', 'endurance'],
    category: 'energy'
  },
  'energía': {
    english: 'energy',
    alternatives: ['vitality', 'stamina'],
    category: 'energy'
  },
  'falta de energia': {
    english: 'low energy',
    alternatives: ['fatigue', 'tiredness', 'lethargy'],
    category: 'energy'
  },
  'agotamiento': {
    english: 'exhaustion',
    alternatives: ['burnout', 'fatigue', 'depletion'],
    category: 'energy'
  },
  'resistencia': {
    english: 'endurance',
    alternatives: ['stamina', 'physical performance'],
    category: 'energy'
  },

  // ========== SUEÑO / SLEEP ==========
  'sueño': {
    english: 'sleep',
    alternatives: ['sleep quality', 'insomnia'],
    category: 'sleep'
  },
  'dormir': {
    english: 'sleep',
    alternatives: ['sleep quality', 'falling asleep'],
    category: 'sleep'
  },
  'insomnio': {
    english: 'insomnia',
    alternatives: ['sleep disorders', 'sleeplessness'],
    category: 'sleep'
  },
  'calidad del sueño': {
    english: 'sleep quality',
    alternatives: ['sleep improvement', 'better sleep'],
    category: 'sleep'
  },
  'conciliar el sueño': {
    english: 'falling asleep',
    alternatives: ['sleep onset', 'sleep initiation'],
    category: 'sleep'
  },
  'descanso': {
    english: 'rest',
    alternatives: ['recovery', 'sleep quality'],
    category: 'sleep'
  },

  // ========== COGNITIVO / COGNITIVE ==========
  'memoria': {
    english: 'memory',
    alternatives: ['cognitive function', 'recall', 'concentration', 'focus'],
    category: 'cognitive'
  },
  'concentracion': {
    english: 'concentration',
    alternatives: ['focus', 'attention', 'cognitive performance', 'memory'],
    category: 'cognitive'
  },
  'concentración': {
    english: 'concentration',
    alternatives: ['focus', 'attention', 'memory'],
    category: 'cognitive'
  },
  'atención': {
    english: 'attention',
    alternatives: ['concentration', 'focus', 'cognitive function'],
    category: 'cognitive'
  },
  'atencion': {
    english: 'attention',
    alternatives: ['concentration', 'focus'],
    category: 'cognitive'
  },
  'enfoque': {
    english: 'focus',
    alternatives: ['concentration', 'attention', 'mental clarity'],
    category: 'cognitive'
  },
  'claridad mental': {
    english: 'mental clarity',
    alternatives: ['cognitive clarity', 'clear thinking'],
    category: 'cognitive'
  },
  'niebla mental': {
    english: 'brain fog',
    alternatives: ['mental fog', 'cognitive impairment'],
    category: 'cognitive'
  },
  'cerebro': {
    english: 'brain health',
    alternatives: ['cognitive function', 'neuroprotection'],
    category: 'cognitive'
  },
  'cognitivo': {
    english: 'cognitive function',
    alternatives: ['mental performance', 'brain health'],
    category: 'cognitive'
  },
  'aprendizaje': {
    english: 'learning',
    alternatives: ['memory formation', 'cognitive enhancement'],
    category: 'cognitive'
  },

  // ========== ESTADO DE ÁNIMO / MOOD ==========
  'ansiedad': {
    english: 'anxiety',
    alternatives: ['stress', 'nervousness', 'worry'],
    category: 'mood'
  },
  'estres': {
    english: 'stress',
    alternatives: ['anxiety', 'tension', 'cortisol'],
    category: 'mood'
  },
  'estrés': {
    english: 'stress',
    alternatives: ['anxiety', 'tension'],
    category: 'mood'
  },
  'depresion': {
    english: 'depression',
    alternatives: ['mood disorders', 'low mood', 'sadness'],
    category: 'mood'
  },
  'depresión': {
    english: 'depression',
    alternatives: ['mood disorders', 'low mood'],
    category: 'mood'
  },
  'estado de animo': {
    english: 'mood',
    alternatives: ['emotional well-being', 'mental health'],
    category: 'mood'
  },
  'animo': {
    english: 'mood',
    alternatives: ['emotional state', 'well-being'],
    category: 'mood'
  },
  'ánimo': {
    english: 'mood',
    alternatives: ['emotional state'],
    category: 'mood'
  },
  'tristeza': {
    english: 'sadness',
    alternatives: ['depression', 'low mood'],
    category: 'mood'
  },
  'nerviosismo': {
    english: 'nervousness',
    alternatives: ['anxiety', 'tension'],
    category: 'mood'
  },

  // ========== MÚSCULO / MUSCLE ==========
  'musculo': {
    english: 'muscle',
    alternatives: ['muscle growth', 'muscle mass', 'hypertrophy'],
    category: 'muscle'
  },
  'músculo': {
    english: 'muscle',
    alternatives: ['muscle growth', 'muscle mass'],
    category: 'muscle'
  },
  'masa muscular': {
    english: 'muscle mass',
    alternatives: ['muscle growth', 'lean mass', 'hypertrophy'],
    category: 'muscle'
  },
  'ganar musculo': {
    english: 'muscle gain',
    alternatives: ['muscle growth', 'hypertrophy', 'muscle building'],
    category: 'muscle'
  },
  'crecimiento muscular': {
    english: 'muscle growth',
    alternatives: ['hypertrophy', 'muscle building'],
    category: 'muscle'
  },
  'fuerza': {
    english: 'strength',
    alternatives: ['muscle strength', 'power', 'force'],
    category: 'muscle'
  },
  'rendimiento': {
    english: 'performance',
    alternatives: ['athletic performance', 'exercise performance'],
    category: 'muscle'
  },
  'recuperacion muscular': {
    english: 'muscle recovery',
    alternatives: ['recovery', 'muscle repair', 'post-exercise recovery'],
    category: 'muscle'
  },

  // ========== INMUNIDAD / IMMUNE ==========
  'inmunidad': {
    english: 'immunity',
    alternatives: ['immune system', 'immune function'],
    category: 'immune'
  },
  'sistema inmune': {
    english: 'immune system',
    alternatives: ['immunity', 'immune function'],
    category: 'immune'
  },
  'defensas': {
    english: 'immune defenses',
    alternatives: ['immunity', 'immune system'],
    category: 'immune'
  },
  'resfriado': {
    english: 'common cold',
    alternatives: ['cold prevention', 'upper respiratory infection'],
    category: 'immune'
  },
  'gripe': {
    english: 'flu',
    alternatives: ['influenza', 'viral infection'],
    category: 'immune'
  },
  'infecciones': {
    english: 'infections',
    alternatives: ['infection prevention', 'antimicrobial'],
    category: 'immune'
  },

  // ========== DIGESTIVO / DIGESTIVE ==========
  'digestion': {
    english: 'digestion',
    alternatives: ['digestive health', 'gut health'],
    category: 'digestive'
  },
  'digestión': {
    english: 'digestion',
    alternatives: ['digestive health'],
    category: 'digestive'
  },
  'estomago': {
    english: 'stomach',
    alternatives: ['gastric health', 'digestive health'],
    category: 'digestive'
  },
  'estómago': {
    english: 'stomach',
    alternatives: ['gastric health'],
    category: 'digestive'
  },
  'intestino': {
    english: 'gut',
    alternatives: ['intestinal health', 'bowel health'],
    category: 'digestive'
  },
  'flora intestinal': {
    english: 'gut microbiome',
    alternatives: ['intestinal flora', 'gut bacteria', 'microbiota'],
    category: 'digestive'
  },
  'estreñimiento': {
    english: 'constipation',
    alternatives: ['bowel movement', 'regularity'],
    category: 'digestive'
  },
  'diarrea': {
    english: 'diarrhea',
    alternatives: ['loose stools', 'bowel disorder'],
    category: 'digestive'
  },
  'hinchazón': {
    english: 'bloating',
    alternatives: ['abdominal bloating', 'gas'],
    category: 'digestive'
  },
  'gases': {
    english: 'gas',
    alternatives: ['flatulence', 'bloating'],
    category: 'digestive'
  },

  // ========== ARTICULACIONES / JOINTS ==========
  'articulaciones': {
    english: 'joints',
    alternatives: ['joint health', 'joint pain'],
    category: 'joint'
  },
  'dolor articular': {
    english: 'joint pain',
    alternatives: ['arthritis', 'joint inflammation'],
    category: 'joint'
  },
  'artritis': {
    english: 'arthritis',
    alternatives: ['joint inflammation', 'osteoarthritis'],
    category: 'joint'
  },
  'inflamacion': {
    english: 'inflammation',
    alternatives: ['inflammatory response', 'swelling'],
    category: 'joint'
  },
  'inflamación': {
    english: 'inflammation',
    alternatives: ['inflammatory response'],
    category: 'joint'
  },
  'dolor': {
    english: 'pain',
    alternatives: ['pain relief', 'analgesia'],
    category: 'general'
  },
  'huesos': {
    english: 'bones',
    alternatives: ['bone health', 'bone density'],
    category: 'joint'
  },

  // ========== CARDIOVASCULAR / HEART ==========
  'cardiovascular': {
    english: 'cardiovascular',
    alternatives: ['heart health', 'blood pressure', 'cholesterol'],
    category: 'general'
  },
  'corazon': {
    english: 'heart health',
    alternatives: ['cardiovascular', 'cardiac health'],
    category: 'general'
  },
  'corazón': {
    english: 'heart health',
    alternatives: ['cardiovascular', 'cardiac function'],
    category: 'general'
  },
  'tension arterial': {
    english: 'blood pressure',
    alternatives: ['hypertension', 'cardiovascular health'],
    category: 'general'
  },
  'presion arterial': {
    english: 'blood pressure',
    alternatives: ['hypertension'],
    category: 'general'
  },
  'presión arterial': {
    english: 'blood pressure',
    alternatives: ['hypertension', 'cardiovascular'],
    category: 'general'
  },
  'colesterol': {
    english: 'cholesterol',
    alternatives: ['lipid profile', 'blood cholesterol'],
    category: 'general'
  },

  // ========== METABOLISMO / METABOLISM ==========
  'metabolismo': {
    english: 'metabolism',
    alternatives: ['metabolic rate', 'metabolic health'],
    category: 'general'
  },
  'metabolismo lento': {
    english: 'slow metabolism',
    alternatives: ['metabolic rate', 'energy expenditure'],
    category: 'energy'
  },
  'peso': {
    english: 'weight',
    alternatives: ['weight management', 'body weight'],
    category: 'general'
  },
  'perdida de peso': {
    english: 'weight loss',
    alternatives: ['fat loss', 'body composition'],
    category: 'general'
  },
  'pérdida de peso': {
    english: 'weight loss',
    alternatives: ['fat loss', 'obesity management'],
    category: 'general'
  },
  'grasa': {
    english: 'fat loss',
    alternatives: ['weight loss', 'body composition'],
    category: 'general'
  },
  'glucosa': {
    english: 'blood sugar',
    alternatives: ['glucose', 'glycemic control'],
    category: 'general'
  },
  'azucar en sangre': {
    english: 'blood sugar',
    alternatives: ['glucose', 'glycemic'],
    category: 'general'
  },
  'diabetes': {
    english: 'diabetes',
    alternatives: ['blood sugar', 'glucose control'],
    category: 'general'
  },
  'insulin': {
    english: 'insulin',
    alternatives: ['insulin resistance', 'blood sugar'],
    category: 'general'
  },
  'insulina': {
    english: 'insulin',
    alternatives: ['insulin resistance', 'glucose'],
    category: 'general'
  },

  // ========== GENERALES / GENERAL ==========
  'salud': {
    english: 'health',
    alternatives: ['wellness', 'well-being'],
    category: 'general'
  },
  'bienestar': {
    english: 'well-being',
    alternatives: ['wellness', 'health'],
    category: 'general'
  },
  'vitalidad': {
    english: 'vitality',
    alternatives: ['energy', 'vigor'],
    category: 'general'
  },
  'longevidad': {
    english: 'longevity',
    alternatives: ['lifespan', 'healthy aging'],
    category: 'general'
  },
};

/**
 * Simple Levenshtein distance calculator
 * Used for fuzzy matching (typos, spelling variations)
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
 * Find fuzzy match for a benefit query
 * Returns the best match if distance is within threshold
 */
function findFuzzyBenefitMatch(query: string): { key: string; distance: number } | null {
  const lowercased = query.toLowerCase().trim();
  const threshold = Math.max(2, Math.floor(lowercased.length * 0.2)); // 20% error tolerance

  let bestMatch: { key: string; distance: number } | null = null;

  for (const key of Object.keys(BENEFIT_MAP)) {
    const distance = levenshteinDistance(lowercased, key);

    if (distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { key, distance };
      }
    }
  }

  return bestMatch;
}

/**
 * Normalize a benefit query from Spanish to English
 *
 * @param query - User's benefit query in Spanish (e.g., "crecimiento de cabello")
 * @returns Normalized benefit with English term and alternatives
 *
 * @example
 * ```typescript
 * normalizeBenefit("crecimiento de cabello")
 * // Returns: { normalized: "hair growth", alternatives: ["hair regrowth", ...], confidence: 1.0 }
 *
 * normalizeBenefit("cansancio")
 * // Returns: { normalized: "fatigue", alternatives: ["tiredness", ...], confidence: 1.0 }
 *
 * normalizeBenefit("creciminto") // typo
 * // Returns: { normalized: "hair growth", alternatives: [...], confidence: 0.8 }
 * ```
 */
export function normalizeBenefit(query: string): NormalizedBenefit {
  const lowercased = query.toLowerCase().trim();

  // 1. Exact match
  const exactMatch = BENEFIT_MAP[lowercased];
  if (exactMatch) {
    return {
      original: query,
      normalized: exactMatch.english,
      alternatives: exactMatch.alternatives,
      confidence: 1.0,
      category: exactMatch.category,
    };
  }

  // 2. Fuzzy match (handle typos)
  const fuzzyMatch = findFuzzyBenefitMatch(lowercased);
  if (fuzzyMatch) {
    const benefit = BENEFIT_MAP[fuzzyMatch.key];
    // Confidence decreases with distance: distance 1 = 0.9, distance 2 = 0.8, etc.
    const confidence = Math.max(0.5, 1.0 - (fuzzyMatch.distance * 0.1));

    console.log(`[Benefit Normalization] Fuzzy match: "${query}" → "${fuzzyMatch.key}" (distance: ${fuzzyMatch.distance}, confidence: ${confidence})`);

    return {
      original: query,
      normalized: benefit.english,
      alternatives: benefit.alternatives,
      confidence,
      category: benefit.category,
    };
  }

  // 3. Partial match (query contains a known benefit)
  for (const [key, benefit] of Object.entries(BENEFIT_MAP)) {
    if (lowercased.includes(key) || key.includes(lowercased)) {
      console.log(`[Benefit Normalization] Partial match: "${query}" contains "${key}"`);
      return {
        original: query,
        normalized: benefit.english,
        alternatives: benefit.alternatives,
        confidence: 0.7,
        category: benefit.category,
      };
    }
  }

  // 4. No match - return original query with low confidence
  console.log(`[Benefit Normalization] No match found for: "${query}"`);
  return {
    original: query,
    normalized: query, // Keep original
    alternatives: [],
    confidence: 0.3,
    category: 'general',
  };
}

/**
 * Check if a benefit normalization exists
 */
export function hasBenefitNormalization(query: string): boolean {
  const normalized = normalizeBenefit(query);
  return normalized.confidence >= 0.7;
}

/**
 * Get all supported benefits (for autocomplete/suggestions)
 */
export function getAllSupportedBenefits(): Array<{ spanish: string; english: string; category: string }> {
  return Object.entries(BENEFIT_MAP).map(([spanish, data]) => ({
    spanish,
    english: data.english,
    category: data.category,
  }));
}
