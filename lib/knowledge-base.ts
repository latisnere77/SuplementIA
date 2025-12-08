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
