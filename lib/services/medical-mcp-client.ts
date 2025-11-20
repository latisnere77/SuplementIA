/**
 * Medical MCP Client
 * Client to interact with Medical MCP server for PubMed searches
 */

import { getIntelligentSearchStrategy, type SupplementCandidate } from './supplement-intelligence';

// ====================================
// TYPES
// ====================================

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number;
  publicationTypes: string[];
  fullText?: string;
  pmcId?: string;
}

export interface MCPSearchOptions {
  maxResults?: number;
  filterRCTs?: boolean;
  filterMetaAnalyses?: boolean;
  minYear?: number;
  useIntelligentSearch?: boolean; // Default: true (uses multi-candidate strategy)
}

// ====================================
// QUERY TRANSLATION / FALLBACK
// ====================================

/**
 * Common Spanish → English translations for supplements
 */
const SUPPLEMENT_TRANSLATIONS: Record<string, string> = {
  // Vitaminas
  'vitamina a': 'vitamin a',
  'vitamina b': 'vitamin b',
  'vitamina b12': 'vitamin b12',
  'vitamina b6': 'vitamin b6',
  'vitamina c': 'vitamin c',
  'vitamina d': 'vitamin d',
  'vitamina e': 'vitamin e',
  'vitamina k': 'vitamin k',

  // Minerales
  'calcio': 'calcium',
  'hierro': 'iron',
  'magnesio': 'magnesium',
  'zinc': 'zinc',
  'selenio': 'selenium',
  'potasio': 'potassium',

  // Suplementos comunes
  'omega 3': 'omega 3',
  'omega-3': 'omega-3',
  'proteína': 'protein',
  'creatina': 'creatine',
  'cafeína': 'caffeine',
  'melatonina': 'melatonin',
  'curcuma': 'turmeric',
  'cúrcuma': 'turmeric',

  // Collagen - use specific type for better research
  'colageno': 'collagen peptides',
  'colágeno': 'collagen peptides',
  'colageno hidrolizado': 'hydrolyzed collagen',
  'colágeno hidrolizado': 'hydrolyzed collagen',
};

/**
 * Try to translate query from Spanish to English
 */
function tryTranslateQuery(query: string): string | null {
  const normalized = query.toLowerCase().trim();
  return SUPPLEMENT_TRANSLATIONS[normalized] || null;
}

// ====================================
// RATE LIMITING
// ====================================

/**
 * PubMed requires max 3 requests/second without API key
 * We'll use a simple delay to respect rate limits
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 350; // ~3 requests per second

async function respectRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    console.log(`[RATE LIMIT] Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

// ====================================
// MCP CLIENT
// ====================================

/**
 * Search PubMed for supplement studies with INTELLIGENT MULTI-CANDIDATE strategy
 *
 * NEW: Uses AI-powered disambiguation, fuzzy matching, and synonym expansion
 * Searches multiple candidates in parallel and returns best results
 *
 * @example
 * const studies = await searchSupplementInPubMed('cardo santo', {
 *   maxResults: 20,
 *   filterRCTs: true
 * });
 * // Will try: "milk thistle", "silymarin", "blessed thistle" in parallel
 * // Returns results from best candidate
 */
export async function searchSupplementInPubMed(
  supplementName: string,
  options: MCPSearchOptions = {}
): Promise<PubMedArticle[]> {
  // Use intelligent search strategy
  const useIntelligentSearch = options.useIntelligentSearch !== false; // Default: true

  if (useIntelligentSearch) {
    return await searchSupplementInPubMedIntelligent(supplementName, options);
  } else {
    return await searchSupplementInPubMedLegacy(supplementName, options);
  }
}

/**
 * INTELLIGENT SEARCH (NEW)
 * Multi-candidate parallel search with best result selection
 */
