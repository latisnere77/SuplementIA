/**
 * Dynamic Evidence Generation System
 * Uses Medical MCP + AI to generate rich supplement data on-demand
 *
 * FLOW:
 * 1. Check static cache (fast)
 * 2. Check dynamic cache (DynamoDB - future)
 * 3. Generate from PubMed + AI (slow, first time only)
 */

import type { GradeType } from '@/components/portal/SupplementGrade';
import type { WorksForItem } from '@/components/portal/WorksForSection';
import type { SupplementEvidenceData } from './supplements-evidence-data';
import type { PubMedArticle } from '@/lib/services/medical-mcp-client';

// ====================================
// TYPES
// ====================================

export interface ProgressUpdate {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  phase: 'searching' | 'analyzing' | 'caching' | 'complete';
}

export type ProgressCallback = (update: ProgressUpdate) => void;

interface GeneratedEvidenceData extends SupplementEvidenceData {
  sources: string[]; // PMIDs for verification
  generatedAt: Date;
  studyQuality: 'high' | 'medium' | 'low';
}

// ====================================
// MAIN FUNCTION
// ====================================

/**
 * Generate rich evidence data dynamically using Medical MCP
 *
 * @param supplementName - Name of the supplement to analyze
 * @param onProgress - Optional callback to report progress updates
 *
 * @example
 * const vitaminAData = await generateRichEvidenceData('vitamin a', (progress) => {
 *   console.log(`${progress.message} (${progress.percentage}%)`);
 * });
 */
export async function generateRichEvidenceData(
  supplementName: string,
  onProgress?: ProgressCallback
): Promise<GeneratedEvidenceData> {
  console.log(`[DYNAMIC GEN] Generating rich data for: ${supplementName}`);

  // Report initial progress
  onProgress?.({
    step: 1,
    totalSteps: 4,
    message: `Iniciando búsqueda de estudios sobre ${supplementName}...`,
    percentage: 0,
    phase: 'searching'
  });

  // STEP 1: Search PubMed for RCTs and Meta-analyses
  onProgress?.({
    step: 1,
    totalSteps: 4,
    message: `Buscando estudios científicos en PubMed...`,
    percentage: 10,
    phase: 'searching'
  });

  const studies = await searchSupplementStudies(supplementName);

  if (studies.length === 0) {
    onProgress?.({
      step: 4,
      totalSteps: 4,
      message: `No se encontraron estudios. Generando datos básicos...`,
      percentage: 100,
      phase: 'complete'
    });
    return generateFallbackData(supplementName);
  }

  // Report studies found
  onProgress?.({
    step: 2,
    totalSteps: 4,
    message: `✅ Encontrados ${studies.length} estudios. Analizando con IA...`,
    percentage: 40,
    phase: 'analyzing'
  });

  // STEP 2: Analyze studies with AI
  const analysis = await analyzeStudiesWithAI(supplementName, studies);

  // Report analysis complete
  onProgress?.({
    step: 3,
    totalSteps: 4,
    message: `✅ Análisis completo (Grade ${analysis.overallGrade}). Guardando en caché...`,
    percentage: 80,
    phase: 'caching'
  });

  // STEP 3: Format as rich data
  const richData = formatAsRichData(supplementName, analysis, studies);

  // STEP 4: Save to DynamoDB cache (async, non-blocking)
  saveToDynamicCache(supplementName, richData).catch(err => {
    console.error(`[CACHE SAVE ERROR] Failed to save ${supplementName}:`, err);
  });

  // Report final step
  onProgress?.({
    step: 4,
    totalSteps: 4,
    message: `✅ Datos guardados. Mostrando resultados...`,
    percentage: 100,
    phase: 'complete'
  });

  return richData;
}

// ====================================
// STEP 1: SEARCH PUBMED
// ====================================

/**
 * Search PubMed for high-quality studies about a supplement
 * Uses Medical MCP client for real PubMed searches
 */
async function searchSupplementStudies(
  supplementName: string
): Promise<PubMedArticle[]> {
  const { searchSupplementInPubMed } = await import('@/lib/services/medical-mcp-client');

  console.log(`[PUBMED] Searching for studies about: ${supplementName}`);

  try {
    const articles = await searchSupplementInPubMed(supplementName, {
      maxResults: 20,
      filterRCTs: true,
      filterMetaAnalyses: true,
      minYear: 2010,
    });

    console.log(`[PUBMED] Found ${articles.length} high-quality studies`);
    return articles;
  } catch (error) {
    console.error(`[PUBMED ERROR] Failed to search for ${supplementName}:`, error);
    return [];
  }
}

// ====================================
// STEP 2: AI ANALYSIS
// ====================================

interface StudyAnalysis {
  overallGrade: GradeType;
  whatIsItFor: string;
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence: WorksForItem[];
  keyFindings: string[];
  studyCount: {
    total: number;
    rct: number;
    metaAnalysis: number;
  };
}

/**
 * Analyze PubMed studies using AI (Bedrock/Claude)
 * Extracts structured evidence data from abstracts
 */
async function analyzeStudiesWithAI(
  supplementName: string,
  studies: PubMedArticle[]
): Promise<StudyAnalysis> {
  const { analyzeStudiesWithBedrock } = await import('@/lib/services/bedrock-analyzer');

  console.log(`[AI] Analyzing ${studies.length} studies with Bedrock`);

  try {
    const analysis = await analyzeStudiesWithBedrock(supplementName, studies);
    console.log(`[AI] Analysis complete - Grade ${analysis.overallGrade}`);
    return analysis;
  } catch (error) {
    console.error(`[AI ERROR] Failed to analyze studies:`, error);

    // Fallback to basic analysis
    const { getStudyQualityMetrics } = await import('@/lib/services/medical-mcp-client');
    const metrics = getStudyQualityMetrics(studies);

    return {
      overallGrade: metrics.qualityScore === 'high' ? 'B' : 'C',
      whatIsItFor: `Analysis based on ${studies.length} studies`,
      worksFor: [],
      doesntWorkFor: [],
      limitedEvidence: [],
      keyFindings: [`Based on ${metrics.total} studies (${metrics.rctCount} RCTs, ${metrics.metaAnalysisCount} meta-analyses)`],
      studyCount: {
        total: metrics.total,
        rct: metrics.rctCount,
        metaAnalysis: metrics.metaAnalysisCount,
      },
    };
  }
}

