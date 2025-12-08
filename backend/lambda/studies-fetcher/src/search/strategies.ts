/**
 * Search Strategies
 * Different approaches to find relevant studies
 */

import { Study } from '../types';
import { multiSearchWithHistory } from '../pubmed/historyServer';
import {
  buildHighQualityQuery,
  buildRecentQuery,
  buildNegativeQuery,
  buildSystematicReviewQuery,
} from '../pubmed/queryBuilder';
import { MESH_MAP } from './mesh-map';

export interface SearchStrategyOptions {
  maxResults?: number;
  includeNegativeSearch?: boolean;
  includeSystematicReviews?: boolean;
}

/**
 * Multi-strategy search using History Server
 * Combines high-quality, recent, and negative studies
 */
export async function multiStrategySearch(
  supplementName: string,
  options: SearchStrategyOptions = {}
): Promise<Study[]> {
  const {
    maxResults = 200,
    includeNegativeSearch = true,
    includeSystematicReviews = true,
  } = options;

  // Use MeSH term if available, otherwise use the original supplement name
  const searchTerm = MESH_MAP[supplementName.toLowerCase()] || supplementName;
  const isMeSH = searchTerm !== supplementName;

  console.log(JSON.stringify({
    event: 'SEARCH_TERM_SELECTED',
    original: supplementName,
    final: searchTerm,
    isMeSH,
  }));

  const queries: string[] = [];

  // Strategy 1: High-quality studies (RCT, Meta-analysis, Systematic Reviews)
  queries.push(buildHighQualityQuery(searchTerm));

  // Strategy 2: Recent studies (last 5 years)
  queries.push(buildRecentQuery(searchTerm, 5));

  // Strategy 3: Systematic reviews (if enabled)
  if (includeSystematicReviews) {
    queries.push(buildSystematicReviewQuery(searchTerm));
  }

  // Strategy 4: Negative/null results (if enabled)
  if (includeNegativeSearch) {
    queries.push(buildNegativeQuery(searchTerm));
  }

  console.log(JSON.stringify({
    event: 'MULTI_STRATEGY_START',
    supplementName,
    searchTerm,
    strategies: queries.length,
    timestamp: new Date().toISOString(),
  }));

  // Execute all searches using History Server
  const { studies } = await multiSearchWithHistory(queries, {
    retmax: maxResults,
    sort: 'relevance',
  });

  console.log(JSON.stringify({
    event: 'MULTI_STRATEGY_COMPLETE',
    supplementName,
    studiesFound: studies.length,
    timestamp: new Date().toISOString(),
  }));

  return studies;
}

/**
 * Simple search strategy (fallback)
 */
export async function simpleSearch(
  supplementName: string,
  maxResults: number = 50
): Promise<Study[]> {
  const { eSearch } = await import('../pubmed/eSearch');
  const { eFetch } = await import('../pubmed/eFetch');

  const searchResult = await eSearch({
    term: `${supplementName}[tiab]`,
    retmax: maxResults,
    sort: 'relevance',
  });

  if (searchResult.idList.length === 0) {
    return [];
  }

  return eFetch({
    id: searchResult.idList,
  });
}