async function searchSupplementInPubMedIntelligent(
  supplementName: string,
  options: MCPSearchOptions = {}
): Promise<PubMedArticle[]> {
  const {
    maxResults = 20,
    filterRCTs = true,
    filterMetaAnalyses = true,
    minYear = 2010,
  } = options;

  console.log(`[MCP INTELLIGENT] Analyzing query: ${supplementName}`);

  // Get intelligent search strategy
  const strategy = getIntelligentSearchStrategy(supplementName, 3); // Top 3 candidates

  console.log(`[MCP INTELLIGENT] Found ${strategy.candidates.length} candidates`);

  // Search all candidates in parallel
  const searchPromises = strategy.candidates.map(async (candidate) => {
    try {
      console.log(`[MCP INTELLIGENT] Searching candidate: "${candidate.term}" (${candidate.type})`);

      const query = buildPubMedQuery(candidate.term, {
        filterRCTs,
        filterMetaAnalyses,
        minYear,
      });

      const articles = await callMCPTool('search-medical-literature', {
        query,
        max_results: maxResults,
      });

      console.log(`[MCP INTELLIGENT] Candidate "${candidate.term}": ${articles.length} articles`);

      return {
        candidate,
        articles,
        score: articles.length * candidate.confidence, // Weight by confidence
      };
    } catch (error) {
      console.error(`[MCP INTELLIGENT ERROR] Failed for "${candidate.term}":`, error);
      return {
        candidate,
        articles: [],
        score: 0,
      };
    }
  });

  // Wait for all searches
  const results = await Promise.all(searchPromises);

  // Find best result (highest score)
  const bestResult = results.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  console.log(`[MCP INTELLIGENT] Best candidate: "${bestResult.candidate.term}" with ${bestResult.articles.length} articles`);

  return bestResult.articles;
}

/**
 * LEGACY SEARCH (Old behavior with simple fallback)
 * Kept for compatibility
 */
async function searchSupplementInPubMedLegacy(
  supplementName: string,
  options: MCPSearchOptions = {}
): Promise<PubMedArticle[]> {
  const {
    maxResults = 20,
    filterRCTs = true,
    filterMetaAnalyses = true,
    minYear = 2010,
  } = options;

  console.log(`[MCP] Searching PubMed for: ${supplementName}`);

  try {
    // Build search query with filters
    const query = buildPubMedQuery(supplementName, {
      filterRCTs,
      filterMetaAnalyses,
      minYear,
    });

    // Call Medical MCP
    const articles = await callMCPTool('search-medical-literature', {
      query,
      max_results: maxResults,
    });

    console.log(`[MCP] Found ${articles.length} articles for ${supplementName}`);

    // FALLBACK: If insufficient results (< 5) and query might be in Spanish, try English
    // We need at least 5 high-quality studies for robust analysis
    const MINIMUM_STUDIES = 5;

    if (articles.length < MINIMUM_STUDIES) {
      const englishQuery = tryTranslateQuery(supplementName);
      if (englishQuery && englishQuery !== supplementName.toLowerCase()) {
        console.log(`[MCP FALLBACK] Only ${articles.length} results for "${supplementName}" (need ${MINIMUM_STUDIES}), trying "${englishQuery}"`);

        const englishQueryFull = buildPubMedQuery(englishQuery, {
          filterRCTs,
          filterMetaAnalyses,
          minYear,
        });

        const englishArticles = await callMCPTool('search-medical-literature', {
          query: englishQueryFull,
          max_results: maxResults,
        });

        console.log(`[MCP FALLBACK] Found ${englishArticles.length} articles for "${englishQuery}"`);

        // Only use English results if they're better than Spanish
        if (englishArticles.length > articles.length) {
          console.log(`[MCP FALLBACK] Using English results (${englishArticles.length} > ${articles.length})`);
          return englishArticles;
        } else {
          console.log(`[MCP FALLBACK] Keeping original results (${articles.length} >= ${englishArticles.length})`);
        }
      }
    }

    return articles;
  } catch (error) {
    console.error(`[MCP ERROR] Failed to search PubMed for ${supplementName}:`, error);
    throw error;
  }
}

/**
 * Build optimized PubMed query with filters
 */
