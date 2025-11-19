/**
 * Supplements Database for Autocomplete
 * Rich database of nutraceuticals, herbs, vitamins, minerals, and health conditions
 * Supports fuzzy search with Fuse.js
 */

export interface SupplementEntry {
  id: string;
  name: string;
  aliases: string[]; // Alternative names, common typos
  category: 'herb' | 'vitamin' | 'mineral' | 'amino-acid' | 'fatty-acid' | 'other' | 'condition';
  healthConditions?: string[]; // Related health conditions
  language: 'es' | 'en';
}

/**
 * Database of supplements, herbs, and health conditions
 * Includes common typos and variations for better fuzzy matching
 */
export const SUPPLEMENTS_DATABASE: SupplementEntry[] = [
  // ===== HIERBAS ADAPTÓGENAS (Español) =====
  {
    id: 'ashwagandha-es',
    name: 'Ashwagandha',
    aliases: ['ashwaghanda', 'ashvagandha', 'withania somnifera', 'ginseng indio'],
    category: 'herb',
    healthConditions: ['estrés', 'ansiedad', 'sueño', 'cortisol', 'energía'],
    language: 'es',
  },
  {
    id: 'rhodiola-es',
    name: 'Rhodiola',
    aliases: ['rhodiola rosea', 'rodiola', 'raíz dorada', 'raiz de oro'],
    category: 'herb',
    healthConditions: ['fatiga', 'energía', 'resistencia', 'estrés'],
    language: 'es',
  },
  {
    id: 'ginseng-es',
    name: 'Ginseng',
    aliases: ['ginseng coreano', 'panax ginseng', 'ginseng rojo'],
    category: 'herb',
    healthConditions: ['energía', 'cognición', 'memoria', 'inmunidad'],
    language: 'es',
  },
  {
    id: 'maca-es',
    name: 'Maca',
    aliases: ['maca peruana', 'lepidium meyenii'],
    category: 'herb',
    healthConditions: ['energía', 'libido', 'fertilidad', 'resistencia'],
    language: 'es',
  },
  {
    id: 'turmeric-es',
    name: 'Cúrcuma',
    aliases: ['curcuma', 'turmeric', 'curcumina'],
    category: 'herb',
    healthConditions: ['inflamación', 'articulaciones', 'digestión'],
    language: 'es',
  },

  // ===== HIERBAS PARA EL SUEÑO (Español) =====
  {
    id: 'melatonin-es',
    name: 'Melatonina',
    aliases: ['melatonina', 'hormona del sueño'],
    category: 'other',
    healthConditions: ['sueño', 'insomnio', 'jet lag', 'ritmo circadiano'],
    language: 'es',
  },
  {
    id: 'valerian-es',
    name: 'Valeriana',
    aliases: ['valerian', 'valeriana officinalis'],
    category: 'herb',
    healthConditions: ['sueño', 'ansiedad', 'relajación'],
    language: 'es',
  },
  {
    id: 'chamomile-es',
    name: 'Manzanilla',
    aliases: ['camomila', 'chamomile', 'té de manzanilla'],
    category: 'herb',
    healthConditions: ['sueño', 'digestión', 'relajación', 'ansiedad'],
    language: 'es',
  },

  // ===== VITAMINAS (Español) =====
  {
    id: 'vitamin-d-es',
    name: 'Vitamina D',
    aliases: ['vitamina d3', 'colecalciferol', 'vitamina del sol'],
    category: 'vitamin',
    healthConditions: ['huesos', 'inmunidad', 'ánimo', 'deficiencia vitamina d'],
    language: 'es',
  },
  {
    id: 'vitamin-c-es',
    name: 'Vitamina C',
    aliases: ['ácido ascórbico', 'acido ascorbico'],
    category: 'vitamin',
    healthConditions: ['inmunidad', 'antioxidante', 'colágeno', 'resfriado'],
    language: 'es',
  },
  {
    id: 'vitamin-b12-es',
    name: 'Vitamina B12',
    aliases: ['b12', 'cobalamina', 'cianocobalamina'],
    category: 'vitamin',
    healthConditions: ['energía', 'nervios', 'anemia', 'veganos'],
    language: 'es',
  },
  {
    id: 'vitamin-k2-es',
    name: 'Vitamina K2',
    aliases: ['k2', 'menaquinona'],
    category: 'vitamin',
    healthConditions: ['huesos', 'corazón', 'calcio'],
    language: 'es',
  },

  // ===== MINERALES (Español) =====
  {
    id: 'magnesium-es',
    name: 'Magnesio',
    aliases: ['magnesio', 'citrato de magnesio', 'glicinato de magnesio'],
    category: 'mineral',
    healthConditions: ['sueño', 'músculos', 'calambres', 'estrés', 'energía'],
    language: 'es',
  },
  {
    id: 'zinc-es',
    name: 'Zinc',
    aliases: ['zinc', 'picolinato de zinc'],
    category: 'mineral',
    healthConditions: ['inmunidad', 'testosterona', 'piel', 'acné'],
    language: 'es',
  },
  {
    id: 'iron-es',
    name: 'Hierro',
    aliases: ['hierro', 'sulfato ferroso', 'bisglicinato de hierro'],
    category: 'mineral',
    healthConditions: ['anemia', 'energía', 'fatiga', 'hemoglobina'],
    language: 'es',
  },
  {
    id: 'calcium-es',
    name: 'Calcio',
    aliases: ['calcio', 'carbonato de calcio'],
    category: 'mineral',
    healthConditions: ['huesos', 'osteoporosis', 'dientes'],
    language: 'es',
  },

  // ===== ÁCIDOS GRASOS (Español) =====
  {
    id: 'omega3-es',
    name: 'Omega-3',
    aliases: ['omega 3', 'aceite de pescado', 'epa', 'dha', 'fish oil'],
    category: 'fatty-acid',
    healthConditions: ['corazón', 'cerebro', 'inflamación', 'triglicéridos'],
    language: 'es',
  },
  {
    id: 'fish-oil-es',
    name: 'Aceite de Pescado',
    aliases: ['fish oil', 'omega-3', 'aceite de salmon'],
    category: 'fatty-acid',
    healthConditions: ['corazón', 'cerebro', 'colesterol'],
    language: 'es',
  },

  // ===== AMINOÁCIDOS Y OTROS (Español) =====
  {
    id: 'creatine-es',
    name: 'Creatina',
    aliases: ['creatina monohidrato', 'creatine'],
    category: 'amino-acid',
    healthConditions: ['músculo', 'fuerza', 'rendimiento', 'ejercicio'],
    language: 'es',
  },
  {
    id: 'protein-es',
    name: 'Proteína Whey',
    aliases: ['whey protein', 'proteina de suero', 'suero de leche'],
    category: 'amino-acid',
    healthConditions: ['músculo', 'recuperación', 'masa muscular'],
    language: 'es',
  },
  {
    id: 'collagen-es',
    name: 'Colágeno',
    aliases: ['colageno', 'collagen', 'colágeno hidrolizado'],
    category: 'other',
    healthConditions: ['piel', 'articulaciones', 'pelo', 'uñas'],
    language: 'es',
  },
  {
    id: 'cbd-es',
    name: 'CBD',
    aliases: ['cannabidiol', 'aceite de cbd', 'cbd oil'],
    category: 'other',
    healthConditions: ['dolor', 'ansiedad', 'inflamación', 'sueño'],
    language: 'es',
  },
  {
    id: 'probiotics-es',
    name: 'Probióticos',
    aliases: ['probioticos', 'flora intestinal', 'bacterias buenas'],
    category: 'other',
    healthConditions: ['digestión', 'intestino', 'inmunidad', 'microbiota'],
    language: 'es',
  },

  // ===== CONDICIONES DE SALUD (Español) =====
  {
    id: 'sleep-condition-es',
    name: 'Mejorar sueño',
    aliases: ['insomnio', 'dormir mejor', 'calidad del sueño'],
    category: 'condition',
    language: 'es',
  },
  {
    id: 'anxiety-condition-es',
    name: 'Reducir ansiedad',
    aliases: ['estrés', 'nervios', 'calma', 'relajación'],
    category: 'condition',
    language: 'es',
  },
  {
    id: 'energy-condition-es',
    name: 'Aumentar energía',
    aliases: ['fatiga', 'cansancio', 'vitalidad'],
    category: 'condition',
    language: 'es',
  },
  {
    id: 'muscle-condition-es',
    name: 'Ganar músculo',
    aliases: ['masa muscular', 'hipertrofia', 'bodybuilding'],
    category: 'condition',
    language: 'es',
  },
  {
    id: 'immunity-condition-es',
    name: 'Fortalecer inmunidad',
    aliases: ['defensas', 'sistema inmune', 'prevenir resfriados'],
    category: 'condition',
    language: 'es',
  },

  // ===== ADAPTOGENIC HERBS (English) =====
  {
    id: 'ashwagandha-en',
    name: 'Ashwagandha',
    aliases: ['ashwaghanda', 'ashvagandha', 'withania somnifera', 'indian ginseng'],
    category: 'herb',
    healthConditions: ['stress', 'anxiety', 'sleep', 'cortisol', 'energy'],
    language: 'en',
  },
  {
    id: 'rhodiola-en',
    name: 'Rhodiola',
    aliases: ['rhodiola rosea', 'golden root', 'arctic root'],
    category: 'herb',
    healthConditions: ['fatigue', 'energy', 'endurance', 'stress'],
    language: 'en',
  },
  {
    id: 'ginseng-en',
    name: 'Ginseng',
    aliases: ['korean ginseng', 'panax ginseng', 'red ginseng'],
    category: 'herb',
    healthConditions: ['energy', 'cognition', 'memory', 'immunity'],
    language: 'en',
  },
  {
    id: 'maca-en',
    name: 'Maca',
    aliases: ['peruvian maca', 'lepidium meyenii'],
    category: 'herb',
    healthConditions: ['energy', 'libido', 'fertility', 'endurance'],
    language: 'en',
  },
  {
    id: 'turmeric-en',
    name: 'Turmeric',
    aliases: ['curcumin', 'turmeric root'],
    category: 'herb',
    healthConditions: ['inflammation', 'joints', 'digestion'],
    language: 'en',
  },

  // ===== SLEEP HERBS (English) =====
  {
    id: 'melatonin-en',
    name: 'Melatonin',
    aliases: ['sleep hormone'],
    category: 'other',
    healthConditions: ['sleep', 'insomnia', 'jet lag', 'circadian rhythm'],
    language: 'en',
  },
  {
    id: 'valerian-en',
    name: 'Valerian',
    aliases: ['valerian root', 'valeriana officinalis'],
    category: 'herb',
    healthConditions: ['sleep', 'anxiety', 'relaxation'],
    language: 'en',
  },
  {
    id: 'chamomile-en',
    name: 'Chamomile',
    aliases: ['chamomile tea'],
    category: 'herb',
    healthConditions: ['sleep', 'digestion', 'relaxation', 'anxiety'],
    language: 'en',
  },

  // ===== VITAMINS (English) =====
  {
    id: 'vitamin-d-en',
    name: 'Vitamin D',
    aliases: ['vitamin d3', 'cholecalciferol', 'sunshine vitamin'],
    category: 'vitamin',
    healthConditions: ['bones', 'immunity', 'mood', 'vitamin d deficiency'],
    language: 'en',
  },
  {
    id: 'vitamin-c-en',
    name: 'Vitamin C',
    aliases: ['ascorbic acid'],
    category: 'vitamin',
    healthConditions: ['immunity', 'antioxidant', 'collagen', 'cold'],
    language: 'en',
  },
  {
    id: 'vitamin-b12-en',
    name: 'Vitamin B12',
    aliases: ['b12', 'cobalamin', 'cyanocobalamin'],
    category: 'vitamin',
    healthConditions: ['energy', 'nerves', 'anemia', 'vegans'],
    language: 'en',
  },
  {
    id: 'vitamin-k2-en',
    name: 'Vitamin K2',
    aliases: ['k2', 'menaquinone'],
    category: 'vitamin',
    healthConditions: ['bones', 'heart', 'calcium'],
    language: 'en',
  },

  // ===== MINERALS (English) =====
  {
    id: 'magnesium-en',
    name: 'Magnesium',
    aliases: ['magnesium citrate', 'magnesium glycinate'],
    category: 'mineral',
    healthConditions: ['sleep', 'muscles', 'cramps', 'stress', 'energy'],
    language: 'en',
  },
  {
    id: 'zinc-en',
    name: 'Zinc',
    aliases: ['zinc picolinate'],
    category: 'mineral',
    healthConditions: ['immunity', 'testosterone', 'skin', 'acne'],
    language: 'en',
  },
  {
    id: 'iron-en',
    name: 'Iron',
    aliases: ['ferrous sulfate', 'iron bisglycinate'],
    category: 'mineral',
    healthConditions: ['anemia', 'energy', 'fatigue', 'hemoglobin'],
    language: 'en',
  },
  {
    id: 'calcium-en',
    name: 'Calcium',
    aliases: ['calcium carbonate'],
    category: 'mineral',
    healthConditions: ['bones', 'osteoporosis', 'teeth'],
    language: 'en',
  },

  // ===== FATTY ACIDS (English) =====
  {
    id: 'omega3-en',
    name: 'Omega-3',
    aliases: ['omega 3', 'fish oil', 'epa', 'dha'],
    category: 'fatty-acid',
    healthConditions: ['heart', 'brain', 'inflammation', 'triglycerides'],
    language: 'en',
  },
  {
    id: 'fish-oil-en',
    name: 'Fish Oil',
    aliases: ['omega-3', 'salmon oil'],
    category: 'fatty-acid',
    healthConditions: ['heart', 'brain', 'cholesterol'],
    language: 'en',
  },

  // ===== AMINO ACIDS AND OTHERS (English) =====
  {
    id: 'creatine-en',
    name: 'Creatine',
    aliases: ['creatine monohydrate'],
    category: 'amino-acid',
    healthConditions: ['muscle', 'strength', 'performance', 'exercise'],
    language: 'en',
  },
  {
    id: 'protein-en',
    name: 'Whey Protein',
    aliases: ['whey', 'protein powder'],
    category: 'amino-acid',
    healthConditions: ['muscle', 'recovery', 'muscle mass'],
    language: 'en',
  },
  {
    id: 'collagen-en',
    name: 'Collagen',
    aliases: ['hydrolyzed collagen', 'collagen peptides'],
    category: 'other',
    healthConditions: ['skin', 'joints', 'hair', 'nails'],
    language: 'en',
  },
  {
    id: 'cbd-en',
    name: 'CBD',
    aliases: ['cannabidiol', 'cbd oil'],
    category: 'other',
    healthConditions: ['pain', 'anxiety', 'inflammation', 'sleep'],
    language: 'en',
  },
  {
    id: 'probiotics-en',
    name: 'Probiotics',
    aliases: ['gut flora', 'good bacteria'],
    category: 'other',
    healthConditions: ['digestion', 'gut', 'immunity', 'microbiome'],
    language: 'en',
  },

  // ===== HEALTH CONDITIONS (English) =====
  {
    id: 'sleep-condition-en',
    name: 'Improve sleep',
    aliases: ['insomnia', 'better sleep', 'sleep quality'],
    category: 'condition',
    language: 'en',
  },
  {
    id: 'anxiety-condition-en',
    name: 'Reduce anxiety',
    aliases: ['stress', 'nervousness', 'calm', 'relaxation'],
    category: 'condition',
    language: 'en',
  },
  {
    id: 'energy-condition-en',
    name: 'Boost energy',
    aliases: ['fatigue', 'tiredness', 'vitality'],
    category: 'condition',
    language: 'en',
  },
  {
    id: 'muscle-condition-en',
    name: 'Build muscle',
    aliases: ['muscle mass', 'hypertrophy', 'bodybuilding'],
    category: 'condition',
    language: 'en',
  },
  {
    id: 'immunity-condition-en',
    name: 'Boost immunity',
    aliases: ['immune system', 'prevent colds', 'defenses'],
    category: 'condition',
    language: 'en',
  },
];

/**
 * Get all supplements for a specific language
 */
export function getSupplementsByLanguage(language: 'es' | 'en'): SupplementEntry[] {
  return SUPPLEMENTS_DATABASE.filter(entry => entry.language === language);
}

/**
 * Get supplement by ID
 */
export function getSupplementById(id: string): SupplementEntry | undefined {
  return SUPPLEMENTS_DATABASE.find(entry => entry.id === id);
}
