/**
 * PubMed Search Service
 *
 * Este servicio proporciona una interfaz para buscar evidencia científica
 * en PubMed relacionada con condiciones de salud y suplementos.
 */

// Placeholder for the actual API URL. Should be configured with environment variables.
const PUBMED_API_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const TOOL_NAME = process.env.PUBMED_TOOL_NAME || 'SuplementiaSearch';
const TOOL_EMAIL = process.env.PUBMED_TOOL_EMAIL || 'support@suplementia.com';

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

export interface PubMedArticle {
  uid: string;
  pubdate: string;
  title: string;
  authors: { name: string }[];
  source: string; // Journal name
}

export interface ESummaryResult {
  result: {
    uids: string[];
    [key: string]: any; // Allows for dynamic UIDs
  };
}

// --- Evidence Classification Configuration ---

// A dictionary of supplements and their search terms.
// Using a Set for efficient searching.
const SUPPLEMENT_LEXICON: Record<string, { name: string; terms: Set<string> }> = {
  TURMERIC:       { name: 'Cúrcuma', terms: new Set(['turmeric', 'curcumin', 'curcumina']) },
  GLUCOSAMINE:    { name: 'Glucosamina', terms: new Set(['glucosamine', 'glucosamina']) },
  MSM:            { name: 'MSM', terms: new Set(['msm', 'methylsulfonylmethane', 'metilsulfonilmetano']) },
  COLLAGEN:       { name: 'Colágeno', terms: new Set(['collagen', 'colágeno']) },
  MELATONIN:      { name: 'Melatonina', terms: new Set(['melatonin', 'melatonina']) },
  MAGNESIUM:      { name: 'Magnesio', terms: new Set(['magnesium', 'magnesio']) },
  VALERIAN:       { name: 'Valeriana', terms: new Set(['valerian', 'valeriana']) },
  ASHWAGANDHA:    { name: 'Ashwagandha', terms: new Set(['ashwagandha', 'withania somnifera']) },
  OMEGA3:         { name: 'Omega-3', terms: new Set(['omega-3', 'fish oil', 'epa', 'dha']) },
  PROBIOTICS:     { name: 'Probióticos', terms: new Set(['probiotic', 'probiótico', 'lactobacillus', 'bifidobacterium']) },
};

// Keywords to identify study types, ordered by strength of evidence.
const EVIDENCE_KEYWORDS: Record<EvidenceGrade, Set<string>> = {
  A: new Set(['meta-analysis', 'systematic review']),
  B: new Set(['randomized controlled trial', 'randomised controlled trial', 'rct']),
  C: new Set(['observational study', 'cohort study', 'case-control study']),
  D: new Set(['case report', 'case series', 'animal model', 'in vitro']),
};

/**
 * Determines the evidence grade of an article based on its title.
 * @param title The title of the PubMed article.
 * @returns The corresponding EvidenceGrade, or null if no keywords are found.
 */
function classifyArticle(title: string): EvidenceGrade | null {
  const lowerTitle = title.toLowerCase();
  for (const grade of ['A', 'B', 'C', 'D'] as EvidenceGrade[]) {
    for (const keyword of EVIDENCE_KEYWORDS[grade]) {
      if (lowerTitle.includes(keyword)) {
        return grade;
      }
    }
  }
  return null;
}

// --- PubMed Service ---

/**
 * Busca en PubMed suplementos relacionados con una condición de salud específica
 * y los clasifica por nivel de evidencia.
 *
 * @param condition La condición de salud a buscar (e.g., "joint pain").
 * @returns Una promesa que se resuelve en un objeto con los resultados clasificados.
 */
