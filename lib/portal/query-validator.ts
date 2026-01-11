/**
 * Query Validator - Sistema de Guardrails
 * Valida búsquedas para prevenir consultas inapropiadas
 *
 * Capas de validación:
 * 1. Lista negra - Términos explícitamente prohibidos
 * 2. Lista blanca - Categorías/suplementos válidos conocidos
 * 3. Patrones sospechosos - Detectar recetas, medicamentos, etc.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  severity?: 'warning' | 'error' | 'blocked';
}

/**
 * LISTA BLANCA - Términos válidos conocidos
 * Suplementos, vitaminas, minerales, categorías de salud
 */
const VALID_SUPPLEMENTS = new Set([
  // Suplementos populares
  'ashwagandha', 'cbd', 'cannabidiol', 'thc', 'tetrahydrocannabinol', 'cannabis', 'hemp', 'cáñamo', 'canamo',
  'melatonin', 'melatonina', 'creatine', 'creatina',
  'nad', 'nad+', 'nmn', 'nicotinamide', 'riboside', 'niacinamide',
  'protein', 'proteina', 'whey', 'collagen', 'colageno', 'caffeine', 'cafeina',
  'bcaa', 'glutamine', 'glutamina', 'beta-alanine', 'beta-alanina',
  'l-carnitine', 'l-carnitina', 'coq10', 'rhodiola', 'ginseng',
  'tribulus', 'maca', 'spirulina', 'chlorella', 'moringa',

  // Ácidos grasos
  'omega-3', 'omega-6', 'omega-9', 'fish-oil', 'aceite-de-pescado',
  'krill-oil', 'flaxseed', 'linaza', 'chia',

  // Vitaminas
  'vitamin-a', 'vitamina-a', 'vitamin-b', 'vitamina-b',
  'vitamin-b12', 'b12', 'vitamin-c', 'vitamina-c',
  'vitamin-d', 'vitamina-d', 'vitamin-d3', 'd3',
  'vitamin-e', 'vitamina-e', 'vitamin-k', 'vitamina-k',
  'biotin', 'biotina', 'niacin', 'niacina', 'riboflavin', 'riboflavina',
  'thiamine', 'tiamina', 'folate', 'folato', 'folic-acid', 'acido-folico',

  // Minerales
  'magnesium', 'magnesio', 'zinc', 'iron', 'hierro',
  'calcium', 'calcio', 'potassium', 'potasio',
  'selenium', 'selenio', 'chromium', 'cromo',
  'copper', 'cobre', 'manganese', 'manganeso',
  'iodine', 'yodo', 'phosphorus', 'fosforo',

  // Aminoácidos
  'l-theanine', 'l-teanina', 'taurine', 'taurina',
  'arginine', 'arginina', 'lysine', 'lisina',
  'leucine', 'leucina', 'isoleucine', 'isoleucina',
  'valine', 'valina', 'glycine', 'glicina',

  // Hierbas y extractos naturales
  'turmeric', 'curcuma', 'ginger', 'jengibre',
  'garlic', 'ajo', 'green-tea', 'te-verde',
  'black-pepper', 'pimienta-negra', 'cinnamon', 'canela',
  'valerian', 'valeriana', 'chamomile', 'manzanilla',
  'echinacea', 'milk-thistle', 'cardo-mariano', 'cardo-santo',
  'saw-palmetto', 'ginkgo-biloba', 'st-johns-wort',
  'elderberry', 'sauco', 'astragalus', 'astragalo',

  // Superfoods y frutas medicinales
  'camu-camu', 'camu', 'acai', 'goji', 'noni',
  'mangosteen', 'acerola', 'guarana', 'yerba-mate',

  // Probióticos y prebióticos
  'probiotics', 'probioticos', 'prebiotics', 'prebioticos',
  'lactobacillus', 'bifidobacterium', 'fiber', 'fibra',

  // Enzimas digestivas
  'digestive-enzymes', 'enzimas-digestivas',
  'bromelain', 'bromelina', 'papain', 'papaina',

  // Antioxidantes
  'resveratrol', 'quercetin', 'quercetina',
  'alpha-lipoic-acid', 'acido-alfa-lipoico',
  'glutathione', 'glutation', 'NAC', 'n-acetyl-cysteine',

  // Otros
  'colostrum', 'calostro', 'bee-pollen', 'polen-de-abeja',
  'royal-jelly', 'jalea-real', 'propolis', 'propoleo',
  'glucosamine', 'glucosamina', 'chondroitin', 'condroitina',
  'msm', 'hyaluronic-acid', 'acido-hialuronico',
]);

