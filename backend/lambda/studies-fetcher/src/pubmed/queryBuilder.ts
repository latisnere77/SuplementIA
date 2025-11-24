/**
 * PubMed Query Builder
 * Constructs optimized PubMed queries
 */

/**
 * Exclusion map to prevent confusion between similar supplement names
 * Maps supplement name to terms that should be explicitly excluded
 */
const EXCLUSION_MAP: Record<string, string[]> = {
  'ginger': ['ginseng', 'panax'],
  'ginseng': ['ginger', 'zingiber'],
  'ashwagandha': ['rhodiola', 'ginseng'],
  'rhodiola': ['ashwagandha', 'ginseng'],
};

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

  // Add exclusions for similar supplements
  const exclusions = getExclusions(supplementName);
  if (exclusions.length > 0) {
    const exclusionQueries = exclusions.map(term => `NOT ${term}[tiab]`);
    parts.push(...exclusionQueries);
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
 * Get exclusion terms for a supplement
 */
function getExclusions(supplementName: string): string[] {
  const normalized = supplementName.toLowerCase().trim();
  return EXCLUSION_MAP[normalized] || [];
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
