/**
 * PubMed Search Service
 *
 * Este servicio proporciona una interfaz para buscar evidencia científica
 * en PubMed relacionada con condiciones de salud y suplementos.
 */

// Placeholder for the actual API URL. Should be configured with environment variables.
const PUBMED_API_URL = 'https://api.ncbi.nlm.nih.gov/entrez/eutils/';

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

export interface SupplementEvidence {
  supplementName: string;
  evidenceSummary: string;
  studyCount: number;
  grade: EvidenceGrade;
}

export interface PubMedQueryResult {
  searchType: 'condition';
  condition: string;
  summary: string;
  supplementsByEvidence: {
    gradeA: SupplementEvidence[];
    gradeB: SupplementEvidence[];
    gradeC: SupplementEvidence[];
    gradeD: SupplementEvidence[];
  };
}

/**
 * Busca en PubMed suplementos relacionados con una condición de salud específica
 * y los clasifica por nivel de evidencia.
 *
 * @param condition La condición de salud a buscar (e.g., "joint pain").
 * @returns Una promesa que se resuelve en un objeto con los resultados clasificados.
 */
export async function searchPubMed(condition: string): Promise<PubMedQueryResult> {
  console.log(`[PubMed Service] Searching and grading evidence for condition: "${condition}"`);

  // NOTA: Esta es una implementación placeholder.
  // La integración real requerirá una lógica compleja para asignar grados.
  // Por ahora, devolveremos datos mock clasificados.
  const lowerCondition = condition.toLowerCase();

  const emptyResult: PubMedQueryResult = {
    searchType: 'condition',
    condition: condition,
    summary: 'No se encontró evidencia suficiente para esta condición.',
    supplementsByEvidence: {
      gradeA: [],
      gradeB: [],
      gradeC: [],
      gradeD: [],
    },
  };

  if (lowerCondition.includes('dolor articular') || lowerCondition.includes('joint pain')) {
    return {
      searchType: 'condition',
      condition: condition,
      summary: 'Varios suplementos han demostrado ser efectivos para el manejo del dolor articular, destacando aquellos con propiedades antiinflamatorias.',
      supplementsByEvidence: {
        gradeA: [
          {
            supplementName: 'Cúrcuma',
            evidenceSummary: 'Fuerte evidencia antiinflamatoria en múltiples meta-análisis y RCTs.',
            studyCount: 78,
            grade: 'A',
          },
        ],
        gradeB: [
          {
            supplementName: 'Glucosamina',
            evidenceSummary: 'Evidencia generalmente positiva en la reducción del dolor a largo plazo, aunque algunos estudios son mixtos.',
            studyCount: 62,
            grade: 'B',
          },
          {
            supplementName: 'MSM',
            evidenceSummary: 'Evidencia moderada para la reducción del dolor y la mejora de la función articular.',
            studyCount: 35,
            grade: 'B',
          },
        ],
        gradeC: [
            {
                supplementName: 'Colágeno',
                evidenceSummary: 'Evidencia emergente y prometedora, pero se necesitan más estudios a gran escala.',
                studyCount: 28,
                grade: 'C',
            }
        ],
        gradeD: [],
      },
    };
  }

  if (lowerCondition.includes('sueño') || lowerCondition.includes('sleep')) {
    return {
      searchType: 'condition',
      condition: condition,
      summary: 'La melatonina es el suplemento con mayor respaldo científico para la regulación del sueño. Otros suplementos muestran resultados prometedores.',
      supplementsByEvidence: {
        gradeA: [
          {
            supplementName: 'Melatonina',
            evidenceSummary: 'Fuerte evidencia para la regulación del ciclo del sueño, especialmente en casos de jet lag o insomnio de inicio.',
            studyCount: 150,
            grade: 'A',
          },
        ],
        gradeB: [
          {
            supplementName: 'Magnesio',
            evidenceSummary: 'Evidencia creciente que sugiere una mejora en la calidad y duración del sueño, especialmente en personas con deficiencia.',
            studyCount: 45,
            grade: 'B',
          },
        ],
        gradeC: [
            {
                supplementName: 'Valeriana',
                evidenceSummary: 'Estudios mixtos; algunos muestran beneficios modestos mientras que otros no encuentran efectos significativos.',
                studyCount: 55,
                grade: 'C',
            }
        ],
        gradeD: [],
      },
    };
  }

  return emptyResult;
}
