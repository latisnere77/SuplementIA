/**
 * Ejemplo de datos para el nuevo sistema de evidencia
 * Muestra cómo estructurar los datos para EvidenceAnalysisPanelNew
 */

import type { GradeType } from '@/components/portal/SupplementGrade';
import type { WorksForItem } from '@/components/portal/WorksForSection';

/**
 * Ejemplo: Ashwagandha
 */
export const ASHWAGANDHA_EVIDENCE = {
  overallGrade: 'A' as GradeType,
  whatIsItFor: 'Reduce el estrés, mejora la calidad del sueño y ayuda a controlar los niveles de cortisol de forma natural.',

  worksFor: [
    {
      condition: 'Reducir el estrés y la ansiedad',
      grade: 'A' as GradeType,
      description: 'Múltiples RCTs muestran reducción significativa del cortisol',
    },
    {
      condition: 'Mejorar la calidad del sueño',
      grade: 'B' as GradeType,
      description: 'Ayuda a conciliar el sueño más rápido y mejora la duración',
    },
    {
      condition: 'Aumentar la fuerza muscular',
      grade: 'B' as GradeType,
      description: 'Efectivo cuando se combina con entrenamiento de resistencia',
    },
  ] as WorksForItem[],

  doesntWorkFor: [
    {
      condition: 'Pérdida de peso directa',
      grade: 'F' as GradeType,
      description: 'No hay evidencia de efectos directos sobre la pérdida de peso',
    },
    {
      condition: 'Mejorar la memoria',
      grade: 'D' as GradeType,
      description: 'Evidencia insuficiente y resultados inconsistentes',
    },
  ] as WorksForItem[],

  limitedEvidence: [
    {
      condition: 'Mejorar la función sexual',
      grade: 'C' as GradeType,
      description: 'Algunos estudios prometedores pero necesitan más investigación',
    },
    {
      condition: 'Aumentar la testosterona',
      grade: 'C' as GradeType,
      description: 'Efectos modestos en hombres con niveles bajos',
    },
  ] as WorksForItem[],

  ingredients: [
    {
      name: 'Extracto de Raíz de Ashwagandha',
      grade: 'A' as GradeType,
      studyCount: 42,
      rctCount: 18,
      description: 'Extracto estandarizado con withanólidos',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: true,
    longTermStudies: true,
    safetyEstablished: true,
  },
};

/**
 * Ejemplo: CBD (Cannabidiol)
 */
export const CBD_EVIDENCE = {
  overallGrade: 'B' as GradeType,
  whatIsItFor: 'Ayuda a reducir el dolor crónico, la inflamación y puede mejorar la ansiedad en algunas personas.',

  worksFor: [
    {
      condition: 'Reducir el dolor crónico',
      grade: 'B' as GradeType,
      description: 'Efectivo para dolor neuropático y fibromialgia',
    },
    {
      condition: 'Reducir la ansiedad',
      grade: 'C' as GradeType,
      description: 'Resultados prometedores pero inconsistentes',
    },
  ] as WorksForItem[],

  doesntWorkFor: [
    {
      condition: 'Curar epilepsia severa',
      grade: 'B' as GradeType,
      description: 'Ayuda pero no cura. Solo ciertas formas aprobadas por FDA',
    },
    {
      condition: 'Tratar depresión',
      grade: 'E' as GradeType,
      description: 'Evidencia muy limitada e inconsistente',
    },
  ] as WorksForItem[],

  limitedEvidence: [
    {
      condition: 'Mejorar el sueño',
      grade: 'C' as GradeType,
      description: 'Algunos usuarios reportan mejora, falta evidencia fuerte',
    },
  ] as WorksForItem[],

  ingredients: [
    {
      name: 'Cannabidiol (CBD)',
      grade: 'B' as GradeType,
      studyCount: 156,
      rctCount: 34,
      description: 'Cannabinoide no psicoactivo',
    },
  ],

  qualityBadges: {
    hasRCTs: true,
    hasMetaAnalysis: false,
    longTermStudies: false,
    safetyEstablished: true,
  },
};

/**
 * Ejemplo: Snake Oil (Producto sin evidencia)
 */
export const DETOX_TEA_EVIDENCE = {
  overallGrade: 'F' as GradeType,
  whatIsItFor: 'Afirma "desintoxicar" el cuerpo y ayudar con pérdida de peso, pero no hay evidencia científica que respalde estas afirmaciones.',

  worksFor: [] as WorksForItem[],

  doesntWorkFor: [
    {
      condition: 'Desintoxicar el cuerpo',
      grade: 'F' as GradeType,
      description: 'El cuerpo se desintoxica naturalmente. No hay evidencia de beneficio adicional',
    },
    {
      condition: 'Pérdida de peso sostenible',
      grade: 'F' as GradeType,
      description: 'Pérdida temporal de agua, no de grasa. Puede causar deshidratación',
    },
    {
      condition: 'Mejorar la salud digestiva',
      grade: 'E' as GradeType,
      description: 'Puede causar problemas digestivos en lugar de mejorarlos',
    },
  ] as WorksForItem[],

  ingredients: [
    {
      name: 'Mezcla de hierbas propietaria',
      grade: 'F' as GradeType,
      studyCount: 0,
      rctCount: 0,
      description: 'Sin estudios científicos que respalden su eficacia',
    },
  ],

  qualityBadges: {
    hasRCTs: false,
    hasMetaAnalysis: false,
    longTermStudies: false,
    safetyEstablished: false,
  },
};

/**
 * Helper: Convertir evidencia vieja al nuevo formato
 * Útil para migrar datos existentes
 */
export function convertOldEvidenceFormat(oldEvidence: any) {
  // TODO: Implementar conversión del formato antiguo al nuevo
  // Este es un placeholder para cuando queramos migrar datos existentes

  return {
    overallGrade: 'C' as GradeType,
    whatIsItFor: 'Descripción pendiente',
    worksFor: [],
    doesntWorkFor: [],
    ingredients: [],
    qualityBadges: {
      hasRCTs: false,
      hasMetaAnalysis: false,
      longTermStudies: false,
      safetyEstablished: false,
    },
  };
}