/**
 * CATEGORÍAS VÁLIDAS - Objetivos de salud legítimos
 */
const VALID_CATEGORIES = new Set([
  // Categorías principales
  'sleep', 'sueño', 'dormir', 'insomnia', 'insomnio',
  'cognitive', 'cognitivo', 'memory', 'memoria', 'focus', 'enfoque',
  'brain', 'cerebro', 'mental', 'concentration', 'concentracion',
  'muscle', 'musculo', 'muscle-gain', 'ganar-musculo',
  'strength', 'fuerza', 'performance', 'rendimiento',
  'energy', 'energia', 'fatigue', 'fatiga', 'vitality', 'vitalidad',
  'immune', 'inmune', 'immunity', 'inmunidad', 'defense', 'defensa',
  'heart', 'corazon', 'cardiovascular', 'cardio',
  'stress', 'estres', 'anxiety', 'ansiedad', 'calm', 'calma',
  'mood', 'animo', 'depression', 'depresion',
  'joint', 'articulaciones', 'joints', 'bones', 'huesos',
  'skin', 'piel', 'hair', 'cabello', 'nails', 'uñas',
  'digestion', 'digestion', 'gut', 'intestino',
  'weight', 'peso', 'fat-loss', 'perder-grasa',
  'metabolism', 'metabolismo', 'thyroid', 'tiroides',
  'testosterone', 'testosterona', 'hormone', 'hormona',
  'antioxidant', 'antioxidante', 'inflammation', 'inflamacion',
  'detox', 'desintoxicacion', 'liver', 'higado',
  'vision', 'vista', 'eyes', 'ojos',
  'fertility', 'fertilidad', 'libido',
  'recovery', 'recuperacion', 'workout', 'entrenamiento',
  'endurance', 'resistencia', 'stamina',
]);

/**
 * LISTA NEGRA - Términos explícitamente prohibidos
 */
const BLOCKED_TERMS = new Set([
  // Recetas de cocina
  'recipe', 'receta', 'pizza', 'pasta', 'cake', 'pastel',
  'bread', 'pan', 'cookie', 'galleta', 'dessert', 'postre',
  'salad', 'ensalada', 'soup', 'sopa', 'stew', 'guiso',

  // Medicamentos con receta (ejemplos)
  'antibiotic', 'antibiotico', 'penicillin', 'penicilina',
  'amoxicillin', 'amoxicilina', 'ibuprofen', 'ibuprofeno',
  'aspirin', 'aspirina', 'acetaminophen', 'paracetamol',
  'opioid', 'opioide', 'morphine', 'morfina',
  'oxycodone', 'hydrocodone', 'fentanyl',
  'adderall', 'ritalin', 'xanax', 'valium',
  'prozac', 'zoloft', 'lexapro',

  // Drogas ilegales (excluyendo cannabis/cannabinoides que tienen usos médicos legítimos)
  'cocaine', 'cocaina', 'heroin', 'heroina',
  'methamphetamine', 'metanfetamina', 'meth',
  'lsd', 'ecstasy', 'mdma', 'ketamine', 'ketamina',

  // Esteroides anabólicos
  'steroid', 'esteroide', 'anabolic', 'anabolico',
  'testosterone-injection', 'hgh', 'growth-hormone',
  'trenbolone', 'deca', 'dianabol', 'winstrol',

  // Términos ofensivos/inapropiados (lista básica)
  'bomb', 'bomba', 'weapon', 'arma',
  'poison', 'veneno', 'kill', 'matar',

  // Otro contenido no deseado
  'porn', 'porno', 'sex', 'sexo',
  'hack', 'hackear', 'crack',
]);

/**
 * PATRONES SOSPECHOSOS - Regex para detectar consultas problemáticas
 */