function buildPubMedQuery(
  supplement: string,
  filters: {
    filterRCTs: boolean;
    filterMetaAnalyses: boolean;
    minYear: number;
  }
): string {
  const parts: string[] = [];

  // Main search term
  parts.push(`${supplement}[Title/Abstract]`);

  // Publication type filters
  const publicationTypes: string[] = [];
  if (filters.filterRCTs) {
    publicationTypes.push('randomized controlled trial[Publication Type]');
  }
  if (filters.filterMetaAnalyses) {
    publicationTypes.push('meta-analysis[Publication Type]');
    publicationTypes.push('systematic review[Publication Type]');
  }

  if (publicationTypes.length > 0) {
    parts.push(`(${publicationTypes.join(' OR ')})`);
  }

  // Date filter
  if (filters.minYear) {
    parts.push(`${filters.minYear}:3000[Publication Date]`);
  }

  // Combine with AND
  return parts.join(' AND ');
}

/**
 * Call Medical MCP tool via stdio
 *
 * This is a simplified implementation. In production, you might want to:
 * - Use a persistent MCP connection
 * - Implement connection pooling
 * - Add retry logic
 */
async function callMCPTool(
  toolName: string,
  params: Record<string, any>
): Promise<any> {
  // For now, we'll use a direct HTTP call to PubMed API
  // In production, this would call the MCP server via stdio protocol

  if (toolName === 'search-medical-literature') {
    return await searchPubMedDirect(params.query, params.max_results);
  }

  throw new Error(`MCP tool ${toolName} not implemented`);
}

/**
 * Direct PubMed API search (fallback/alternative to MCP)
 * OPTIMIZED: Uses parallel fetching + quality ranking
 */