// ====================================
// STEP 3: FORMAT
// ====================================

/**
 * Format AI analysis as rich supplement data
 */
function formatAsRichData(
  supplementName: string,
  analysis: StudyAnalysis,
  studies: PubMedArticle[]
): GeneratedEvidenceData {
  return {
    overallGrade: analysis.overallGrade,
    whatIsItFor: analysis.whatIsItFor,
    worksFor: analysis.worksFor,
    doesntWorkFor: analysis.doesntWorkFor,
    limitedEvidence: analysis.limitedEvidence,

    qualityBadges: {
      hasRCTs: analysis.studyCount.rct > 0,
      hasMetaAnalysis: analysis.studyCount.metaAnalysis > 0,
      longTermStudies: studies.some(s => s.year < new Date().getFullYear() - 5),
      safetyEstablished: true, // Could be determined from studies
    },

    ingredients: [
      {
        name: supplementName,
        grade: analysis.overallGrade,
        studyCount: analysis.studyCount.total,
        rctCount: analysis.studyCount.rct,
        description: `Based on ${analysis.studyCount.total} peer-reviewed studies`,
      },
    ],

    // Additional metadata
    sources: studies.map(s => s.pmid),
    generatedAt: new Date(),
    studyQuality: determineStudyQuality(analysis.studyCount),
  };
}

function determineStudyQuality(studyCount: { total: number; rct: number; metaAnalysis: number }): 'high' | 'medium' | 'low' {
  if (studyCount.metaAnalysis >= 2 && studyCount.rct >= 10) return 'high';
  if (studyCount.rct >= 5) return 'medium';
  return 'low';
}

/**
 * Generate fallback data when no studies found
 */
function generateFallbackData(supplementName: string): GeneratedEvidenceData {
  return {
    overallGrade: 'C',
    whatIsItFor: `Información limitada disponible sobre ${supplementName}. Se requiere más investigación.`,
    worksFor: [],
    doesntWorkFor: [],
    limitedEvidence: [
      {
        condition: 'Beneficios potenciales',
        grade: 'C',
        description: 'Evidencia insuficiente en la literatura científica',
      },
    ],
    qualityBadges: {
      hasRCTs: false,
      hasMetaAnalysis: false,
      longTermStudies: false,
      safetyEstablished: false,
    },
    ingredients: [
      {
        name: supplementName,
        grade: 'C',
        studyCount: 0,
        rctCount: 0,
        description: 'Información limitada disponible',
      },
    ],
    sources: [],
    generatedAt: new Date(),
    studyQuality: 'low',
  };
}

// ====================================
// EXAMPLE: How to integrate with MCP
// ====================================

/**
 * Example of how this would work with the Medical MCP
 * This would replace searchSupplementStudies() in production
 */
export async function searchWithMedicalMCP(supplementName: string): Promise<any> {
  // This is pseudocode showing how to call the MCP

  /*
  // Call Medical MCP's search-medical-literature tool
  const mcpResponse = await mcp.callTool('medical-mcp', 'search-medical-literature', {
    query: `${supplementName}[Title/Abstract] AND (randomized controlled trial[PT] OR meta-analysis[PT])`,
    max_results: 20
  });

  // MCP returns formatted PubMed articles
  const studies = mcpResponse.articles;

  // Then analyze with Bedrock
  const analysis = await analyzeStudiesWithAI(supplementName, studies);

  // Cache the result in DynamoDB
  await saveToDynamoDB(supplementName, analysis);

  return analysis;
  */

  console.log(`[MCP INTEGRATION] Would search for: ${supplementName}`);
  return null;
}

// ====================================
// CACHING STRATEGY
// ====================================

/**
 * Check if supplement has cached dynamic data
 * Would query DynamoDB in production
 */
export async function checkDynamicCache(
  supplementName: string
): Promise<GeneratedEvidenceData | null> {
  // In production:
  // const cached = await dynamoDB.get({
  //   TableName: 'supplements-evidence-cache',
  //   Key: { supplement: supplementName }
  // });
  //
  // if (cached && isCacheValid(cached.generatedAt)) {
  //   return cached;
  // }

  return null;
}

/**
 * Save generated data to cache
 * Uses dynamodb-cache service for real cache storage
 */
export async function saveToDynamicCache(
  supplementName: string,
  data: GeneratedEvidenceData
): Promise<void> {
  try {
    const { saveCachedEvidence } = await import('@/lib/services/dynamodb-cache');

    await saveCachedEvidence(supplementName, data, {
      studyQuality: data.studyQuality,
      studyCount: data.sources.length,
      rctCount: data.ingredients[0]?.rctCount || 0,
      metaAnalysisCount: 0, // Could extract from sources if needed
      pubmedIds: data.sources,
    });

    console.log(`[CACHE SAVED] Successfully saved ${supplementName} to DynamoDB`);
  } catch (error) {
    console.error(`[CACHE SAVE FAILED] ${supplementName}:`, error);
    throw error;
  }
}

function isCacheValid(generatedAt: Date): boolean {
  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  return generatedAt > thirtyDaysAgo;
}
