/**
 * Centralized Knowledge Base
 * 
 * This file serves as the single source of truth for curated health categories 
 * and their associated supplements, complete with evidence grades and summaries.
 * This structured approach allows for a much richer and more guided user experience
 * compared to relying solely on free-form vector search for broad category pages.
 * 
 * Inspired by the structured, evidence-based approach of Examine.com.
 */

// --- Type Definitions ---

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SupplementEvidence {
  name: string;
  evidenceGrade: EvidenceGrade;
  summary: string;
  slug: string; // e.g., 'melatonin'
}

export interface HealthCategory {
  slug: string; // e.g., 'sleep'
  name: string;
  description: string;
  supplements: SupplementEvidence[];
}

export type KnowledgeBaseLocale = 'en' | 'es';

export interface LocalizedSupplementEvidence extends SupplementEvidence {
  canonicalQuery: string;
}

// --- Data ---

const KNOWLEDGE_BASE: HealthCategory[] = [
  {
    slug: 'sleep',
    name: 'Sueño',
    description: 'Suplementos que pueden ayudar a mejorar la calidad y la duración del sueño, facilitando el descanso nocturno.',
    supplements: [
      {
        name: 'Melatonina',
        evidenceGrade: 'A',
        summary: 'Hormona que regula el ciclo sueño-vigilia. Muy efectiva para trastornos del ritmo circadiano como el jet lag o el trabajo por turnos.',
        slug: 'melatonin',
      },
      {
        name: 'Magnesio',
        evidenceGrade: 'B',
        summary: 'Mineral que puede mejorar la calidad del sueño al regular neurotransmisores. Especialmente útil en personas con deficiencia.',
        slug: 'magnesium',
      },
      {
        name: 'Lavanda',
        evidenceGrade: 'B',
        summary: 'Su aroma ha demostrado tener efectos calmantes que pueden reducir la ansiedad y promover un sueño más profundo.',
        slug: 'lavender',
      },
      {
        name: 'Valeriana',
        evidenceGrade: 'C',
        summary: 'Hierba popular para el insomnio, aunque la evidencia científica sobre su efectividad es mixta y no concluyente.',
        slug: 'valerian',
      },
    ],
  },
  {
    slug: 'energy',
    name: 'Energía y Fatiga',
    description: 'Compuestos que pueden ayudar a aumentar los niveles de energía, combatir la fatiga y mejorar el rendimiento físico y mental.',
    supplements: [
      {
        name: 'Cafeína',
        evidenceGrade: 'A',
        summary: 'Estimulante bien conocido que mejora el estado de alerta y la concentración al bloquear la adenosina en el cerebro.',
        slug: 'caffeine',
      },
      {
        name: 'Creatina',
        evidenceGrade: 'A',
        summary: 'Mejora la producción de energía en las células (ATP), aumentando la fuerza y el rendimiento en ejercicios de alta intensidad.',
        slug: 'creatine',
      },
      {
        name: 'Rhodiola Rosea',
        evidenceGrade: 'B',
        summary: 'Adaptógeno que ayuda al cuerpo a resistir el estrés físico y mental, reduciendo la sensación de fatiga.',
        slug: 'rhodiola-rosea',
      },
      {
        name: 'Vitamina B12',
        evidenceGrade: 'C',
        summary: 'Esencial para la producción de energía. La suplementación solo es efectiva para combatir la fatiga en personas con deficiencia.',
        slug: 'vitamin-b12',
      },
    ],
  },
  {
    slug: 'anxiety',
    name: 'Ansiedad y Estrés',
    description: 'Suplementos y hierbas que pueden ayudar a reducir los síntomas de la ansiedad y a mejorar la respuesta del cuerpo al estrés.',
    supplements: [
      {
        name: 'Ashwagandha',
        evidenceGrade: 'A',
        summary: 'Hierba adaptogénica con fuerte evidencia en la reducción de los niveles de cortisol y la percepción del estrés.',
        slug: 'ashwagandha',
      },
      {
        name: 'L-Teanina',
        evidenceGrade: 'B',
        summary: 'Aminoácido encontrado en el té verde que promueve la relajación sin causar somnolencia, mejorando el estado de alerta calmado.',
        slug: 'l-theanine',
      },
      {
        name: 'Manzanilla',
        evidenceGrade: 'C',
        summary: 'Tradicionalmente usada como calmante. Algunos estudios sugieren un efecto modesto en la reducción de la ansiedad leve.',
        slug: 'chamomile',
      },
    ],
  },
  {
    slug: 'muscle-gain',
    name: 'Ganancia de Músculo y Ejercicio',
    description: 'Desarrolla músculo, mejora la fuerza y aumenta el rendimiento físico.',
    supplements: [
      {
        name: 'Proteína de Suero',
        evidenceGrade: 'A',
        summary: 'Fundamental para la reparación y crecimiento muscular post-entrenamiento. Alta biodisponibilidad y perfil completo de aminoácidos.',
        slug: 'whey-protein',
      },
      {
        name: 'Creatina',
        evidenceGrade: 'A',
        summary: 'El suplemento más estudiado y efectivo para aumentar la fuerza, la potencia y la masa muscular.',
        slug: 'creatine',
      },
      {
        name: 'Beta-Alanina',
        evidenceGrade: 'B',
        summary: 'Aumenta los niveles de carnosina en los músculos, retrasando la fatiga muscular en ejercicios de alta intensidad.',
        slug: 'beta-alanine',
      },
    ],
  },
  {
    slug: 'cognitive-function',
    name: 'Memoria y Concentración',
    description: 'Mejora la función cognitiva, la memoria y la claridad mental.',
    supplements: [
      {
        name: 'Omega-3 (DHA)',
        evidenceGrade: 'A',
        summary: 'El DHA es un componente estructural clave del cerebro. Esencial para la función cognitiva y la salud neuronal.',
        slug: 'omega-3',
      },
      {
        name: 'Bacopa Monnieri',
        evidenceGrade: 'B',
        summary: 'Hierba adaptogénica utilizada en la medicina ayurvédica para mejorar la memoria y el procesamiento de la información.',
        slug: 'bacopa-monnieri',
      },
      {
        name: 'Ginkgo Biloba',
        evidenceGrade: 'C',
        summary: 'Puede mejorar el flujo sanguíneo al cerebro, pero la evidencia sobre una mejora cognitiva significativa es mixta.',
        slug: 'ginkgo-biloba',
      },
    ],
  },
  {
    slug: 'heart-health',
    name: 'Salud Cardíaca',
    description: 'Suplementos que apoyan la salud cardiovascular, la presión arterial y los niveles de colesterol.',
    supplements: [
      {
        name: 'Omega-3 (EPA/DHA)',
        evidenceGrade: 'A',
        summary: 'Reducen los triglicéridos, la presión arterial y la inflamación, siendo claves para la salud del corazón.',
        slug: 'omega-3',
      },
      {
        name: 'Coenzima Q10',
        evidenceGrade: 'B',
        summary: 'Antioxidante que mejora la producción de energía en las células del corazón y puede beneficiar a pacientes con insuficiencia cardíaca.',
        slug: 'coenzyme-q10',
      },
      {
        name: 'Ajo',
        evidenceGrade: 'B',
        summary: 'Demostrado que tiene efectos modestos pero significativos en la reducción de la presión arterial y el colesterol.',
        slug: 'garlic',
      },
    ],
  },
  {
    slug: 'joint-bone-health',
    name: 'Salud Articular y Ósea',
    description: 'Suplementos para fortalecer los huesos, mejorar la flexibilidad y aliviar el dolor articular.',
    supplements: [
      {
        name: 'Vitamina D',
        evidenceGrade: 'A',
        summary: 'Esencial para la absorción de calcio y la salud ósea. Su deficiencia está ligada a un mayor riesgo de osteoporosis.',
        slug: 'vitamin-d',
      },
      {
        name: 'Glucosamina',
        evidenceGrade: 'B',
        summary: 'Componente natural del cartílago. A menudo se usa para aliviar el dolor de la osteoartritis, con evidencia moderada de eficacia.',
        slug: 'glucosamine',
      },
      {
        name: 'Colágeno Hidrolizado',
        evidenceGrade: 'B',
        summary: 'Puede ayudar a reducir el dolor articular y mejorar la salud de la piel y los tejidos conectivos.',
        slug: 'hydrolyzed-collagen',
      },
    ],
  },
  {
    slug: 'gut-health',
    name: 'Salud Digestiva',
    description: 'Probióticos, enzimas y otros suplementos para una digestión saludable y un microbioma equilibrado.',
    supplements: [
      {
        name: 'Probióticos',
        evidenceGrade: 'A',
        summary: 'Microorganismos vivos que, en cantidades adecuadas, confieren un beneficio para la salud del huésped, especialmente para la diarrea y el SII.',
        slug: 'probiotics',
      },
      {
        name: 'Fibra (Psyllium)',
        evidenceGrade: 'A',
        summary: 'Muy eficaz para mejorar la regularidad intestinal y aliviar tanto el estreñimiento como la diarrea leve.',
        slug: 'fiber-psyllium',
      },
    ],
  },
  {
    slug: 'skin-hair-health',
    name: 'Salud de la Piel y Cabello',
    description: 'Nutrientes para una piel radiante, un cabello fuerte y uñas saludables.',
    supplements: [
      {
        name: 'Colágeno',
        evidenceGrade: 'B',
        summary: 'Mejora la elasticidad e hidratación de la piel, reduciendo la aparición de arrugas.',
        slug: 'collagen',
      },
      {
        name: 'Biotina (Vitamina B7)',
        evidenceGrade: 'C',
        summary: 'Popular para el cabello y las uñas, pero la suplementación solo ha demostrado ser efectiva en casos de deficiencia.',
        slug: 'biotin',
      },
    ],
  },
  {
    slug: 'immunity',
    name: 'Inmunidad',
    description: 'Vitaminas y hierbas para fortalecer el sistema inmunológico y prevenir enfermedades.',
    supplements: [
      {
        name: 'Vitamina C',
        evidenceGrade: 'B',
        summary: 'Antioxidante clave para la función inmune. Puede reducir la duración del resfriado común.',
        slug: 'vitamin-c',
      },
      {
        name: 'Zinc',
        evidenceGrade: 'B',
        summary: 'Mineral esencial para el desarrollo y la función de las células inmunitarias. Puede acortar la duración de los resfriados si se toma al inicio.',
        slug: 'zinc',
      },
      {
        name: 'Equinácea',
        evidenceGrade: 'C',
        summary: 'Hierba popular para prevenir resfriados, pero la evidencia científica es mixta y a menudo de baja calidad.',
        slug: 'echinacea',
      },
    ],
  },
  {
    slug: 'mens-health',
    name: 'Salud Masculina',
    description: 'Suplementos enfocados en la vitalidad, salud prostática y equilibrio hormonal masculino.',
    supplements: [
      {
        name: 'Saw Palmetto',
        evidenceGrade: 'B',
        summary: 'Utilizado comúnmente para aliviar los síntomas de la hiperplasia prostática benigna (HPB).',
        slug: 'saw-palmetto',
      },
      {
        name: 'Zinc',
        evidenceGrade: 'A',
        summary: 'Fundamental para la producción de testosterona y la salud reproductiva masculina.',
        slug: 'zinc',
      },
    ],
  },
  {
    slug: 'womens-health',
    name: 'Salud Femenina',
    description: 'Apoyo para el equilibrio hormonal, el ciclo menstrual y la salud ósea en mujeres.',
    supplements: [
      {
        name: 'Ácido Fólico (Folato)',
        evidenceGrade: 'A',
        summary: 'Crucial durante el embarazo para prevenir defectos del tubo neural en el feto.',
        slug: 'folic-acid',
      },
      {
        name: 'Hierro',
        evidenceGrade: 'A',
        summary: 'Importante para prevenir la anemia, especialmente en mujeres con menstruaciones abundantes.',
        slug: 'iron',
      },
      {
        name: 'Calcio',
        evidenceGrade: 'A',
        summary: 'Esencial para la salud ósea y la prevención de la osteoporosis, particularmente después de la menopausia.',
        slug: 'calcium',
      },
    ],
  },
  {
    slug: 'blood-sugar',
    name: 'Control de Glucosa',
    description: 'Suplementos que pueden apoyar el metabolismo de la glucosa, la sensibilidad a la insulina y hábitos de salud metabólica.',
    supplements: [
      {
        name: 'Berberina',
        evidenceGrade: 'B',
        summary: 'Alcaloide vegetal estudiado por sus efectos en glucosa, lípidos y sensibilidad a la insulina. Puede interactuar con medicamentos para diabetes.',
        slug: 'berberine',
      },
      {
        name: 'Fibra (Psyllium)',
        evidenceGrade: 'A',
        summary: 'Fibra soluble que puede reducir picos de glucosa postprandial y apoyar saciedad y salud digestiva.',
        slug: 'fiber-psyllium',
      },
      {
        name: 'Canela',
        evidenceGrade: 'C',
        summary: 'Puede tener efectos modestos en glucosa en algunos estudios, pero la evidencia es variable y depende del extracto usado.',
        slug: 'cinnamon',
      },
      {
        name: 'Magnesio',
        evidenceGrade: 'C',
        summary: 'Mineral relacionado con metabolismo de glucosa. La suplementación es más relevante cuando existe ingesta baja o deficiencia.',
        slug: 'magnesium',
      },
    ],
  },
  {
    slug: 'cholesterol-triglycerides',
    name: 'Colesterol y Triglicéridos',
    description: 'Opciones estudiadas para apoyar perfiles de lípidos, triglicéridos y salud cardiovascular junto con dieta y seguimiento médico.',
    supplements: [
      {
        name: 'Omega-3 (EPA/DHA)',
        evidenceGrade: 'A',
        summary: 'Ácidos grasos con evidencia sólida para reducir triglicéridos, especialmente en dosis clínicas y bajo supervisión profesional.',
        slug: 'omega-3',
      },
      {
        name: 'Fibra (Psyllium)',
        evidenceGrade: 'A',
        summary: 'Fibra soluble con evidencia para reducir colesterol LDL de forma modesta cuando se usa de manera constante.',
        slug: 'fiber-psyllium',
      },
      {
        name: 'Esteroles Vegetales',
        evidenceGrade: 'B',
        summary: 'Compuestos que pueden disminuir la absorción intestinal de colesterol y apoyar reducciones moderadas de LDL.',
        slug: 'plant-sterols',
      },
      {
        name: 'Ajo',
        evidenceGrade: 'B',
        summary: 'Puede tener efectos modestos sobre colesterol y presión arterial, con resultados variables según preparación y dosis.',
        slug: 'garlic',
      },
    ],
  },
  {
    slug: 'inflammation',
    name: 'Inflamación',
    description: 'Suplementos con investigación sobre marcadores inflamatorios, dolor y recuperación, sin sustituir diagnóstico o tratamiento médico.',
    supplements: [
      {
        name: 'Curcumina',
        evidenceGrade: 'B',
        summary: 'Compuesto activo de la cúrcuma estudiado por efectos antiinflamatorios. Su absorción mejora con formulaciones especializadas.',
        slug: 'curcumin',
      },
      {
        name: 'Omega-3 (EPA/DHA)',
        evidenceGrade: 'B',
        summary: 'Puede modular procesos inflamatorios y apoyar salud cardiovascular, aunque los efectos varían por dosis y contexto.',
        slug: 'omega-3',
      },
      {
        name: 'Jengibre',
        evidenceGrade: 'B',
        summary: 'Raíz con compuestos bioactivos estudiados para dolor, náusea e inflamación leve.',
        slug: 'ginger',
      },
      {
        name: 'Boswellia Serrata',
        evidenceGrade: 'B',
        summary: 'Extracto herbal investigado principalmente en dolor articular y osteoartritis, con evidencia moderada.',
        slug: 'boswellia-serrata',
      },
    ],
  },
  {
    slug: 'sports-performance',
    name: 'Rendimiento Deportivo',
    description: 'Suplementos con evidencia para fuerza, potencia, resistencia, recuperación y desempeño físico.',
    supplements: [
      {
        name: 'Creatina',
        evidenceGrade: 'A',
        summary: 'Uno de los suplementos más estudiados para fuerza, potencia y masa muscular, con buen perfil de seguridad en adultos sanos.',
        slug: 'creatine',
      },
      {
        name: 'Cafeína',
        evidenceGrade: 'A',
        summary: 'Estimulante con evidencia fuerte para mejorar alerta, potencia y resistencia en dosis adecuadas.',
        slug: 'caffeine',
      },
      {
        name: 'Beta-Alanina',
        evidenceGrade: 'B',
        summary: 'Puede mejorar rendimiento en esfuerzos intensos de corta a mediana duración al elevar carnosina muscular.',
        slug: 'beta-alanine',
      },
      {
        name: 'Citrulina',
        evidenceGrade: 'B',
        summary: 'Aminoácido precursor de óxido nítrico estudiado por posibles beneficios en flujo sanguíneo y rendimiento.',
        slug: 'citrulline',
      },
    ],
  },
  {
    slug: 'hormonal-health',
    name: 'Salud Hormonal',
    description: 'Nutrientes y compuestos relacionados con equilibrio hormonal, ciclo menstrual, metabolismo y bienestar general.',
    supplements: [
      {
        name: 'Inositol',
        evidenceGrade: 'B',
        summary: 'Compuesto estudiado en sensibilidad a la insulina y salud ovárica, especialmente en contextos como SOP.',
        slug: 'inositol',
      },
      {
        name: 'Vitamina D',
        evidenceGrade: 'C',
        summary: 'Hormona-secoesteroide esencial para huesos e inmunidad; su suplementación es más clara cuando hay deficiencia.',
        slug: 'vitamin-d',
      },
      {
        name: 'Zinc',
        evidenceGrade: 'B',
        summary: 'Mineral relevante para función reproductiva, inmunidad y síntesis hormonal, especialmente si la ingesta es baja.',
        slug: 'zinc',
      },
      {
        name: 'Magnesio',
        evidenceGrade: 'C',
        summary: 'Puede apoyar sueño, estrés y síntomas premenstruales en algunas personas, con mayor relevancia ante ingesta insuficiente.',
        slug: 'magnesium',
      },
    ],
  },
  {
    slug: 'migraine-headache',
    name: 'Migraña y Dolor de Cabeza',
    description: 'Suplementos investigados para prevención de migraña y apoyo neurológico, especialmente cuando existen deficiencias o desencadenantes claros.',
    supplements: [
      {
        name: 'Magnesio',
        evidenceGrade: 'B',
        summary: 'Mineral estudiado para prevención de migraña, especialmente en personas con niveles bajos o síntomas compatibles.',
        slug: 'magnesium',
      },
      {
        name: 'Riboflavina (Vitamina B2)',
        evidenceGrade: 'B',
        summary: 'Vitamina B investigada para reducir frecuencia de migraña en protocolos preventivos.',
        slug: 'riboflavin',
      },
      {
        name: 'Coenzima Q10',
        evidenceGrade: 'B',
        summary: 'Compuesto mitocondrial estudiado en prevención de migraña y energía celular.',
        slug: 'coenzyme-q10',
      },
      {
        name: 'Melatonina',
        evidenceGrade: 'C',
        summary: 'Puede ser útil cuando la migraña se relaciona con sueño irregular, aunque la evidencia es más limitada.',
        slug: 'melatonin',
      },
    ],
  },
  {
    slug: 'common-deficiencies',
    name: 'Deficiencias Comunes',
    description: 'Nutrientes que suelen evaluarse por laboratorio o contexto dietario y cuya suplementación depende de niveles, dieta y etapa de vida.',
    supplements: [
      {
        name: 'Vitamina D',
        evidenceGrade: 'A',
        summary: 'Deficiencia frecuente en muchas poblaciones. Es clave para salud ósea, inmunidad y función muscular.',
        slug: 'vitamin-d',
      },
      {
        name: 'Hierro',
        evidenceGrade: 'A',
        summary: 'Esencial para transportar oxígeno. La suplementación debe guiarse por análisis, especialmente ferritina y hemoglobina.',
        slug: 'iron',
      },
      {
        name: 'Vitamina B12',
        evidenceGrade: 'A',
        summary: 'Crítica para sistema nervioso y glóbulos rojos. Es especialmente relevante en dietas veganas, vegetarianas o malabsorción.',
        slug: 'vitamin-b12',
      },
      {
        name: 'Folato',
        evidenceGrade: 'A',
        summary: 'Importante para división celular y embarazo. Su uso es clave antes y durante etapas tempranas de gestación.',
        slug: 'folic-acid',
      },
      {
        name: 'Zinc',
        evidenceGrade: 'B',
        summary: 'Mineral importante para inmunidad, piel y función reproductiva. La suplementación depende de dieta y contexto clínico.',
        slug: 'zinc',
      },
    ],
  },
];

