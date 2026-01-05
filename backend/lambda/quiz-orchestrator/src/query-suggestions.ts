/**
 * Query suggestions for ambiguous supplement searches
 * Helps users find specific variants when they search for general terms
 */

export interface QuerySuggestion {
  query: string;
  displayName: string;
  description?: string;
}

/**
 * Map of ambiguous queries to their specific variants
 */
const AMBIGUOUS_SUPPLEMENTS: Record<string, QuerySuggestion[]> = {
  // B Vitamins
  'vitamina b': [
    { query: 'vitamina b1', displayName: 'Vitamina B1 (Tiamina)', description: 'Para energía y función nerviosa' },
    { query: 'vitamina b2', displayName: 'Vitamina B2 (Riboflavina)', description: 'Para metabolismo energético' },
    { query: 'vitamina b6', displayName: 'Vitamina B6 (Piridoxina)', description: 'Para función cerebral y estado de ánimo' },
    { query: 'vitamina b12', displayName: 'Vitamina B12 (Cobalamina)', description: 'Para energía y función cognitiva' },
    { query: 'complejo b', displayName: 'Complejo B', description: 'Todas las vitaminas B juntas' },
  ],
  'vitamin b': [
    { query: 'vitamin b1', displayName: 'Vitamin B1 (Thiamine)', description: 'For energy and nerve function' },
    { query: 'vitamin b2', displayName: 'Vitamin B2 (Riboflavin)', description: 'For energy metabolism' },
    { query: 'vitamin b6', displayName: 'Vitamin B6 (Pyridoxine)', description: 'For brain function and mood' },
    { query: 'vitamin b12', displayName: 'Vitamin B12 (Cobalamin)', description: 'For energy and cognitive function' },
    { query: 'b complex', displayName: 'B Complex', description: 'All B vitamins together' },
  ],

  // Vitamin D
  'vitamina d': [
    { query: 'vitamina d3', displayName: 'Vitamina D3 (Colecalciferol)', description: 'Forma más efectiva' },
    { query: 'vitamina d2', displayName: 'Vitamina D2 (Ergocalciferol)', description: 'Forma vegetal' },
  ],
  'vitamin d': [
    { query: 'vitamin d3', displayName: 'Vitamin D3 (Cholecalciferol)', description: 'Most effective form' },
    { query: 'vitamin d2', displayName: 'Vitamin D2 (Ergocalciferol)', description: 'Plant-based form' },
  ],

  // Omega fatty acids
  'omega': [
    { query: 'omega 3', displayName: 'Omega-3', description: 'Para salud cardiovascular y cerebral' },
    { query: 'omega 6', displayName: 'Omega-6', description: 'Ácidos grasos esenciales' },
    { query: 'omega 9', displayName: 'Omega-9', description: 'Ácido oleico para salud general' },
  ],

  // Magnesium
  'magnesio': [
    { query: 'magnesio citrato', displayName: 'Magnesio Citrato', description: 'Buena absorción, puede tener efecto laxante' },
    { query: 'magnesio glicinato', displayName: 'Magnesio Glicinato', description: 'Mejor tolerado, para relajación' },
    { query: 'magnesio óxido', displayName: 'Magnesio Óxido', description: 'Económico, menor absorción' },
    { query: 'magnesio treonato', displayName: 'Magnesio L-Treonato', description: 'Para función cognitiva' },
  ],
  'magnesium': [
    { query: 'magnesium citrate', displayName: 'Magnesium Citrate', description: 'Good absorption, may have laxative effect' },
    { query: 'magnesium glycinate', displayName: 'Magnesium Glycinate', description: 'Best tolerated, for relaxation' },
    { query: 'magnesium oxide', displayName: 'Magnesium Oxide', description: 'Economical, lower absorption' },
    { query: 'magnesium threonate', displayName: 'Magnesium L-Threonate', description: 'For cognitive function' },
  ],

  // CoQ10
  'coq10': [
    { query: 'ubiquinone', displayName: 'Ubiquinona (CoQ10)', description: 'Forma oxidada estándar' },
    { query: 'ubiquinol', displayName: 'Ubiquinol (CoQ10)', description: 'Forma reducida, mejor absorción' },
  ],
  'coenzima q10': [
    { query: 'ubiquinone', displayName: 'Ubiquinona', description: 'Forma oxidada estándar' },
    { query: 'ubiquinol', displayName: 'Ubiquinol', description: 'Forma reducida, mejor absorción' },
  ],

  // Vitamin C
  'vitamina c': [
    { query: 'ácido ascórbico', displayName: 'Ácido Ascórbico', description: 'Forma estándar y económica' },
    { query: 'ascorbato de sodio', displayName: 'Ascorbato de Sodio', description: 'Menos ácido, mejor tolerado' },
    { query: 'vitamina c liposomal', displayName: 'Vitamina C Liposomal', description: 'Máxima absorción' },
    { query: 'ester-c', displayName: 'Ester-C', description: 'Liberación prolongada' },
  ],
  'vitamin c': [
    { query: 'ascorbic acid', displayName: 'Ascorbic Acid', description: 'Standard, economical form' },
    { query: 'sodium ascorbate', displayName: 'Sodium Ascorbate', description: 'Less acidic, better tolerated' },
    { query: 'liposomal vitamin c', displayName: 'Liposomal Vitamin C', description: 'Maximum absorption' },
    { query: 'ester-c', displayName: 'Ester-C', description: 'Extended release' },
  ],

  // Vitamin E
  'vitamina e': [
    { query: 'tocoferol', displayName: 'Tocoferol', description: 'Forma común alfa-tocoferol' },
    { query: 'tocotrienol', displayName: 'Tocotrienol', description: 'Forma más potente' },
    { query: 'tocoferoles mixtos', displayName: 'Tocoferoles Mixtos', description: 'Espectro completo' },
  ],
  'vitamin e': [
    { query: 'tocopherol', displayName: 'Tocopherol', description: 'Common alpha-tocopherol form' },
    { query: 'tocotrienol', displayName: 'Tocotrienol', description: 'More potent form' },
    { query: 'mixed tocopherols', displayName: 'Mixed Tocopherols', description: 'Full spectrum' },
  ],

  // Calcium
  'calcio': [
    { query: 'carbonato de calcio', displayName: 'Carbonato de Calcio', description: 'Económico, con alimentos' },
    { query: 'citrato de calcio', displayName: 'Citrato de Calcio', description: 'Mejor absorción, sin alimentos' },
    { query: 'malato de calcio', displayName: 'Malato de Calcio', description: 'Buena biodisponibilidad' },
  ],
  'calcium': [
    { query: 'calcium carbonate', displayName: 'Calcium Carbonate', description: 'Economical, take with food' },
    { query: 'calcium citrate', displayName: 'Calcium Citrate', description: 'Better absorption, without food' },
    { query: 'calcium malate', displayName: 'Calcium Malate', description: 'Good bioavailability' },
  ],

  // Zinc
  'zinc': [
    { query: 'picolinato de zinc', displayName: 'Picolinato de Zinc', description: 'Máxima absorción' },
    { query: 'gluconato de zinc', displayName: 'Gluconato de Zinc', description: 'Buena tolerancia' },
    { query: 'citrato de zinc', displayName: 'Citrato de Zinc', description: 'Balance absorción-tolerancia' },
    { query: 'óxido de zinc', displayName: 'Óxido de Zinc', description: 'Económico, menor absorción' },
  ],

  // Iron
  'hierro': [
    { query: 'sulfato ferroso', displayName: 'Sulfato Ferroso', description: 'Forma estándar y económica' },
    { query: 'bisglicinato de hierro', displayName: 'Bisglicinato de Hierro', description: 'Quelado, mejor tolerado' },
    { query: 'gluconato ferroso', displayName: 'Gluconato Ferroso', description: 'Suave para el estómago' },
    { query: 'hierro hemo', displayName: 'Hierro Hemo', description: 'De origen animal, alta absorción' },
  ],
  'iron': [
    { query: 'ferrous sulfate', displayName: 'Ferrous Sulfate', description: 'Standard, economical form' },
    { query: 'iron bisglycinate', displayName: 'Iron Bisglycinate', description: 'Chelated, better tolerated' },
    { query: 'ferrous gluconate', displayName: 'Ferrous Gluconate', description: 'Gentle on stomach' },
    { query: 'heme iron', displayName: 'Heme Iron', description: 'Animal-based, high absorption' },
  ],

  // Creatine
  'creatina': [
    { query: 'creatina monohidrato', displayName: 'Creatina Monohidrato', description: 'Más estudiada y efectiva' },
    { query: 'creatina hcl', displayName: 'Creatina HCL', description: 'Mejor solubilidad' },
    { query: 'creatina kre-alkalyn', displayName: 'Creatina Kre-Alkalyn', description: 'pH balanceado' },
  ],
  'creatine': [
    { query: 'creatine monohydrate', displayName: 'Creatine Monohydrate', description: 'Most studied and effective' },
    { query: 'creatine hcl', displayName: 'Creatine HCL', description: 'Better solubility' },
    { query: 'creatine kre-alkalyn', displayName: 'Creatine Kre-Alkalyn', description: 'pH buffered' },
  ],

  // Collagen
  'colágeno': [
    { query: 'colágeno tipo i', displayName: 'Colágeno Tipo I', description: 'Piel, huesos, tendones' },
    { query: 'colágeno tipo ii', displayName: 'Colágeno Tipo II', description: 'Articulaciones y cartílago' },
    { query: 'colágeno marino', displayName: 'Colágeno Marino', description: 'De pescado, tipo I' },
    { query: 'colágeno bovino', displayName: 'Colágeno Bovino', description: 'De res, tipos I y III' },
  ],
  'collagen': [
    { query: 'collagen type i', displayName: 'Collagen Type I', description: 'Skin, bones, tendons' },
    { query: 'collagen type ii', displayName: 'Collagen Type II', description: 'Joints and cartilage' },
    { query: 'marine collagen', displayName: 'Marine Collagen', description: 'From fish, type I' },
    { query: 'bovine collagen', displayName: 'Bovine Collagen', description: 'From beef, types I & III' },
  ],

  // Ashwagandha
  'ashwagandha': [
    { query: 'ashwagandha ksm-66', displayName: 'Ashwagandha KSM-66', description: 'Extracto de raíz, más estudiado' },
    { query: 'ashwagandha sensoril', displayName: 'Ashwagandha Sensoril', description: 'Raíz y hoja, para sueño' },
    { query: 'ashwagandha polvo', displayName: 'Ashwagandha en Polvo', description: 'Raíz completa, tradicional' },
  ],

  // Turmeric/Curcumin
  'cúrcuma': [
    { query: 'curcumina', displayName: 'Curcumina', description: 'Extracto concentrado' },
    { query: 'curcumina con piperina', displayName: 'Curcumina con Piperina', description: 'Mayor absorción' },
    { query: 'curcumina liposomal', displayName: 'Curcumina Liposomal', description: 'Máxima biodisponibilidad' },
  ],
  'turmeric': [
    { query: 'curcumin', displayName: 'Curcumin', description: 'Concentrated extract' },
    { query: 'curcumin with piperine', displayName: 'Curcumin with Piperine', description: 'Enhanced absorption' },
    { query: 'liposomal curcumin', displayName: 'Liposomal Curcumin', description: 'Maximum bioavailability' },
  ],

  // Protein
  'proteína': [
    { query: 'proteína de suero', displayName: 'Proteína de Suero (Whey)', description: 'Rápida absorción' },
    { query: 'caseína', displayName: 'Caseína', description: 'Liberación lenta' },
    { query: 'proteína vegetal', displayName: 'Proteína Vegetal', description: 'Plant-based' },
    { query: 'proteína de guisante', displayName: 'Proteína de Guisante', description: 'Vegana, hipoalergénica' },
  ],
  'protein': [
    { query: 'whey protein', displayName: 'Whey Protein', description: 'Fast absorption' },
    { query: 'casein', displayName: 'Casein', description: 'Slow release' },
    { query: 'plant protein', displayName: 'Plant Protein', description: 'Vegan options' },
    { query: 'pea protein', displayName: 'Pea Protein', description: 'Vegan, hypoallergenic' },
  ],
};

