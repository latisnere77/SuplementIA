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

// NEW: Evidence for a specific benefit
export interface BenefitEvidence {
  benefitName: string;
  grade: EvidenceGrade;
  studyCount: number;
  summary: string;
}

// UPDATED: SupplementEvidence now contains a list of benefit evidences
export interface SupplementEvidence {
  supplementName: string;
  overallGrade: EvidenceGrade;
  totalStudyCount: number;
  benefits: BenefitEvidence[];
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

// NEW: A dictionary mapping general conditions to specific benefits for enrichment.
const BENEFIT_LEXICON: Record<string, { name: string; benefits: Record<string, { name: string; terms: string[] }> }> = {
  'joint-pain': {
    name: 'Dolor Articular',
    benefits: {
      inflammation: { name: 'Reduce la inflamación', terms: ['inflammation', 'inflammatory'] },
      mobility: { name: 'Mejora la movilidad', terms: ['mobility', 'function'] },
      stiffness: { name: 'Disminuye la rigidez', terms: ['stiffness'] },
    },
  },
  'sleep': {
    name: 'Sueño',
    benefits: {
      'sleep-onset': { name: 'Ayuda a conciliar el sueño', terms: ['sleep onset', 'latency'] },
      'sleep-quality': { name: 'Mejora la calidad del sueño', terms: ['sleep quality', 'efficiency'] },
      'insomnia': { name: 'Combate el insomnio', terms: ['insomnia'] },
    }
  }
  // Add other conditions here
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
 * Executes a search query against the PubMed API and returns parsed articles.
 * @param query The search query string.
 * @returns A promise that resolves to an array of PubMedArticle objects.
 */
async function executePubMedSearch(query: string): Promise<PubMedArticle[]> {
  const searchQuery = encodeURIComponent(query);
  const esearchUrl = `${PUBMED_API_BASE_URL}esearch.fcgi?db=pubmed&term=${searchQuery}&usehistory=y&retmax=250&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;

  const esearchResponse = await fetch(esearchUrl);
  if (!esearchResponse.ok) {
    console.error(`[PubMed] ESearch for query "${query}" failed with status ${esearchResponse.status}`);
    return []; // Return empty array on failure
  }
  const esearchXml = await esearchResponse.text();

  const webEnvMatch = esearchXml.match(/<WebEnv>(.*?)<\/WebEnv>/);
  const queryKeyMatch = esearchXml.match(/<QueryKey>(.*?)<\/QueryKey>/);
  const countMatch = esearchXml.match(/<Count>(.*?)<\/Count>/);
  const totalCount = countMatch ? parseInt(countMatch[1], 10) : 0;

  if (!webEnvMatch || !queryKeyMatch || totalCount === 0) {
    return []; // No results found
  }

  const webEnv = webEnvMatch[1];
  const queryKey = queryKeyMatch[1];

  const esummaryUrl = `${PUBMED_API_BASE_URL}esummary.fcgi?db=pubmed&WebEnv=${webEnv}&query_key=${queryKey}&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;
  const esummaryResponse = await fetch(esummaryUrl);
  if (!esummaryResponse.ok) {
    console.error(`[PubMed] ESummary for query "${query}" failed with status ${esummaryResponse.status}`);
    return [];
  }
  
  const esummaryJson: ESummaryResult = await esummaryResponse.json();

  if (!esummaryJson.result || !Array.isArray(esummaryJson.result.uids)) {
    return [];
  }

  return esummaryJson.result.uids.map(uid => {
    const articleData = esummaryJson.result[uid];
    return {
      uid: articleData.uid,
      pubdate: articleData.pubdate,
      title: articleData.title,
      authors: articleData.authors,
      source: articleData.source,
    };
  });
}

/**
 * The main function to search and enrich evidence for a given health condition.
 */
export async function searchPubMed(condition: string): Promise<PubMedQueryResult> {
  console.log(`[PubMed Service] Starting discovery phase for condition: "${condition}"`);

  // Phase 1: Discovery - Find relevant articles for the general condition
  const initialArticles = await executePubMedSearch(condition);

  if (initialArticles.length === 0) {
    return {
      searchType: 'condition',
      condition,
      summary: 'No se encontraron estudios en PubMed para esta condición.',
      supplementsByEvidence: { gradeA: [], gradeB: [], gradeC: [], gradeD: [] },
    };
  }

  // Identify supplements mentioned in the initial search
  const discoveredSupplements: Record<string, { name: string; articles: PubMedArticle[] }> = {};
  for (const article of initialArticles) {
    const lowerTitle = article.title.toLowerCase();
    for (const key in SUPPLEMENT_LEXICON) {
      const supplement = SUPPLEMENT_LEXICON[key];
      if ([...supplement.terms].some(term => lowerTitle.includes(term))) {
        if (!discoveredSupplements[key]) {
          discoveredSupplements[key] = { name: supplement.name, articles: [] };
        }
        discoveredSupplements[key].articles.push(article);
      }
    }
  }

  // Phase 2: Enrichment - For each supplement, search for specific benefits
  const enrichedResults: SupplementEvidence[] = [];
  const conditionKey = condition.toLowerCase().replace(/\s+/g, '-');
  const benefitsToSearch = BENEFIT_LEXICON[conditionKey]?.benefits;

  for (const key in discoveredSupplements) {
    const supplement = SUPPLEMENT_LEXICON[key];
    const supplementEvidence: SupplementEvidence = {
      supplementName: supplement.name,
      overallGrade: 'D', // Default grade, will be updated
      totalStudyCount: discoveredSupplements[key].articles.length,
      benefits: [],
    };

    if (benefitsToSearch) {
      for (const benefitKey in benefitsToSearch) {
        const benefit = benefitsToSearch[benefitKey];
        const supplementTerms = [...supplement.terms].join(' OR ');
        const benefitTerms = benefit.terms.join(' OR ');
        
        // Construct a highly specific query
        const enrichmentQuery = `(${supplementTerms}) AND (${condition}) AND (${benefitTerms})`;
        console.log(`[PubMed Service] Enriching for ${supplement.name} -> ${benefit.name} with query: "${enrichmentQuery}"`);
        
        const benefitArticles = await executePubMedSearch(enrichmentQuery);
        
        if (benefitArticles.length > 0) {
          const grades = benefitArticles.map(a => classifyArticle(a.title)).filter(Boolean) as EvidenceGrade[];
          const highestGrade = grades.sort()[0] || 'D';

          supplementEvidence.benefits.push({
            benefitName: benefit.name,
            grade: highestGrade,
            studyCount: benefitArticles.length,
            summary: `Evidencia ${highestGrade} con ${benefitArticles.length} estudio(s).`,
          });
        }
      }
    }

    // Determine overall grade based on the best benefit evidence
    if (supplementEvidence.benefits.length > 0) {
      supplementEvidence.overallGrade = supplementEvidence.benefits.sort((a, b) => a.grade.localeCompare(b.grade))[0].grade;
    }
    
    enrichedResults.push(supplementEvidence);
  }

  // Final Step: Group results by grade
  const supplementsByEvidence = {
    gradeA: enrichedResults.filter(s => s.overallGrade === 'A'),
    gradeB: enrichedResults.filter(s => s.overallGrade === 'B'),
    gradeC: enrichedResults.filter(s => s.overallGrade === 'C'),
    gradeD: enrichedResults.filter(s => s.overallGrade === 'D'),
  };

  return {
    searchType: 'condition',
    condition,
    summary: `Análisis enriquecido completo. Se encontraron ${enrichedResults.length} suplementos relevantes.`,
    supplementsByEvidence,
  };
}
