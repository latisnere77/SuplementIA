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