/**
 * Normalize query for matching (lowercase, trim)
 */
function normalizeForMatching(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Detect if a query is likely Spanish based on common patterns
 */
function isLikelySpanish(query: string): boolean {
  const spanishIndicators = [
    'vitamina',
    'proteína',
    'cúrcuma',
    'colágeno',
    'ácido',
    'calcio',
    'hierro',
    'creatina',
    'magnesio',
    'coenzima',
  ];

  const normalized = query.toLowerCase();
  return spanishIndicators.some(indicator => normalized.includes(indicator));
}

/**
 * Check if a query is ambiguous and return suggestions
 * Prioritizes Spanish matches when query appears to be in Spanish
 */
export function getQuerySuggestions(query: string): QuerySuggestion[] | null {
  const normalized = normalizeForMatching(query);

  // Check for exact match first
  if (AMBIGUOUS_SUPPLEMENTS[normalized]) {
    return AMBIGUOUS_SUPPLEMENTS[normalized];
  }

  // Determine likely language
  const likelySpanish = isLikelySpanish(normalized);

  // Build a list of potential matches with priority scores
  const matches: { key: string; suggestions: QuerySuggestion[]; score: number }[] = [];

  for (const [key, suggestions] of Object.entries(AMBIGUOUS_SUPPLEMENTS)) {
    let score = 0;

    // Exact match (highest priority)
    if (key === normalized) {
      return suggestions;
    }

    // Partial matches
    if (normalized.startsWith(key)) {
      score = key.length; // Longer matches get higher scores
    } else if (key.startsWith(normalized)) {
      score = normalized.length;
    }

    if (score > 0) {
      // Boost score if language matches expected language
      const keyIsSpanish = isLikelySpanish(key);
      if (likelySpanish === keyIsSpanish) {
        score += 100; // Language match bonus
      }

      matches.push({ key, suggestions, score });
    }
  }

  // Sort by score (highest first) and return best match
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return matches[0].suggestions;
  }

  return null;
}

/**
 * Check if a query is ambiguous
 */
export function isAmbiguousQuery(query: string): boolean {
  return getQuerySuggestions(query) !== null;
}
