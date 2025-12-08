/**
 * PubMed Query Builder
 * Constructs optimized PubMed queries with intelligent exclusion detection
 */

import { SUPPLEMENT_KNOWLEDGE } from './supplementKnowledge';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Intelligently detect potential confusions for a supplement
 */
function detectPotentialConfusions(supplementName: string): string[] {
  const normalized = supplementName.toLowerCase().trim();
  const exclusions = new Set<string>();

  // 1. Check explicit confusion risks from knowledge base
  for (const info of Object.values(SUPPLEMENT_KNOWLEDGE)) {
    const allNames = [...info.commonNames, ...info.scientificNames].map(n => n.toLowerCase());
    
    if (allNames.some(name => normalized.includes(name) || name.includes(normalized))) {
      // This is our supplement, add its confusion risks
      if (info.confusionRisk) {
        info.confusionRisk.forEach(risk => exclusions.add(risk.toLowerCase()));
      }
    }
  }

  // 2. Detect phonetically similar supplements (high similarity but not exact match)
  for (const info of Object.values(SUPPLEMENT_KNOWLEDGE)) {
    const allNames = [...info.commonNames, ...info.scientificNames];
    
    for (const name of allNames) {
      const similarity = similarityRatio(normalized, name.toLowerCase());
      
      // If similarity is high (0.6-0.95) but not exact, it's a potential confusion
      if (similarity > 0.6 && similarity < 0.95) {
        // Add all names of this confusing supplement
        allNames.forEach(n => exclusions.add(n.toLowerCase()));
        break;
      }
    }
  }

  // 3. Remove the search term itself and its variations
  const searchTerms = new Set([normalized]);
  const matchingInfo = Object.values(SUPPLEMENT_KNOWLEDGE).find(info =>
    [...info.commonNames, ...info.scientificNames].some(n => 
      n.toLowerCase() === normalized || normalized.includes(n.toLowerCase())
    )
  );
  
  if (matchingInfo) {
    matchingInfo.commonNames.forEach(n => searchTerms.add(n.toLowerCase()));
    matchingInfo.scientificNames.forEach(n => searchTerms.add(n.toLowerCase()));
  }

  // Filter out search terms from exclusions
  return Array.from(exclusions).filter(exc => !searchTerms.has(exc));
}

export interface QueryOptions {
  supplementName: string;
  useProximity?: boolean;
  studyTypes?: string[];
  yearFrom?: number;
  yearTo?: number;
  humanStudiesOnly?: boolean;
  includeNegativeTerms?: boolean;
}

/**
 * Build main search query with smart flexibility
 */
export function buildMainQuery(options: QueryOptions): string {
  const { supplementName, useProximity = true } = options;
  const parts: string[] = [];

  // Main term with proximity search if multi-word
  const mainTerm = buildMainTerm(supplementName, useProximity);
  parts.push(mainTerm);

  // Add intelligent exclusions for similar supplements
  const exclusions = getExclusions(supplementName);
  if (exclusions.length > 0) {
    console.log(`[QueryBuilder] Applying ${exclusions.length} exclusions for "${supplementName}":`, exclusions);
    const exclusionQueries = exclusions.map(term => `NOT ${term}[tiab]`);
    parts.push(...exclusionQueries);
  } else {
    console.log(`[QueryBuilder] No exclusions needed for "${supplementName}"`);
  }

  // Study type filters
  if (options.studyTypes && options.studyTypes.length > 0) {
    const typeQueries = options.studyTypes.map(type => `"${type}"[pt]`);
    parts.push(`(${typeQueries.join(' OR ')})`);
  }

  // Year filter
  if (options.yearFrom || options.yearTo) {
    const yearFrom = options.yearFrom || 1900;
    const yearTo = options.yearTo || new Date().getFullYear();
    parts.push(`${yearFrom}:${yearTo}[pdat]`);
  }

  // Human studies only
  if (options.humanStudiesOnly !== false) {
    parts.push('"humans"[mh]');
  }

  return parts.join(' AND ');
}

/**
 * Get intelligent exclusion terms for a supplement
 * Uses knowledge base + similarity detection
 */
function getExclusions(supplementName: string): string[] {
  return detectPotentialConfusions(supplementName);
}

/**
 * Build main search term with proximity if multi-word
 */
function buildMainTerm(supplementName: string, useProximity: boolean): string {
  const normalized = supplementName.trim().replace(/\s+/g, ' ');
  const words = normalized.split(' ').filter(w => w.length > 0);

  // Single word: simple search
  if (words.length === 1) {
    return `${normalized}[tiab]`;
  }

  // Multi-word with proximity search
  if (useProximity) {
    // Use proximity search: finds terms within 3 words of each other
    return `"${normalized}"[Title:~3]`;
  }

  // Multi-word with AND logic (fallback)
  const wordQueries = words.map(word => `${word}[tiab]`);
  return `(${wordQueries.join(' AND ')})`;
}

/**
 * Build query for high-quality studies
 */
export function buildHighQualityQuery(supplementName: string): string {
  return buildMainQuery({
    supplementName,
    useProximity: true,
    studyTypes: [
      'randomized controlled trial',
      'meta-analysis',
      'systematic review',
    ],
    humanStudiesOnly: true,
  });
}

/**
 * Build query for recent studies
 */
export function buildRecentQuery(supplementName: string, yearsBack: number = 5): string {
  const currentYear = new Date().getFullYear();
  return buildMainQuery({
    supplementName,
    useProximity: true,
    yearFrom: currentYear - yearsBack,
    humanStudiesOnly: true,
  });
}

/**
 * Build query for negative/null results
 */
export function buildNegativeQuery(supplementName: string): string {
  const negativeTerms = [
    'no effect',
    'not effective',
    'ineffective',
    'no significant difference',
    'no benefit',
    'failed to show',
    'did not improve',
  ];

  const mainTerm = `${supplementName}[tiab]`;
  const negativeQueries = negativeTerms.map(term => `"${term}"[tiab]`);
  const negativeClause = `(${negativeQueries.join(' OR ')})`;

  return `${mainTerm} AND ${negativeClause} AND (clinical trial[pt] OR randomized controlled trial[pt])`;
}

/**
 * Build query for systematic reviews
 */
export function buildSystematicReviewQuery(supplementName: string): string {
  return `${supplementName}[tiab] AND systematic[sb]`;
}

/**
 * Combine multiple query keys using History Server
 */
export function buildCombinedQuery(queryKeys: number[]): string {
  return queryKeys.map(key => `#${key}`).join(' OR ');
}