export async function searchPubMed(condition: string): Promise<PubMedQueryResult> {
  console.log(`[PubMed Service] Searching and grading evidence for condition: "${condition}"`);

  const searchQuery = encodeURIComponent(condition);
  const esearchUrl = `${PUBMED_API_BASE_URL}esearch.fcgi?db=pubmed&term=${searchQuery}&usehistory=y&retmax=200&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;

  console.log(`[PubMed Service] ESearch URL: ${esearchUrl}`);

  const esearchResponse = await fetch(esearchUrl);
  if (!esearchResponse.ok) {
    throw new Error(`ESearch request failed with status ${esearchResponse.status}`);
  }
  const esearchXml = await esearchResponse.text();

  // Extract WebEnv and QueryKey from ESearch XML response
  const webEnvMatch = esearchXml.match(/<WebEnv>(.*?)<\/WebEnv>/);
  const queryKeyMatch = esearchXml.match(/<QueryKey>(.*?)<\/QueryKey>/);

  if (!webEnvMatch || !queryKeyMatch) {
    console.error('[PubMed Service] Failed to parse WebEnv or QueryKey from ESearch response:', esearchXml);
    throw new Error('Failed to initialize PubMed search session.');
  }

  const webEnv = webEnvMatch[1];

  const queryKey = queryKeyMatch[1];
  const countMatch = esearchXml.match(/<Count>(.*?)<\/Count>/);
  const totalCount = countMatch ? parseInt(countMatch[1], 10) : 0;

  console.log(`[PubMed Service] WebEnv: ${webEnv}, QueryKey: ${queryKey}, Total articles: ${totalCount}`);

  if (totalCount === 0) {
    return {
      searchType: 'condition',
      condition: condition,
      summary: 'No se encontraron estudios en PubMed para esta condición.',
      supplementsByEvidence: { gradeA: [], gradeB: [], gradeC: [], gradeD: [] },
    };
  }

  // Step 2: Use ESummary to fetch summaries
  const esummaryUrl = `${PUBMED_API_BASE_URL}esummary.fcgi?db=pubmed&WebEnv=${webEnv}&query_key=${queryKey}&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;
  console.log(`[PubMed Service] ESummary URL: ${esummaryUrl}`);

  const esummaryResponse = await fetch(esummaryUrl);
  if (!esummaryResponse.ok) {
    throw new Error(`ESummary request failed with status ${esummaryResponse.status}`);
  }
  const esummaryJson: ESummaryResult = await esummaryResponse.json();

  // Defensive check: Ensure the response structure is what we expect.
  // The API can return a 200 OK with an error object instead of a result object.
  if (!esummaryJson.result || !Array.isArray(esummaryJson.result.uids)) {
    console.error('[PubMed Service] Invalid or empty ESummary response structure:', esummaryJson);
    // Return a controlled "no results" state instead of crashing.
    return {
      searchType: 'condition',
      condition: condition,
      summary: 'No se encontraron estudios coincidentes en PubMed para esta condición.',
      supplementsByEvidence: { gradeA: [], gradeB: [], gradeC: [], gradeD: [] },
    };
  }

  // Step 3: Parse the articles from the ESummary response
  const articles: PubMedArticle[] = esummaryJson.result.uids.map(uid => {
    const articleData = esummaryJson.result[uid];
    return {
      uid: articleData.uid,
      pubdate: articleData.pubdate,
      title: articleData.title,
      authors: articleData.authors,
      source: articleData.source,
    };
  });

  
  // Step 4: Classify evidence
  const evidenceBySupplement: Record<string, { name: string; studies: { grade: EvidenceGrade; article: PubMedArticle }[] }> = {};

  for (const article of articles) {
    const articleGrade = classifyArticle(article.title);
    if (!articleGrade) continue; // Skip articles we can't classify

    const lowerTitle = article.title.toLowerCase();

    for (const key in SUPPLEMENT_LEXICON) {
      const supplement = SUPPLEMENT_LEXICON[key];
      for (const term of supplement.terms) {
        if (lowerTitle.includes(term)) {
          if (!evidenceBySupplement[key]) {
            evidenceBySupplement[key] = { name: supplement.name, studies: [] };
          }
          evidenceBySupplement[key].studies.push({ grade: articleGrade, article });
          break; // Move to the next article once a supplement is found
        }
      }
    }
  }

  // Step 5: Grade supplements based on aggregated evidence
  const supplementsByEvidence = {
    gradeA: [] as SupplementEvidence[],
    gradeB: [] as SupplementEvidence[],
    gradeC: [] as SupplementEvidence[],
    gradeD: [] as SupplementEvidence[],
  };

  for (const key in evidenceBySupplement) {
    const item = evidenceBySupplement[key];
    const studyCount = item.studies.length;
    let finalGrade: EvidenceGrade = 'D'; // Default grade

    const hasGradeA = item.studies.some(s => s.grade === 'A');
    const hasGradeB = item.studies.some(s => s.grade === 'B');
    const hasGradeC = item.studies.some(s => s.grade === 'C');

    // Simple grading logic: Highest evidence type determines the grade.
    if (hasGradeA) {
      finalGrade = 'A';
    } else if (hasGradeB) {
      finalGrade = 'B';
    } else if (hasGradeC) {
      finalGrade = 'C';
    }
    
    const evidence: SupplementEvidence = {
      supplementName: item.name,
      studyCount: studyCount,
      grade: finalGrade,
      evidenceSummary: `${studyCount} estudio(s) encontrado(s) con el nivel más alto de evidencia siendo Grado ${finalGrade}.`,
    };

    supplementsByEvidence[`grade${finalGrade}`].push(evidence);
  }

  return {
    searchType: 'condition',
    condition: condition,
    summary: `Análisis completo. Se encontraron y clasificaron estudios para ${Object.keys(evidenceBySupplement).length} suplemento(s).`,
    supplementsByEvidence,
  };
}
