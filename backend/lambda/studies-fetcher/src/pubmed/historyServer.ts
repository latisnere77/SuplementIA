/**
 * PubMed History Server Operations
 * Manages WebEnv and QueryKey for efficient multi-search operations
 */

import { eSearch, ESearchResult } from './eSearch';
import { eFetch } from './eFetch';
import { Study } from '../types';

export interface HistorySession {
  webEnv: string;
  queryKeys: number[];
}

/**
 * Execute multiple searches and combine results using History Server
 */
export async function multiSearchWithHistory(
  queries: string[],
  options: {
    retmax?: number;
    sort?: 'relevance' | 'pub_date';
  } = {}
): Promise<{ studies: Study[]; session: HistorySession }> {
  if (queries.length === 0) {
    throw new Error('At least one query is required');
  }

  const queryKeys: number[] = [];
  let webEnv: string | undefined;

  // Execute each search and accumulate on History Server
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];

    console.log(JSON.stringify({
      event: 'HISTORY_SEARCH',
      queryIndex: i + 1,
      totalQueries: queries.length,
      query: query.substring(0, 100),
      timestamp: new Date().toISOString(),
    }));

    const result = await eSearch({
      term: query,
      usehistory: true,
      WebEnv: webEnv, // Reuse WebEnv from first search
      retmax: 0, // Don't return IDs, just post to history
    });

    if (!result.webEnv || result.queryKey === undefined) {
      throw new Error('History server did not return WebEnv/QueryKey');
    }

    webEnv = result.webEnv;
    queryKeys.push(result.queryKey);
  }

  if (!webEnv) {
    throw new Error('No WebEnv created');
  }

  // Combine all query keys with OR
  const combinedQuery = queryKeys.map(key => `#${key}`).join(' OR ');

  console.log(JSON.stringify({
    event: 'HISTORY_COMBINE',
    queryKeys,
    combinedQuery,
    timestamp: new Date().toISOString(),
  }));

  // Execute combined search
  const combinedResult = await eSearch({
    term: combinedQuery,
    usehistory: true,
    WebEnv: webEnv,
    retmax: options.retmax || 200,
    sort: options.sort || 'relevance',
  });

  if (!combinedResult.webEnv || combinedResult.queryKey === undefined) {
    throw new Error('Combined search did not return WebEnv/QueryKey');
  }

  // Fetch all studies from combined result
  const studies = await eFetch({
    WebEnv: combinedResult.webEnv,
    query_key: combinedResult.queryKey,
    retmax: options.retmax || 200,
  });

  console.log(JSON.stringify({
    event: 'HISTORY_COMPLETE',
    totalStudies: studies.length,
    uniquePMIDs: new Set(studies.map(s => s.pmid)).size,
    timestamp: new Date().toISOString(),
  }));

  return {
    studies,
    session: {
      webEnv: combinedResult.webEnv,
      queryKeys: [...queryKeys, combinedResult.queryKey],
    },
  };
}

/**
 * Fetch studies from an existing History Server session
 */
export async function fetchFromHistory(
  session: HistorySession,
  queryKey: number,
  options: {
    retstart?: number;
    retmax?: number;
  } = {}
): Promise<Study[]> {
  return eFetch({
    WebEnv: session.webEnv,
    query_key: queryKey,
    retstart: options.retstart,
    retmax: options.retmax,
  });
}
