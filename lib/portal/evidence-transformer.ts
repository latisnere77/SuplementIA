/**
 * Evidence Data Transformer
 * Convierte datos del backend (formato viejo) al nuevo formato visual
 * OPTIMIZADO: Usa cache estático cuando es posible
 */

import type { GradeType } from '@/components/portal/SupplementGrade';
import type { WorksForItem } from '@/components/portal/WorksForSection';
import { getSupplementEvidenceFromCache } from './supplements-evidence-data';

/**
 * Convierte el formato viejo de evidencia al nuevo formato visual
 * OPTIMIZACIÓN: Primero intenta usar datos pre-generados del cache
 */
export function transformEvidenceToNew(oldEvidence: any, category?: string) {
  // OPTIMIZACIÓN 1: Intentar obtener del cache estático primero
  if (category) {
    const cachedData = getSupplementEvidenceFromCache(category);
    if (cachedData) {
      console.log(`[CACHE HIT] Using pre-generated data for: ${category}`);
      return cachedData;
    }
    console.log(`[CACHE MISS] Generating data for: ${category}`);
  }
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
 * Genera descripción "Para qué sirve" - MEJORADO con más categorías
 */
function generateWhatIsItFor(category: string): string {
  const descriptions: Record<string, string> = {
    // Categorías
    cognitive: 'Mejora la memoria, el enfoque y la claridad mental mediante el apoyo a la función cerebral saludable.',
    sleep: 'Mejora la calidad del sueño, reduce el tiempo para conciliar el sueño y promueve un descanso reparador.',
    muscle: 'Apoya el crecimiento muscular, mejora el rendimiento físico y acelera la recuperación post-entrenamiento.',
    'muscle-gain': 'Apoya el crecimiento muscular, mejora el rendimiento físico y acelera la recuperación post-entrenamiento.',
    energy: 'Aumenta los niveles de energía, reduce la fatiga y mejora la vitalidad general de forma sostenida.',
    immune: 'Fortalece el sistema inmunológico y ayuda al cuerpo a defenderse contra enfermedades.',
    heart: 'Apoya la salud cardiovascular, ayuda a mantener niveles saludables de presión arterial y colesterol.',
    stress: 'Reduce el estrés, la ansiedad y promueve un estado de ánimo equilibrado.',
    anxiety: 'Reduce la ansiedad, promueve la calma y ayuda a manejar el estrés diario.',
    'fat-loss': 'Apoya la pérdida de grasa mediante el control del apetito y el metabolismo.',
    joint: 'Apoya la salud de las articulaciones, reduce la inflamación y mejora la movilidad.',
    skin: 'Mejora la salud de la piel, promueve la elasticidad y reduce signos de envejecimiento.',
    hair: 'Fortalece el cabello, reduce la caída y promueve el crecimiento saludable.',
    digestion: 'Apoya la salud digestiva, mejora la flora intestinal y reduce la inflamación.',

    // Suplementos específicos
    ashwagandha: 'Reduce el estrés y la ansiedad, mejora la calidad del sueño y ayuda a controlar los niveles de cortisol de forma natural.',
    cbd: 'Ayuda a reducir el dolor crónico, la inflamación y puede mejorar la ansiedad en algunas personas.',
    melatonin: 'Regula el ciclo sueño-vigilia, ayuda a conciliar el sueño más rápido y mejora la calidad del descanso.',
    melatonina: 'Regula el ciclo sueño-vigilia, ayuda a conciliar el sueño más rápido y mejora la calidad del descanso.',
    'omega-3': 'Apoya la salud cardiovascular y cerebral, reduce la inflamación y promueve el bienestar general.',
    magnesium: 'Apoya la función muscular y nerviosa, mejora el sueño y ayuda a reducir el estrés.',
    magnesio: 'Apoya la función muscular y nerviosa, mejora el sueño y ayuda a reducir el estrés.',
    'vitamin-d': 'Fortalece los huesos, apoya el sistema inmune y mejora el estado de ánimo.',
    'vitamina-d': 'Fortalece los huesos, apoya el sistema inmune y mejora el estado de ánimo.',
    creatine: 'Aumenta la fuerza muscular, mejora el rendimiento en ejercicios de alta intensidad y apoya la recuperación.',
    creatina: 'Aumenta la fuerza muscular, mejora el rendimiento en ejercicios de alta intensidad y apoya la recuperación.',
    protein: 'Apoya el crecimiento y recuperación muscular, esencial para la síntesis de proteínas.',
    proteina: 'Apoya el crecimiento y recuperación muscular, esencial para la síntesis de proteínas.',
    caffeine: 'Aumenta la energía, mejora el enfoque y el rendimiento físico de forma temporal.',
    cafeina: 'Aumenta la energía, mejora el enfoque y el rendimiento físico de forma temporal.',
    hemp: 'Derivado del cáñamo, puede ayudar con el dolor crónico, la inflamación y algunos síntomas de ansiedad.',
    'hemp seed': 'Rico en proteínas y ácidos grasos omega, apoya la salud cardiovascular y digestiva.',
    rhodiola: 'Adaptógeno que ayuda a reducir la fatiga, mejora el rendimiento mental y físico bajo estrés.',
    'rhodiola rosea': 'Adaptógeno que ayuda a reducir la fatiga, mejora el rendimiento mental y físico bajo estrés.',
    turmeric: 'Poderoso antiinflamatorio natural, apoya la salud articular y puede mejorar la función cognitiva.',
    curcuma: 'Poderoso antiinflamatorio natural, apoya la salud articular y puede mejorar la función cognitiva.',
    ginseng: 'Aumenta la energía, mejora la función cognitiva y apoya el sistema inmunológico.',
    'ginkgo biloba': 'Mejora la circulación cerebral, apoya la memoria y puede ayudar con síntomas de ansiedad.',
    spirulina: 'Superalimento rico en proteínas, antioxidantes y nutrientes esenciales para la salud general.',
    collagen: 'Apoya la salud de la piel, articulaciones y huesos, mejora la elasticidad y reduce arrugas.',
    colageno: 'Apoya la salud de la piel, articulaciones y huesos, mejora la elasticidad y reduce arrugas.',
  };

  const normalized = category.toLowerCase().trim();

  // Si no encontramos descripción específica, generar una más inteligente
  if (descriptions[normalized]) {
    return descriptions[normalized];
  }

  // Fallback más inteligente para suplementos desconocidos
  return `Suplemento natural que puede ofrecer beneficios para la salud. La evidencia científica está en evaluación.`;
}

/**
 * Genera un propósito legible para una categoría o suplemento
 */
function generateCategoryPurpose(category: string): string {
  const purposes: Record<string, string> = {
    // Categorías
    cognitive: 'Mejorar función cognitiva y memoria',
    sleep: 'Mejorar calidad del sueño',
    muscle: 'Aumentar masa muscular y fuerza',
    'muscle-gain': 'Aumentar masa muscular y fuerza',
    energy: 'Aumentar niveles de energía',
    immune: 'Fortalecer sistema inmunológico',
    heart: 'Apoyar salud cardiovascular',
    stress: 'Reducir estrés y ansiedad',
    anxiety: 'Reducir ansiedad',
    'fat-loss': 'Apoyar pérdida de grasa',
    joint: 'Mejorar salud articular',
    skin: 'Mejorar salud de la piel',
    hair: 'Fortalecer el cabello',
    digestion: 'Mejorar digestión',

    // Suplementos específicos
    hemp: 'Reducir dolor e inflamación',
    cbd: 'Aliviar dolor crónico y ansiedad',
    ashwagandha: 'Reducir estrés y mejorar sueño',
    rhodiola: 'Mejorar rendimiento físico y mental',
    melatonin: 'Regular ciclo de sueño',
    melatonina: 'Regular ciclo de sueño',
    creatine: 'Aumentar fuerza y rendimiento',
    creatina: 'Aumentar fuerza y rendimiento',
    protein: 'Apoyar crecimiento muscular',
    proteina: 'Apoyar crecimiento muscular',
    magnesium: 'Mejorar sueño y función muscular',
    magnesio: 'Mejorar sueño y función muscular',
    'omega-3': 'Apoyar salud cardiovascular y cerebral',
    turmeric: 'Reducir inflamación',
    curcuma: 'Reducir inflamación',
    collagen: 'Mejorar salud de piel y articulaciones',
    colageno: 'Mejorar salud de piel y articulaciones',
  };

  const normalized = category.toLowerCase().trim();
  return purposes[normalized] || `Beneficios potenciales de ${category}`;
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

  // Buscar por categoría específica o generar datos mejorados
  const normalized = category.toLowerCase().trim();
  const data = categoryConditions[normalized];

  if (data) {
    return {
      worksFor: data.works,
      doesntWorkFor: data.doesnt,
      limitedEvidence: data.limited,
    };
  }

  // FALLBACK MEJORADO: Generar datos basados en eficacia real
  const works: WorksForItem[] = [];
  const doesnt: WorksForItem[] = [];
  const limited: WorksForItem[] = [];

  // Generar condiciones más inteligentes basadas en eficacia
  const categoryPurpose = generateCategoryPurpose(category);

  if (efficacy >= 60) {
    works.push({
      condition: categoryPurpose,
      grade,
      description: `Evidencia de eficacia del ${efficacy}% en estudios`,
    });
    works.push({
      condition: 'Apoyo general a la salud y bienestar',
      grade: grade === 'A' || grade === 'B' ? 'B' : 'C',
      description: 'Beneficios secundarios documentados en la literatura',
    });
  } else if (efficacy >= 40) {
    limited.push({
      condition: categoryPurpose,
      grade,
      description: `Evidencia limitada (${efficacy}% de eficacia en estudios disponibles)`,
    });
  } else {
    doesnt.push({
      condition: categoryPurpose,
      grade: 'D',
      description: 'Evidencia insuficiente o resultados inconsistentes',
    });
  }

  // Agregar una limitación genérica para balance
  if (efficacy >= 50) {
    doesnt.push({
      condition: 'Resultados inmediatos',
      grade: 'F',
      description: 'Los suplementos requieren uso constante para ver efectos',
    });
  }

  return {
    worksFor: works,
    doesntWorkFor: doesnt,
    limitedEvidence: limited,
  };
}
