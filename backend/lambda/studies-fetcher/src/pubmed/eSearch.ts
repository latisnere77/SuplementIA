/**
 * PubMed ESearch Wrapper
 * Handles search operations
 */

import { pubmedClient } from './client';

export interface ESearchOptions {
  db?: string;
  term: string;
  retmax?: number;
  retstart?: number;
  sort?: 'relevance' | 'pub_date' | 'Author' | 'JournalName';
  usehistory?: boolean;
  WebEnv?: string;
  query_key?: number;
  reldate?: number;
  datetype?: 'pdat' | 'mdat' | 'edat';
}

export interface ESearchResult {
  count: number;
  idList: string[];
  webEnv?: string;
  queryKey?: number;
  translationSet?: any;
}

/**
 * Execute ESearch query
 */
export async function eSearch(options: ESearchOptions): Promise<ESearchResult> {
  const params: Record<string, string> = {
    db: options.db || 'pubmed',
    term: options.term,
    retmode: 'json',
    retmax: (options.retmax || 20).toString(),
  };

  // Optional parameters
  if (options.retstart !== undefined) {
    params.retstart = options.retstart.toString();
  }

  if (options.sort) {
    params.sort = options.sort;
  }

  if (options.usehistory) {
    params.usehistory = 'y';
  }

  if (options.WebEnv) {
    params.WebEnv = options.WebEnv;
  }

  if (options.query_key !== undefined) {
    params.query_key = options.query_key.toString();
  }

  if (options.reldate !== undefined) {
    params.reldate = options.reldate.toString();
  }

  if (options.datetype) {
    params.datetype = options.datetype;
  }

  const url = pubmedClient.buildUrl('esearch', params);
  const response = await pubmedClient.request(url);
  const data = await response.json() as any;

  const result = data.esearchresult;

  return {
    count: parseInt(result.count || '0'),
    idList: result.idlist || [],
    webEnv: result.webenv,
    queryKey: result.querykey ? parseInt(result.querykey) : undefined,
    translationSet: result.translationset,
  };
}

/**
 * Search with automatic history server usage
 */
export async function eSearchWithHistory(
  term: string,
  options: Omit<ESearchOptions, 'term' | 'usehistory'> = {}
): Promise<ESearchResult> {
  return eSearch({
    ...options,
    term,
    usehistory: true,
  });
}