// --- Accessor Functions ---

/**
 * Retrieves all health categories.
 * @returns {HealthCategory[]} An array of all health categories.
 */
export const getAllCategories = (): HealthCategory[] => {
  return KNOWLEDGE_BASE;
};

/**
 * Retrieves a specific health category by its slug.
 * @param {string} slug - The slug of the category to find (e.g., 'sleep').
 * @returns {HealthCategory | undefined} The found category or undefined.
 */
export const getCategoryBySlug = (slug: string): HealthCategory | undefined => {
  return KNOWLEDGE_BASE.find(category => category.slug === slug);
};

const canonicalSupplementQueryBySlug: Record<string, string> = {
  ashwagandha: 'Ashwagandha',
  'bacopa-monnieri': 'Bacopa Monnieri',
  'berberine': 'Berberine',
  'beta-alanine': 'Beta-Alanine',
  biotin: 'Biotin',
  'boswellia-serrata': 'Boswellia Serrata',
  caffeine: 'Caffeine',
  calcium: 'Calcium',
  chamomile: 'Chamomile',
  cinnamon: 'Cinnamon',
  citrulline: 'Citrulline',
  'coenzyme-q10': 'Coenzyme Q10',
  collagen: 'Collagen',
  creatine: 'Creatine',
  curcumin: 'Curcumin',
  echinacea: 'Echinacea',
  'fiber-psyllium': 'Psyllium Fiber',
  'folic-acid': 'Folic Acid',
  garlic: 'Garlic',
  ginger: 'Ginger',
  'ginkgo-biloba': 'Ginkgo Biloba',
  glucosamine: 'Glucosamine',
  'hydrolyzed-collagen': 'Hydrolyzed Collagen',
  inositol: 'Inositol',
  iron: 'Iron',
  'l-theanine': 'L-Theanine',
  lavender: 'Lavender',
  magnesium: 'Magnesium',
  melatonin: 'Melatonin',
  'omega-3': 'Omega-3',
  'plant-sterols': 'Plant Sterols',
  probiotics: 'Probiotics',
  'rhodiola-rosea': 'Rhodiola Rosea',
  riboflavin: 'Riboflavin',
  'saw-palmetto': 'Saw Palmetto',
  valerian: 'Valerian',
  'vitamin-b12': 'Vitamin B12',
  'vitamin-c': 'Vitamin C',
  'vitamin-d': 'Vitamin D',
  'whey-protein': 'Whey Protein',
  zinc: 'Zinc',
};