async function searchPubMedDirect(
  query: string,
  maxResults: number
): Promise<PubMedArticle[]> {
  const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  try {
    // Respect rate limits
    await respectRateLimit();

    // Step 1: Search for article IDs
    const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}`;

    console.log(`[PUBMED] Searching: ${query}`);

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    const idList = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) {
      console.log(`[PUBMED] No results found`);
      return [];
    }

    console.log(`[PUBMED] Found ${idList.length} article IDs`);

    // Step 2: Fetch article details in parallel chunks (OPTIMIZED)
    const articles = await fetchArticlesInParallel(idList);

    console.log(`[PUBMED] Fetched ${articles.length} articles`);

    // Step 3: Rank by quality and return top 12 (OPTIMIZED)
    const rankedArticles = rankStudiesByQuality(articles, 12);

    console.log(`[PUBMED] Returning top ${rankedArticles.length} highest-quality studies`);

    return rankedArticles;
  } catch (error) {
    console.error('[PUBMED ERROR] Failed to search:', error);
    throw error;
  }
}

/**
 * Parse PubMed XML response
 * This is a simplified parser - production would use a proper XML parser
 */
function parsePubMedXML(xmlText: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];

  // Split by article boundaries
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g);

  if (!articleMatches) return articles;

  for (const articleXml of articleMatches) {
    try {
      // Extract PMID
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch?.[1];
      if (!pmid) {
        console.log('[PARSER] Skipping article: No PMID found');
        continue;
      }

      // Extract title (handle HTML tags inside title)
      const titleMatch = articleXml.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/);
      let title = 'No title available';
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }

      // Extract abstract
      let abstract = 'No abstract available';
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);
      if (abstractMatch) {
        abstract = abstractMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }

      // Extract authors
      const authors: string[] = [];
      const authorMatches = articleXml.match(/<Author[\s\S]*?<\/Author>/g);
      if (authorMatches) {
        for (const authorXml of authorMatches.slice(0, 5)) { // First 5 authors
          const lastNameMatch = authorXml.match(/<LastName>([^<]+)<\/LastName>/);
          const initialsMatch = authorXml.match(/<Initials>([^<]+)<\/Initials>/);
          if (lastNameMatch) {
            const lastName = lastNameMatch[1];
            const initials = initialsMatch?.[1] || '';
            authors.push(`${lastName} ${initials}`.trim());
          }
        }
      }

      // Extract journal
      const journalMatch = articleXml.match(/<Title>([^<]+)<\/Title>/);
      const journal = journalMatch?.[1] || 'Unknown journal';

      // Extract year
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

      // Extract publication types
      const publicationTypes: string[] = [];
      const pubTypeMatches = articleXml.match(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g);
      if (pubTypeMatches) {
        for (const match of pubTypeMatches) {
          const typeMatch = match.match(/>([^<]+)</);
          if (typeMatch) {
            publicationTypes.push(typeMatch[1]);
          }
        }
      }

      // Extract PMC ID if available
      const pmcMatch = articleXml.match(/<ArticleId IdType="pmc">PMC(\d+)<\/ArticleId>/);
      const pmcId = pmcMatch ? `PMC${pmcMatch[1]}` : undefined;

      articles.push({
        pmid,
        title,
        abstract,
        authors,
        journal,
        year,
        publicationTypes,
        pmcId,
      });
    } catch (error) {
      console.error('[PARSER ERROR] Failed to parse article:', error);
      continue;
    }
  }

  return articles;
}

/**
 * Get detailed article by PMID
 */
export async function getArticleByPMID(pmid: string): Promise<PubMedArticle | null> {
  try {
    const articles = await searchPubMedDirect(`${pmid}[PMID]`, 1);
    return articles[0] || null;
  } catch (error) {
    console.error(`[PUBMED ERROR] Failed to get article ${pmid}:`, error);
    return null;
  }
}

/**
 * Filter articles by quality criteria
 */
export function filterHighQualityStudies(
  articles: PubMedArticle[],
  criteria: {
    requireRCT?: boolean;
    requireMetaAnalysis?: boolean;
    minYear?: number;
    requireAbstract?: boolean;
  } = {}
): PubMedArticle[] {
  return articles.filter(article => {
    // Check RCT requirement
    if (criteria.requireRCT) {
      const isRCT = article.publicationTypes.some(type =>
        type.toLowerCase().includes('randomized controlled trial')
      );
      if (!isRCT) return false;
    }

    // Check meta-analysis requirement
    if (criteria.requireMetaAnalysis) {
      const isMetaAnalysis = article.publicationTypes.some(type =>
        type.toLowerCase().includes('meta-analysis') ||
        type.toLowerCase().includes('systematic review')
      );
      if (!isMetaAnalysis) return false;
    }

    // Check year
    if (criteria.minYear && article.year < criteria.minYear) {
      return false;
    }

    // Check abstract
    if (criteria.requireAbstract && article.abstract === 'No abstract available') {
      return false;
    }

    return true;
  });
}

/**
 * Get study quality metrics
 */
export function getStudyQualityMetrics(articles: PubMedArticle[]): {
  total: number;
  rctCount: number;
  metaAnalysisCount: number;
  systematicReviewCount: number;
  avgYear: number;
  qualityScore: 'high' | 'medium' | 'low';
} {
  const rctCount = articles.filter(a =>
    a.publicationTypes.some(t => t.toLowerCase().includes('randomized controlled trial'))
  ).length;

  const metaAnalysisCount = articles.filter(a =>
    a.publicationTypes.some(t => t.toLowerCase().includes('meta-analysis'))
  ).length;

  const systematicReviewCount = articles.filter(a =>
    a.publicationTypes.some(t => t.toLowerCase().includes('systematic review'))
  ).length;

  const avgYear = articles.length > 0
    ? Math.round(articles.reduce((sum, a) => sum + a.year, 0) / articles.length)
    : new Date().getFullYear();

  // Determine quality score
  let qualityScore: 'high' | 'medium' | 'low' = 'low';
  if (metaAnalysisCount >= 2 && rctCount >= 10) {
    qualityScore = 'high';
  } else if (rctCount >= 5 || metaAnalysisCount >= 1) {
    qualityScore = 'medium';
  }

  return {
    total: articles.length,
    rctCount,
    metaAnalysisCount,
    systematicReviewCount,
    avgYear,
    qualityScore,
  };
}

// ====================================
// OPTIMIZATION: RANKING & FILTERING
// ====================================

/**
 * OPTIMIZATION: Rank studies by quality score
 *
 * Scoring criteria:
 * - Meta-analysis: 100 points
 * - RCT: 80 points
 * - Systematic Review: 70 points
 * - Recency bonus: +1 point per year after 2010
 * - Abstract presence: +10 points
 *
 * @param articles - Articles to rank
 * @param topN - Number of top articles to return (default: 12)
 * @returns Top N articles sorted by quality score
 */
export function rankStudiesByQuality(
  articles: PubMedArticle[],
  topN: number = 12
): PubMedArticle[] {
  const currentYear = new Date().getFullYear();

  // Calculate quality score for each article
  const articlesWithScores = articles.map(article => {
    let score = 0;

    // Publication type scoring (highest wins)
    const types = article.publicationTypes.map(t => t.toLowerCase());
    if (types.some(t => t.includes('meta-analysis'))) {
      score += 100;
    } else if (types.some(t => t.includes('randomized controlled trial'))) {
      score += 80;
    } else if (types.some(t => t.includes('systematic review'))) {
      score += 70;
    } else {
      score += 40; // Other study types
    }

    // Recency bonus (more recent = better)
    const yearsSince2010 = Math.max(0, article.year - 2010);
    score += yearsSince2010;

    // Abstract presence
    if (article.abstract && article.abstract !== 'No abstract available') {
      score += 10;
    }

    // PMC ID presence (indicates full text available)
    if (article.pmcId) {
      score += 5;
    }

    return { article, score };
  });

  // Sort by score (descending) and return top N
  const ranked = articlesWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(item => item.article);

  console.log(`[RANKING] Ranked ${articles.length} studies, returning top ${ranked.length}`);
  console.log(`[RANKING] Score range: ${articlesWithScores[0]?.score || 0} - ${articlesWithScores[articlesWithScores.length - 1]?.score || 0}`);

  return ranked;
}

// ====================================
// OPTIMIZATION: PARALLEL FETCHING
// ====================================

/**
 * OPTIMIZATION: Fetch article details in parallel chunks
 *
 * Instead of fetching all 20 articles sequentially (5 seconds),
 * we fetch in chunks of 5 in parallel (2.2 seconds)
 *
 * @param pmids - Array of PubMed IDs to fetch
 * @param chunkSize - Number of articles to fetch per chunk (default: 5)
 * @returns Array of parsed articles
 */
async function fetchArticlesInParallel(
  pmids: string[],
  chunkSize: number = 5
): Promise<PubMedArticle[]> {
  const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  // Split PMIDs into chunks
  const chunks: string[][] = [];
  for (let i = 0; i < pmids.length; i += chunkSize) {
    chunks.push(pmids.slice(i, i + chunkSize));
  }

  console.log(`[PARALLEL FETCH] Fetching ${pmids.length} articles in ${chunks.length} chunks of ${chunkSize}`);

  // Fetch all chunks in parallel
  const chunkPromises = chunks.map(async (chunk, index) => {
    // Respect rate limits with staggered delays
    await new Promise(resolve => setTimeout(resolve, index * 350)); // 350ms between chunks

    const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${chunk.join(',')}&retmode=xml`;

    try {
      const fetchResponse = await fetch(fetchUrl);
      const xmlText = await fetchResponse.text();
      const articles = parsePubMedXML(xmlText);
      console.log(`[PARALLEL FETCH] Chunk ${index + 1}/${chunks.length}: Fetched ${articles.length} articles`);
      return articles;
    } catch (error) {
      console.error(`[PARALLEL FETCH ERROR] Chunk ${index + 1} failed:`, error);
      return [];
    }
  });

  // Wait for all chunks and flatten results
  const results = await Promise.all(chunkPromises);
  const allArticles = results.flat();

  console.log(`[PARALLEL FETCH] Total fetched: ${allArticles.length} articles`);

  return allArticles;
}
