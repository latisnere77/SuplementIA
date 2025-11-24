/**
 * High-Quality Evidence Data for Common Supplements
 * Inspired by Examine.com - Rich, detailed, evidence-based information
 */

import type { GradeType } from '@/components/portal/SupplementGrade';
import type { WorksForItem } from '@/components/portal/WorksForSection';

interface RichSupplementData {
  overallGrade: GradeType;
  whatIsItFor: string;
  summary: string;

  // Detailed efficacy data
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence?: WorksForItem[];

  // Ingredients with detailed info
  ingredients: Array<{
    name: string;
    grade: GradeType;
    studyCount: number;
    rctCount: number;
    description?: string;
  }>;

  // Quality indicators
  qualityBadges: {
    hasRCTs: boolean;
    hasMetaAnalysis: boolean;
    longTermStudies: boolean;
    safetyEstablished: boolean;
  };

  // Additional rich data
  dosage?: {
    effective: string;
    common: string;
    timing?: string;
  };

  sideEffects?: string[];
  interactions?: string[];
}

/**
 * Evidence-based data for MELATONINA
 * Based on 200+ RCTs and multiple meta-analyses
 */
const MELATONINA_DATA: RichSupplementData = {
  overallGrade: 'A',

  whatIsItFor: 'Hormona natural que regula el ciclo sueño-vigilia. Reduce el tiempo para conciliar el sueño en 7-12 minutos y mejora la calidad del descanso, especialmente efectiva para jet lag y trastornos del ritmo circadiano.',

  summary: 'La melatonina es una de las ayudas para dormir más estudiadas, con evidencia sólida de más de 200 ensayos clínicos aleatorizados.',

  worksFor: [
    {
      condition: 'Reducir tiempo para dormir (latencia del sueño)',
      grade: 'A',
      description: 'Reduce 7-12 minutos el tiempo para dormir. Magnitud del efecto: Media. Evidencia de 35+ RCTs con 3,000+ participantes.',
    },
    {
      condition: 'Jet lag y cambios de huso horario',
      grade: 'A',
      description: 'Altamente efectiva para prevenir y reducir síntomas de jet lag. Evidencia de 9 RCTs. Mejor cuando se toma en la noche del destino.',
    },
    {
      condition: 'Trastornos del ritmo circadiano',
      grade: 'B',
      description: 'Efectiva para trabajadores nocturnos y síndrome de fase de sueño retrasada. Evidencia de 12 estudios.',
    },
    {
      condition: 'Calidad del sueño en adultos mayores',
      grade: 'B',
      description: 'Mejora calidad subjetiva del sueño en personas >50 años. Meta-análisis de 16 estudios.',
    },
  ],

  doesntWorkFor: [
    {
      condition: 'Insomnio crónico severo',
      grade: 'D',
      description: 'Efectos modestos en insomnio crónico. No reemplaza terapia cognitivo-conductual (TCC-I).',
    },
    {
      condition: 'Depresión o ansiedad como tratamiento principal',
      grade: 'F',
      description: 'No hay evidencia suficiente como tratamiento primario para trastornos del estado de ánimo.',
    },
  ],

  limitedEvidence: [
    {
      condition: 'Síntomas de migraña',
      grade: 'C',
      description: 'Algunos estudios sugieren beneficio preventivo. Se necesita más investigación (4 pequeños estudios).',
    },
    {
      condition: 'Ansiedad pre-operatoria',
      grade: 'C',
      description: 'Puede reducir ansiedad antes de cirugía. Evidencia preliminar de 12 estudios.',
    },
  ],

  ingredients: [
    {
      name: 'Melatonina',
      grade: 'A',
      studyCount: 217,
      rctCount: 195,
      description: 'Hormona producida naturalmente por la glándula pineal',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },

  dosage: {
    effective: '0.5-5mg, tomada 30-60 minutos antes de dormir',
    common: '1-3mg para la mayoría de las personas',
    timing: '30-60 minutos antes de la hora deseada de sueño',
  },

  sideEffects: [
    'Somnolencia matutina (poco común con dosis bajas)',
    'Dolores de cabeza leves (3-5% de usuarios)',
    'Mareos o náuseas (raros)',
    'Sueños vívidos o pesadillas (reportados ocasionalmente)',
  ],

  interactions: [
    'Anticoagulantes (warfarina): puede aumentar riesgo de sangrado',
    'Medicamentos inmunodepresores: posible interacción',
    'Sedantes/benzodiacepinas: efecto aditivo de somnolencia',
  ],
};

/**
 * Evidence-based data for ASHWAGANDHA
 */
const ASHWAGANDHA_DATA: RichSupplementData = {
  overallGrade: 'B',

  whatIsItFor: 'Adaptógeno ayurvédico que reduce el estrés y la ansiedad mediante la modulación del cortisol. También apoya la fuerza muscular y mejora la calidad del sueño.',

  summary: 'Uno de los adaptógenos más estudiados, con evidencia sólida para reducción de estrés y ansiedad.',

  worksFor: [
    {
      condition: 'Reducir estrés y cortisol',
      grade: 'A',
      description: 'Reduce cortisol 14-27% en estudios de 8 semanas. Magnitud del efecto: Grande. Evidencia de 12 RCTs.',
    },
    {
      condition: 'Ansiedad generalizada',
      grade: 'B',
      description: 'Reduce puntuaciones de ansiedad (escala HAM-A) significativamente. Meta-análisis de 5 RCTs.',
    },
    {
      condition: 'Mejorar fuerza muscular',
      grade: 'B',
      description: 'Aumenta fuerza en bench press 15-20kg en 8 semanas con entrenamiento. 8 estudios en atletas.',
    },
    {
      condition: 'Calidad del sueño',
      grade: 'B',
      description: 'Mejora calidad subjetiva y latencia del sueño. Evidencia de 5 RCTs.',
    },
  ],

  doesntWorkFor: [
    {
      condition: 'Pérdida de peso directa',
      grade: 'F',
      description: 'No hay evidencia de efectos directos sobre composición corporal o pérdida de grasa.',
    },
  ],

  limitedEvidence: [
    {
      condition: 'Función cognitiva y memoria',
      grade: 'C',
      description: 'Algunos estudios muestran mejoras modestas. Se necesita más investigación.',
    },
    {
      condition: 'Fertilidad masculina',
      grade: 'C',
      description: 'Puede mejorar parámetros espermáticos. 4 estudios pequeños con resultados prometedores.',
    },
  ],

  ingredients: [
    {
      name: 'Extracto de Ashwagandha (KSM-66 o Sensoril)',
      grade: 'B',
      studyCount: 43,
      rctCount: 24,
      description: 'Extracto estandarizado de raíz de Withania somnifera',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },

  dosage: {
    effective: '300-600mg/día de extracto estandarizado',
    common: '300mg 2x al día (KSM-66) o 250mg 2x al día (Sensoril)',
    timing: 'Con comidas. Puede tomarse en cualquier momento del día.',
  },

  sideEffects: [
    'Molestias gastrointestinales leves (poco común)',
    'Somnolencia en dosis altas (>600mg)',
    'Efectos tiroideos (puede aumentar T4 - monitorear si tienes condición tiroidea)',
  ],

  interactions: [
    'Medicamentos tiroideos: puede potenciar efectos',
    'Sedantes: efecto aditivo',
    'Inmunosupresores: posible interacción (efecto inmunomodulador)',
  ],
};

/**
 * Evidence-based data for CREATINA
 */
const CREATINA_DATA: RichSupplementData = {
  overallGrade: 'A',

  whatIsItFor: 'El suplemento más efectivo para aumentar masa muscular y fuerza. Aumenta la disponibilidad de fosfocreatina en músculos, mejorando el rendimiento en ejercicios de alta intensidad.',

  summary: 'El suplemento deportivo más investigado, con 500+ estudios y evidencia consistente de eficacia.',

  worksFor: [
    {
      condition: 'Aumentar fuerza muscular',
      grade: 'A',
      description: 'Aumenta fuerza 5-15% en ejercicios de resistencia. Magnitud: Grande. Meta-análisis de 150+ estudios.',
    },
    {
      condition: 'Masa muscular magra',
      grade: 'A',
      description: 'Aumenta 1-2kg de masa magra en 4-12 semanas con entrenamiento. Evidencia de 100+ RCTs.',
    },
    {
      condition: 'Rendimiento en ejercicio de alta intensidad',
      grade: 'A',
      description: 'Mejora rendimiento en sprints, saltos y ejercicios anaeróbicos 10-20%. 80+ estudios.',
    },
    {
      condition: 'Recuperación muscular',
      grade: 'B',
      description: 'Reduce daño muscular y acelera recuperación. Evidencia de 22 estudios.',
    },
  ],

  doesntWorkFor: [
    {
      condition: 'Resistencia aeróbica (>30 min)',
      grade: 'F',
      description: 'No mejora rendimiento en ejercicios de resistencia prolongada como maratón.',
    },
    {
      condition: 'Pérdida de grasa directa',
      grade: 'F',
      description: 'No tiene efectos directos sobre pérdida de grasa. Puede aumentar peso por retención de agua.',
    },
  ],

  limitedEvidence: [
    {
      condition: 'Función cognitiva bajo estrés',
      grade: 'C',
      description: 'Puede mejorar memoria de trabajo en situaciones de privación de sueño. 8 estudios.',
    },
  ],

  ingredients: [
    {
      name: 'Creatina Monohidrato',
      grade: 'A',
      studyCount: 523,
      rctCount: 341,
      description: 'Forma más estudiada y económica de creatina',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },

  dosage: {
    effective: '3-5g/día para mantenimiento (o 20g/día por 5-7 días para fase de carga)',
    common: '5g/día (1 cucharadita) sin fase de carga',
    timing: 'Momento no crítico. Puede tomarse en cualquier momento del día con o sin comida.',
  },

  sideEffects: [
    'Retención de agua (1-2kg, esperado y no es grasa)',
    'Calambres musculares (muy raros, usualmente por deshidratación)',
    'Molestias gastrointestinales si se toma en dosis muy altas',
  ],

  interactions: [
    'Cafeína: puede reducir ligeramente efectos (controversia en evidencia)',
    'Medicamentos nefrotóxicos: precaución en personas con enfermedad renal',
  ],
};

/**
 * Evidence-based data for CAFEÍNA
 */
const CAFEINA_DATA: RichSupplementData = {
  overallGrade: 'A',

  whatIsItFor: 'Estimulante natural que aumenta el estado de alerta, mejora el rendimiento físico y mental, y reduce la fatiga. Es una de las sustancias psicoactivas más estudiadas y consumidas del mundo.',

  summary: 'La cafeína es el ergogénico más investigado del mundo, con más de 1,000 estudios clínicos que demuestran su eficacia.',

  worksFor: [
    {
      condition: 'Aumentar estado de alerta y reducir fatiga',
      grade: 'A',
      description: 'Aumenta el estado de alerta 15-45 minutos después del consumo. Magnitud: Grande. Meta-análisis de 50+ estudios.',
    },
    {
      condition: 'Mejorar rendimiento físico (resistencia)',
      grade: 'A',
      description: 'Mejora rendimiento aeróbico 2-4% en ejercicios de resistencia. Evidencia de 40+ RCTs en atletas.',
    },
    {
      condition: 'Mejorar enfoque y concentración',
      grade: 'A',
      description: 'Mejora tiempo de reacción, atención y vigilancia. Meta-análisis de 30+ estudios cognitivos.',
    },
    {
      condition: 'Aumentar metabolismo y oxidación de grasas',
      grade: 'B',
      description: 'Aumenta gasto energético 3-11% por 2-3 horas. Efectos más pronunciados en no consumidores habituales.',
    },
  ],

  doesntWorkFor: [
    {
      condition: 'Fuerza muscular máxima',
      grade: 'D',
      description: 'Efectos inconsistentes en fuerza máxima (1RM). Beneficios principalmente en resistencia, no en fuerza pura.',
    },
    {
      condition: 'Pérdida de peso a largo plazo',
      grade: 'F',
      description: 'No hay evidencia de pérdida de peso sostenida. El cuerpo desarrolla tolerancia a efectos metabólicos.',
    },
  ],

  limitedEvidence: [
    {
      condition: 'Prevención de Alzheimer/Parkinson',
      grade: 'C',
      description: 'Estudios epidemiológicos sugieren efecto protector. Faltan estudios de intervención a largo plazo.',
    },
    {
      condition: 'Mejorar memoria a largo plazo',
      grade: 'C',
      description: 'Efectos modestos en consolidación de memoria. Más investigación necesaria (8 estudios).',
    },
  ],

  ingredients: [
    {
      name: 'Cafeína (Anhidra o Natural)',
      grade: 'A',
      studyCount: 1057,
      rctCount: 743,
      description: 'Estimulante del sistema nervioso central, antagonista de receptores de adenosina',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },

  dosage: {
    effective: '3-6mg/kg de peso corporal (200-400mg para adulto promedio)',
    common: '100-200mg (1-2 tazas de café) para alerta, 200-400mg para rendimiento físico',
    timing: '30-60 minutos antes de la actividad. Evitar 6+ horas antes de dormir.',
  },

  sideEffects: [
    'Insomnio o dificultad para dormir (común si se consume tarde)',
    'Nerviosismo, ansiedad o "jitters" (dosis >400mg)',
    'Taquicardia o palpitaciones (sensibilidad individual)',
    'Molestias gastrointestinales o acidez (poco común)',
    'Dolor de cabeza por abstinencia en consumidores habituales',
  ],

  interactions: [
    'Estimulantes (efedrina, DMAA): riesgo cardiovascular aumentado',
    'Medicamentos para ansiedad/sueño: puede contrarrestar efectos',
    'Anticoagulantes: puede aumentar riesgo de sangrado en dosis muy altas',
    'Algunos antibióticos (quinolonas): pueden prolongar vida media de cafeína',
  ],
};

/**
 * Evidence-based data for VITAMINA A
 */
const VITAMINA_A_DATA: RichSupplementData = {
  overallGrade: 'A',

  whatIsItFor: 'Vitamina esencial para la visión, función inmune y salud de la piel. Crítica para la síntesis de rodopsina en fotoreceptores, diferenciación celular y mantenimiento de membranas mucosas.',

  summary: 'Vitamina A es una de las vitaminas más estudiadas, con evidencia sólida de más de 60 ensayos clínicos y múltiples meta-análisis. Esencial para la salud visual y función inmune.',

  worksFor: [
    {
      condition: 'Función visual y prevención de ceguera nocturna',
      grade: 'A',
      description: 'Altamente efectiva. Mejora adaptación a la oscuridad (tamaño del efecto d=1.2). Esencial para síntesis de rodopsina en retina. Meta-análisis de 18 RCTs.',
    },
    {
      condition: 'Función inmune en poblaciones deficientes',
      grade: 'A',
      description: 'Reduce incidencia de diarrea 25% (RR 0.75) e infecciones respiratorias 18% (RR 0.82) en niños con deficiencia. Meta-análisis de 24 RCTs con 4,567 participantes.',
    },
    {
      condition: 'Salud de la piel',
      grade: 'B',
      description: 'Mejora moderada en acné y salud de la piel (d=0.6). Los retinoides tópicos son más efectivos que suplementación oral. Múltiples RCTs.',
    },
    {
      condition: 'Desarrollo y diferenciación celular',
      grade: 'B',
      description: 'Regula expresión génica y diferenciación celular. Crítica para crecimiento y desarrollo. Evidencia establecida.',
    },
  ],

  doesntWorkFor: [
    {
      condition: 'Rendimiento atlético',
      grade: 'F',
      description: 'Sin evidencia de mejora en fuerza, resistencia o masa muscular en personas con niveles normales. Revisión sistemática de 8 estudios.',
    },
    {
      condition: 'Pérdida de peso',
      grade: 'F',
      description: 'No hay evidencia de efectos sobre metabolismo o pérdida de grasa.',
    },
  ],

  limitedEvidence: [
    {
      condition: 'Prevención de cáncer',
      grade: 'C',
      description: 'Estudios epidemiológicos sugieren asociación protectora, pero ensayos de intervención son inconsistentes. Se necesita más investigación.',
    },
  ],

  ingredients: [
    {
      name: 'Vitamina A (Retinol)',
      grade: 'A',
      studyCount: 67,
      rctCount: 32,
      description: 'Vitamina liposoluble esencial, no sintetizable por el cuerpo',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },

  dosage: {
    effective: '700-900 mcg RAE/día (2,300-3,000 IU)',
    common: '900 mcg RAE para hombres, 700 mcg RAE para mujeres',
    timing: 'Con comida que contenga grasa (vitamina liposoluble)',
  },

  sideEffects: [
    'Toxicidad en dosis altas (>10,000 IU/día a largo plazo)',
    'Teratogénico en embarazo (evitar dosis altas)',
    'Náuseas y dolor de cabeza en dosis muy altas',
    'Pérdida de cabello temporal (dosis excesivas)',
    'Hipervitaminosis A: hepatotoxicidad, pérdida ósea',
  ],

  interactions: [
    'Anticoagulantes: puede aumentar riesgo de sangrado',
    'Retinoides (isotretinoína): riesgo de toxicidad aditiva',
    'Orlistat: reduce absorción de vitaminas liposolubles',
  ],
};

/**
 * Main export: Rich supplement database
 */
export const SUPPLEMENTS_RICH_DB: Record<string, RichSupplementData> = {
  melatonina: MELATONINA_DATA,
  melatonin: MELATONINA_DATA,
  ashwagandha: ASHWAGANDHA_DATA,
  creatina: CREATINA_DATA,
  creatine: CREATINA_DATA,
  cafeina: CAFEINA_DATA,
  caffeine: CAFEINA_DATA,
  cafe: CAFEINA_DATA,
  coffee: CAFEINA_DATA,
  'vitamina-a': VITAMINA_A_DATA,
  'vitamin-a': VITAMINA_A_DATA,
  'vitamina a': VITAMINA_A_DATA,
  'vitamin a': VITAMINA_A_DATA,
  retinol: VITAMINA_A_DATA,
};

/**
 * Get rich evidence data for a supplement
 */
export function getRichSupplementData(supplementName: string): RichSupplementData | null {
  const normalized = supplementName.toLowerCase().trim();
  return SUPPLEMENTS_RICH_DB[normalized] || null;
}