const SUSPICIOUS_PATTERNS = [
  /\b(how to|como) (make|hacer|create|crear) (bomb|bomba|weapon|arma)/i,
  /\b(recipe|receta) (for|para|de)\b/i,
  /\b(buy|comprar|purchase|adquirir) (drug|droga|illegal)/i,
  /\b(prescription|receta medica|rx)\b/i,
];

/**
 * Validar query de búsqueda
 */
export function validateSupplementQuery(query: string): ValidationResult {
  // Normalizar query
  const normalized = query.toLowerCase().trim();

  // 1. VALIDACIÓN BÁSICA
  if (!normalized || normalized.length < 2) {
    return {
      valid: false,
      error: 'La búsqueda es demasiado corta. Intenta con al menos 2 caracteres.',
      severity: 'warning',
    };
  }

  if (normalized.length > 100) {
    return {
      valid: false,
      error: 'La búsqueda es demasiado larga. Por favor, sé más específico.',
      severity: 'warning',
    };
  }

  // 2. LISTA NEGRA - Bloquear términos prohibidos
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (BLOCKED_TERMS.has(word)) {
      return {
        valid: false,
        error: 'Esta búsqueda no está permitida. Por favor, busca suplementos alimenticios válidos.',
        severity: 'blocked',
        suggestion: 'Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium, sleep, cognitive, muscle-gain',
      };
    }
  }

  // 3. PATRONES SOSPECHOSOS
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        valid: false,
        error: 'Esta búsqueda no parece estar relacionada con suplementos alimenticios.',
        severity: 'blocked',
        suggestion: 'Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium, sleep, cognitive, muscle-gain',
      };
    }
  }

  // 4. LISTA BLANCA - Validación positiva
  // Buscar coincidencias con suplementos/categorías conocidas
  let hasValidTerm = false;

  for (const word of words) {
    // Eliminar guiones y normalizar para búsqueda flexible
    const cleanWord = word.replace(/-/g, '');

    // Buscar coincidencias exactas
    if (VALID_SUPPLEMENTS.has(word) || VALID_CATEGORIES.has(word)) {
      hasValidTerm = true;
      break;
    }

    // Buscar coincidencias parciales (para typos menores)
    for (const validTerm of [...VALID_SUPPLEMENTS, ...VALID_CATEGORIES]) {
      if (validTerm.includes(cleanWord) || cleanWord.includes(validTerm.replace(/-/g, ''))) {
        if (validTerm.length >= 4 && cleanWord.length >= 4) { // Evitar falsos positivos
          hasValidTerm = true;
          break;
        }
      }
    }

    if (hasValidTerm) break;
  }

  // 5. VALIDACIÓN HEURÍSTICA - PERMISIVA: Confiar en sistema inteligente
  // Si no está en lista negra ni patrones sospechosos, y tiene longitud adecuada, permitirlo.
  // Esto cumple con el requerimiento de "funcionar para cualquier nuevo ingrediente".

  // Validar caracteres mínimos: al menos letras, números o símbolos comunes de suplementos (+, -)
  const hasValidChars = /[a-z0-9+]/i.test(normalized);

  if (!hasValidChars) {
    return {
      valid: false,
      error: 'La búsqueda contiene caracteres no válidos.',
      severity: 'warning',
    };
  }

  // ✅ QUERY VÁLIDA POR DEFECTO
  // Si pasó los filtros de seguridad (lista negra/patrones), asumimos que es una intención de búsqueda válida.
  return {
    valid: true,
  };

  // ✅ QUERY VÁLIDA
  return {
    valid: true,
  };
}

/**
 * Validar y sanitizar query (versión segura)
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .slice(0, 100) // Max 100 caracteres
    .replace(/[<>]/g, '') // Eliminar caracteres potencialmente peligrosos
    .replace(/\s+/g, ' '); // Normalizar espacios
}

/**
 * Obtener sugerencias de búsqueda válidas
 */
export function getSearchSuggestions(): string[] {
  return [
    'ashwagandha',
    'omega-3',
    'vitamin-d',
    'magnesium',
    'melatonin',
    'creatine',
    'cbd',
    'sleep',
    'cognitive',
    'muscle-gain',
    'energy',
    'immune',
    'stress',
  ];
}