const localizedSupplementText: Record<string, Partial<Record<KnowledgeBaseLocale, { name: string; summary: string }>>> = {
  'sleep:melatonin': {
    en: {
      name: 'Melatonin',
      summary: 'Hormone that regulates the sleep-wake cycle. Particularly effective for circadian rhythm problems such as jet lag or shift work.',
    },
  },
  'sleep:magnesium': {
    en: {
      name: 'Magnesium',
      summary: 'Mineral that may improve sleep quality by regulating neurotransmitters, especially in people with low intake or deficiency.',
    },
  },
  'sleep:lavender': {
    en: {
      name: 'Lavender',
      summary: 'Its aroma has shown calming effects that may reduce anxiety and support deeper sleep.',
    },
  },
  'sleep:valerian': {
    en: {
      name: 'Valerian',
      summary: 'Popular herb for insomnia, although scientific evidence for effectiveness is mixed and not conclusive.',
    },
  },
  'energy:caffeine': {
    en: {
      name: 'Caffeine',
      summary: 'Well-known stimulant that improves alertness and focus by blocking adenosine in the brain.',
    },
  },
  'energy:creatine': {
    en: {
      name: 'Creatine',
      summary: 'Improves cellular energy production (ATP), increasing strength and performance in high-intensity exercise.',
    },
  },
  'energy:rhodiola-rosea': {
    en: {
      name: 'Rhodiola Rosea',
      summary: 'Adaptogen that helps the body resist physical and mental stress, reducing perceived fatigue.',
    },
  },
  'energy:vitamin-b12': {
    en: {
      name: 'Vitamin B12',
      summary: 'Essential for energy production. Supplementation is mainly useful for fatigue when deficiency is present.',
    },
  },
  'anxiety:ashwagandha': {
    en: {
      name: 'Ashwagandha',
      summary: 'Adaptogenic herb with strong evidence for reducing cortisol levels and perceived stress.',
    },
  },
  'anxiety:l-theanine': {
    en: {
      name: 'L-Theanine',
      summary: 'Amino acid found in green tea that promotes relaxation without drowsiness and supports calm alertness.',
    },
  },
  'anxiety:chamomile': {
    en: {
      name: 'Chamomile',
      summary: 'Traditionally used as a calming herb. Some studies suggest a modest effect on mild anxiety.',
    },
  },
  'muscle-gain:whey-protein': {
    en: {
      name: 'Whey Protein',
      summary: 'Important for post-workout muscle repair and growth, with high bioavailability and a complete amino acid profile.',
    },
  },
  'muscle-gain:creatine': {
    en: {
      name: 'Creatine',
      summary: 'One of the most studied and effective supplements for increasing strength, power, and muscle mass.',
    },
  },
  'muscle-gain:beta-alanine': {
    en: {
      name: 'Beta-Alanine',
      summary: 'Raises muscle carnosine levels, delaying muscular fatigue during high-intensity exercise.',
    },
  },
  'cognitive-function:omega-3': {
    en: {
      name: 'Omega-3 (DHA)',
      summary: 'DHA is a key structural component of the brain and is essential for cognitive and neuronal health.',
    },
  },
  'cognitive-function:bacopa-monnieri': {
    en: {
      name: 'Bacopa Monnieri',
      summary: 'Adaptogenic herb used in Ayurvedic medicine to support memory and information processing.',
    },
  },
  'cognitive-function:ginkgo-biloba': {
    en: {
      name: 'Ginkgo Biloba',
      summary: 'May improve blood flow to the brain, but evidence for meaningful cognitive improvement is mixed.',
    },
  },
  'heart-health:omega-3': {
    en: {
      name: 'Omega-3 (EPA/DHA)',
      summary: 'Helps reduce triglycerides, blood pressure, and inflammation, making it relevant for heart health.',
    },
  },
  'heart-health:coenzyme-q10': {
    en: {
      name: 'Coenzyme Q10',
      summary: 'Antioxidant that improves energy production in heart cells and may benefit people with heart failure.',
    },
  },
  'heart-health:garlic': {
    en: {
      name: 'Garlic',
      summary: 'Shown to have modest but meaningful effects on blood pressure and cholesterol.',
    },
  },
  'joint-bone-health:vitamin-d': {
    en: {
      name: 'Vitamin D',
      summary: 'Essential for calcium absorption and bone health. Deficiency is linked to a higher risk of osteoporosis.',
    },
  },
  'joint-bone-health:glucosamine': {
    en: {
      name: 'Glucosamine',
      summary: 'Natural cartilage component often used for osteoarthritis pain, with moderate evidence of benefit.',
    },
  },
  'joint-bone-health:hydrolyzed-collagen': {
    en: {
      name: 'Hydrolyzed Collagen',
      summary: 'May help reduce joint pain and support skin and connective tissue health.',
    },
  },
  'gut-health:probiotics': {
    en: {
      name: 'Probiotics',
      summary: 'Live microorganisms that may provide health benefits in adequate amounts, especially for diarrhea and IBS.',
    },
  },
  'gut-health:fiber-psyllium': {
    en: {
      name: 'Psyllium Fiber',
      summary: 'Highly effective for bowel regularity and for relieving constipation and mild diarrhea.',
    },
  },
  'skin-hair-health:collagen': {
    en: {
      name: 'Collagen',
      summary: 'Improves skin elasticity and hydration, reducing the appearance of wrinkles.',
    },
  },
  'skin-hair-health:biotin': {
    en: {
      name: 'Biotin (Vitamin B7)',
      summary: 'Popular for hair and nails, but supplementation has only shown clear benefit in deficiency.',
    },
  },
  'immunity:vitamin-c': {
    en: {
      name: 'Vitamin C',
      summary: 'Key antioxidant for immune function. It may reduce the duration of the common cold.',
    },
  },
  'immunity:zinc': {
    en: {
      name: 'Zinc',
      summary: 'Essential mineral for immune cell development and function. It may shorten colds when taken early.',
    },
  },
  'immunity:echinacea': {
    en: {
      name: 'Echinacea',
      summary: 'Popular herb for cold prevention, but scientific evidence is mixed and often low quality.',
    },
  },
  'mens-health:saw-palmetto': {
    en: {
      name: 'Saw Palmetto',
      summary: 'Commonly used to relieve symptoms of benign prostatic hyperplasia (BPH).',
    },
  },
  'mens-health:zinc': {
    en: {
      name: 'Zinc',
      summary: 'Important for testosterone production and male reproductive health.',
    },
  },
  'womens-health:folic-acid': {
    en: {
      name: 'Folic Acid (Folate)',
      summary: 'Critical during pregnancy to help prevent neural tube defects in the fetus.',
    },
  },
  'womens-health:iron': {
    en: {
      name: 'Iron',
      summary: 'Important for preventing anemia, especially in women with heavy menstrual bleeding.',
    },
  },
  'womens-health:calcium': {
    en: {
      name: 'Calcium',
      summary: 'Essential for bone health and osteoporosis prevention, particularly after menopause.',
    },
  },
  'blood-sugar:berberine': {
    en: {
      name: 'Berberine',
      summary: 'Plant alkaloid studied for effects on glucose, lipids, and insulin sensitivity. It may interact with diabetes medications.',
    },
  },
  'blood-sugar:fiber-psyllium': {
    en: {
      name: 'Psyllium Fiber',
      summary: 'Soluble fiber that may reduce post-meal glucose spikes and support satiety and digestive health.',
    },
  },
  'blood-sugar:cinnamon': {
    en: {
      name: 'Cinnamon',
      summary: 'May have modest glucose effects in some studies, but evidence varies by extract and dose.',
    },
  },
  'blood-sugar:magnesium': {
    en: {
      name: 'Magnesium',
      summary: 'Mineral related to glucose metabolism. Supplementation is most relevant when intake is low or deficiency is present.',
    },
  },
  'cholesterol-triglycerides:omega-3': {
    en: {
      name: 'Omega-3 (EPA/DHA)',
      summary: 'Fatty acids with strong evidence for reducing triglycerides, especially at clinical doses and under professional supervision.',
    },
  },
  'cholesterol-triglycerides:fiber-psyllium': {
    en: {
      name: 'Psyllium Fiber',
      summary: 'Soluble fiber with evidence for modest LDL cholesterol reduction when used consistently.',
    },
  },
  'cholesterol-triglycerides:plant-sterols': {
    en: {
      name: 'Plant Sterols',
      summary: 'Compounds that can reduce intestinal cholesterol absorption and support moderate LDL reductions.',
    },
  },
  'cholesterol-triglycerides:garlic': {
    en: {
      name: 'Garlic',
      summary: 'May have modest effects on cholesterol and blood pressure, with results varying by preparation and dose.',
    },
  },
  'inflammation:curcumin': {
    en: {
      name: 'Curcumin',
      summary: 'Active turmeric compound studied for anti-inflammatory effects. Absorption improves with specialized formulations.',
    },
  },
  'inflammation:omega-3': {
    en: {
      name: 'Omega-3 (EPA/DHA)',
      summary: 'May modulate inflammatory processes and support cardiovascular health, though effects vary by dose and context.',
    },
  },
  'inflammation:ginger': {
    en: {
      name: 'Ginger',
      summary: 'Root with bioactive compounds studied for pain, nausea, and mild inflammation.',
    },
  },
  'inflammation:boswellia-serrata': {
    en: {
      name: 'Boswellia Serrata',
      summary: 'Herbal extract researched mainly for joint pain and osteoarthritis, with moderate evidence.',
    },
  },
  'sports-performance:creatine': {
    en: {
      name: 'Creatine',
      summary: 'One of the most studied supplements for strength, power, and muscle mass, with a good safety profile in healthy adults.',
    },
  },
  'sports-performance:caffeine': {
    en: {
      name: 'Caffeine',
      summary: 'Stimulant with strong evidence for improving alertness, power, and endurance at appropriate doses.',
    },
  },
  'sports-performance:beta-alanine': {
    en: {
      name: 'Beta-Alanine',
      summary: 'May improve performance during short-to-medium duration intense efforts by raising muscle carnosine.',
    },
  },
  'sports-performance:citrulline': {
    en: {
      name: 'Citrulline',
      summary: 'Nitric oxide precursor amino acid studied for possible benefits in blood flow and performance.',
    },
  },
  'hormonal-health:inositol': {
    en: {
      name: 'Inositol',
      summary: 'Compound studied for insulin sensitivity and ovarian health, especially in contexts such as PCOS.',
    },
  },
  'hormonal-health:vitamin-d': {
    en: {
      name: 'Vitamin D',
      summary: 'Secosteroid hormone essential for bones and immunity; supplementation is clearest when deficiency is present.',
    },
  },
  'hormonal-health:zinc': {
    en: {
      name: 'Zinc',
      summary: 'Mineral relevant to reproductive function, immunity, and hormone synthesis, especially when intake is low.',
    },
  },
  'hormonal-health:magnesium': {
    en: {
      name: 'Magnesium',
      summary: 'May support sleep, stress, and premenstrual symptoms in some people, with greater relevance when intake is insufficient.',
    },
  },
  'migraine-headache:magnesium': {
    en: {
      name: 'Magnesium',
      summary: 'Mineral studied for migraine prevention, especially in people with low levels or compatible symptoms.',
    },
  },
  'migraine-headache:riboflavin': {
    en: {
      name: 'Riboflavin (Vitamin B2)',
      summary: 'B vitamin researched for reducing migraine frequency in preventive protocols.',
    },
  },
  'migraine-headache:coenzyme-q10': {
    en: {
      name: 'Coenzyme Q10',
      summary: 'Mitochondrial compound studied in migraine prevention and cellular energy.',
    },
  },
  'migraine-headache:melatonin': {
    en: {
      name: 'Melatonin',
      summary: 'May help when migraine is related to irregular sleep, although evidence is more limited.',
    },
  },
  'common-deficiencies:vitamin-d': {
    en: {
      name: 'Vitamin D',
      summary: 'Common deficiency in many populations. Key for bone health, immunity, and muscle function.',
    },
  },
  'common-deficiencies:iron': {
    en: {
      name: 'Iron',
      summary: 'Essential for oxygen transport. Supplementation should be guided by labs, especially ferritin and hemoglobin.',
    },
  },
  'common-deficiencies:vitamin-b12': {
    en: {
      name: 'Vitamin B12',
      summary: 'Critical for the nervous system and red blood cells. Especially relevant in vegan or vegetarian diets and malabsorption.',
    },
  },
  'common-deficiencies:folic-acid': {
    en: {
      name: 'Folate',
      summary: 'Important for cell division and pregnancy. Use is key before and during early gestation.',
    },
  },
  'common-deficiencies:zinc': {
    en: {
      name: 'Zinc',
      summary: 'Important mineral for immunity, skin, and reproductive function. Supplementation depends on diet and clinical context.',
    },
  },
};

export function getCanonicalSupplementQuery(slug: string, fallbackName: string): string {
  return canonicalSupplementQueryBySlug[slug] || fallbackName;
}

export function getLocalizedSupplementEvidence(
  supplement: SupplementEvidence,
  categorySlug: string,
  locale: KnowledgeBaseLocale
): LocalizedSupplementEvidence {
  const localized = localizedSupplementText[`${categorySlug}:${supplement.slug}`]?.[locale];

  return {
    ...supplement,
    name: localized?.name || supplement.name,
    summary: localized?.summary || supplement.summary,
    canonicalQuery: getCanonicalSupplementQuery(supplement.slug, supplement.name),
  };
}

export function getLocalizedCategorySupplements(
  category: HealthCategory,
  locale: KnowledgeBaseLocale
): LocalizedSupplementEvidence[] {
  return category.supplements.map((supplement) =>
    getLocalizedSupplementEvidence(supplement, category.slug, locale)
  );
}
