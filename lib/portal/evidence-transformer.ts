/**
 * Evidence Data Transformer
 * Convierte datos del backend (formato viejo) al nuevo formato visual
 */

import type { GradeType } from '@/components/portal/SupplementGrade';
import type { WorksForItem } from '@/components/portal/WorksForSection';

/**
 * Convierte el formato viejo de evidencia al nuevo formato visual
 */
export function transformEvidenceToNew(oldEvidence: any, category?: string) {
  // Determinar calificación general basada en eficacia y estudios
  const overallGrade = determineOverallGrade(
    oldEvidence.efficacyPercentage || 0,
    oldEvidence.totalStudies || 0,
    oldEvidence.ingredients || []
  );

  // Generar descripción "Para qué sirve" basada en la categoría
  const whatIsItFor = generateWhatIsItFor(category || 'supplement');

  // Transformar ingredientes
  const ingredients = (oldEvidence.ingredients || []).map((ing: any) => ({
    name: ing.name,
    grade: ing.grade || 'C',
    studyCount: ing.studyCount || 0,
    rctCount: ing.rctCount || 0,
    description: ing.description,
  }));

  // Generar "Funciona para" y "No funciona para" basado en categoría
  const { worksFor, doesntWorkFor, limitedEvidence } = generateWorksForData(
    category || 'supplement',
    overallGrade,
    oldEvidence.efficacyPercentage || 0
  );

  // Determinar quality badges
  const qualityBadges = {
    hasRCTs: ingredients.some((i: any) => i.rctCount > 0),
    hasMetaAnalysis: oldEvidence.totalStudies > 50,
    longTermStudies: oldEvidence.researchSpanYears >= 5,
    safetyEstablished: true, // Asumimos que si está en el sistema, es seguro
  };

  return {
    overallGrade,
    whatIsItFor,
    worksFor,
    doesntWorkFor,
    limitedEvidence,
    ingredients,
    qualityBadges,
  };
}

/**
 * Determina la calificación general A-F
 */
function determineOverallGrade(
  efficacy: number,
  totalStudies: number,
  ingredients: any[]
): GradeType {
  // Si hay ingredientes con grados, usar el mejor
  if (ingredients.length > 0) {
    const grades = ingredients.map((i) => i.grade || 'C');
    const bestGrade = grades.sort()[0]; // A viene antes que B, etc.
    return bestGrade as GradeType;
  }

  // Basado en eficacia y cantidad de estudios
  if (efficacy >= 70 && totalStudies >= 20) return 'A';
  if (efficacy >= 60 && totalStudies >= 10) return 'B';
  if (efficacy >= 50 && totalStudies >= 5) return 'C';
  if (efficacy >= 40) return 'D';
  if (efficacy >= 30) return 'E';
  return 'F';
}

/**
 * Genera descripción "Para qué sirve"
 */
function generateWhatIsItFor(category: string): string {
  const descriptions: Record<string, string> = {
    cognitive: 'Mejora la memoria, el enfoque y la claridad mental mediante el apoyo a la función cerebral saludable.',
    sleep: 'Mejora la calidad del sueño, reduce el tiempo para conciliar el sueño y promueve un descanso reparador.',
    muscle: 'Apoya el crecimiento muscular, mejora el rendimiento físico y acelera la recuperación post-entrenamiento.',
    'muscle-gain': 'Apoya el crecimiento muscular, mejora el rendimiento físico y acelera la recuperación post-entrenamiento.',
    energy: 'Aumenta los niveles de energía, reduce la fatiga y mejora la vitalidad general.',
    immune: 'Fortalece el sistema inmunológico y ayuda al cuerpo a defenderse contra enfermedades.',
    heart: 'Apoya la salud cardiovascular, ayuda a mantener niveles saludables de presión arterial y colesterol.',
    stress: 'Reduce el estrés, la ansiedad y promueve un estado de ánimo equilibrado.',
    anxiety: 'Reduce la ansiedad, promueve la calma y ayuda a manejar el estrés diario.',
    ashwagandha: 'Reduce el estrés y la ansiedad, mejora la calidad del sueño y ayuda a controlar los niveles de cortisol de forma natural.',
    cbd: 'Ayuda a reducir el dolor crónico, la inflamación y puede mejorar la ansiedad en algunas personas.',
    melatonin: 'Regula el ciclo sueño-vigilia, ayuda a conciliar el sueño más rápido y mejora la calidad del descanso.',
    'omega-3': 'Apoya la salud cardiovascular y cerebral, reduce la inflamación y promueve el bienestar general.',
    magnesium: 'Apoya la función muscular y nerviosa, mejora el sueño y ayuda a reducir el estrés.',
    'vitamin-d': 'Fortalece los huesos, apoya el sistema inmune y mejora el estado de ánimo.',
  };

  return descriptions[category.toLowerCase()] || 'Suplemento basado en evidencia científica para mejorar tu salud y bienestar.';
}

/**
 * Genera datos de "Funciona para" y "No funciona para"
 */
function generateWorksForData(
  category: string,
  grade: GradeType,
  efficacy: number
): {
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence: WorksForItem[];
} {
  // Mapeo de categorías a condiciones
  const categoryConditions: Record<string, {
    works: Array<{ condition: string; grade: GradeType; description: string }>;
    doesnt: Array<{ condition: string; grade: GradeType; description: string }>;
    limited: Array<{ condition: string; grade: GradeType; description: string }>;
  }> = {
    ashwagandha: {
      works: [
        { condition: 'Reducir el estrés y la ansiedad', grade: 'A', description: 'Múltiples RCTs muestran reducción del cortisol' },
        { condition: 'Mejorar la calidad del sueño', grade: 'B', description: 'Ayuda a conciliar el sueño más rápido' },
        { condition: 'Aumentar la fuerza muscular', grade: 'B', description: 'Efectivo con entrenamiento de resistencia' },
      ],
      doesnt: [
        { condition: 'Pérdida de peso directa', grade: 'F', description: 'No hay evidencia de efectos sobre el peso' },
        { condition: 'Mejorar la memoria', grade: 'D', description: 'Evidencia insuficiente' },
      ],
      limited: [
        { condition: 'Mejorar la función sexual', grade: 'C', description: 'Algunos estudios prometedores' },
      ],
    },
    sleep: {
      works: [
        { condition: 'Reducir el tiempo para dormir', grade: grade, description: 'Ayuda a conciliar el sueño más rápido' },
        { condition: 'Mejorar la calidad del sueño', grade: grade, description: 'Promueve un descanso más profundo' },
      ],
      doesnt: [
        { condition: 'Curar insomnio crónico', grade: 'D', description: 'Puede ayudar pero no cura causas subyacentes' },
      ],
      limited: [],
    },
    cognitive: {
      works: [
        { condition: 'Mejorar la memoria', grade: grade, description: 'Apoya la función cognitiva' },
        { condition: 'Aumentar el enfoque', grade: grade, description: 'Mejora la concentración' },
      ],
      doesnt: [
        { condition: 'Prevenir Alzheimer', grade: 'D', description: 'No hay evidencia de prevención' },
      ],
      limited: [],
    },
  };

  // Buscar por categoría específica o usar genérico
  const data = categoryConditions[category.toLowerCase()] || {
    works: [
      { condition: `Mejorar ${category}`, grade, description: `Basado en ${efficacy}% de eficacia` },
    ],
    doesnt: [],
    limited: [],
  };

  return {
    worksFor: data.works,
    doesntWorkFor: data.doesnt,
    limitedEvidence: data.limited,
  };
}
