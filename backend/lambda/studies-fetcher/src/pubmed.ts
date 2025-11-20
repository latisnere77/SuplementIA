/**
 * PubMed E-utilities client
 * https://www.ncbi.nlm.nih.gov/books/NBK25501/
 */

import { parseStringPromise } from 'xml2js';
import { config } from './config';
import { Study, StudySearchRequest, PubMedSearchResult, PubMedArticle, StudyType } from './types';

/**
 * Search PubMed for studies about a supplement
 */
export async function searchPubMed(request: StudySearchRequest): Promise<Study[]> {
  const { supplementName, maxResults = config.defaultMaxResults, filters = {} } = request;

  console.log(
    JSON.stringify({
      operation: 'PubMedSearch',
      supplementName,
      maxResults,
      filters,
    })
  );

  // Step 1: Build search query
  const searchQuery = buildSearchQuery(supplementName, filters);

  // Step 2: Search for PMIDs (ESearch)
  const pmids = await eSearch(searchQuery, maxResults);

  if (pmids.length === 0) {
    console.log('No studies found for:', supplementName);
    return [];
  }

  console.log(`Found ${pmids.length} PMIDs:`, pmids.slice(0, 5));

  // Step 3: Fetch article details (EFetch)
  await delay(config.requestDelayMs); // Rate limiting
  const studies = await eFetch(pmids);

  console.log(
    JSON.stringify({
      operation: 'PubMedSearchComplete',
      supplementName,
      studiesFound: studies.length,
    })
  );

  return studies;
}

/**
 * Build PubMed search query with filters
 */
function buildSearchQuery(supplementName: string, filters: any): string {
  const parts: string[] = [];

  // Main search term
  parts.push(`"${supplementName}"[Title/Abstract]`);

  // Add study type filters
  if (filters.studyTypes && filters.studyTypes.length > 0) {
    const typeQueries = filters.studyTypes.map((type: StudyType) => `"${type}"[Publication Type]`);
    parts.push(`(${typeQueries.join(' OR ')})`);
  } else if (filters.rctOnly) {
    parts.push('"randomized controlled trial"[Publication Type]');
  }

  // Add year filter
  if (filters.yearFrom || filters.yearTo) {
    const yearFrom = filters.yearFrom || 1900;
    const yearTo = filters.yearTo || new Date().getFullYear();
    parts.push(`${yearFrom}:${yearTo}[Date - Publication]`);
  }

  // Human studies only
  if (filters.humanStudiesOnly !== false) {
    parts.push('"humans"[MeSH Terms]');
  }

  const query = parts.join(' AND ');
  console.log('PubMed query:', query);

  return query;
}

/**
 * ESearch: Search PubMed and get PMIDs
 */
async function eSearch(query: string, maxResults: number): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'relevance',
  });

  if (config.pubmedApiKey) {
    params.append('api_key', config.pubmedApiKey);
  }

  const url = `${config.pubmedBaseUrl}/esearch.fcgi?${params.toString()}`;

  console.log('ESearch URL:', url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubMed ESearch failed: ${response.status}`);
  }

  const data = (await response.json()) as PubMedSearchResult;

  return data.esearchresult.idlist || [];
}

/**
 * EFetch: Fetch article details by PMIDs
 */
async function eFetch(pmids: string[]): Promise<Study[]> {
  if (pmids.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
  });

  if (config.pubmedApiKey) {
    params.append('api_key', config.pubmedApiKey);
  }

  const url = `${config.pubmedBaseUrl}/efetch.fcgi?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubMed EFetch failed: ${response.status}`);
  }

  const xmlText = await response.text();

  // Parse XML
  const parsed = await parseStringPromise(xmlText);

  // Extract articles
  const articles = parsed.PubmedArticleSet?.PubmedArticle || [];

  return articles.map((article: PubMedArticle) => parseArticle(article)).filter(Boolean) as Study[];
}

/**
 * Parse PubMed article XML to Study object
 */
function parseArticle(article: PubMedArticle): Study | null {
  try {
    const citation = article.MedlineCitation[0];
    const articleData = citation.Article[0];

    // PMID (required)
    const pmidValue = citation.PMID[0];
    const pmid = typeof pmidValue === 'string' ? pmidValue : (pmidValue as any)._;
    if (!pmid) return null;

    // Title (required)
    const title = articleData.ArticleTitle[0];
    if (!title) return null;

    // Abstract (optional but important)
    let abstract = '';
    if (articleData.Abstract && articleData.Abstract[0].AbstractText) {
      const abstractParts = articleData.Abstract[0].AbstractText;
      abstract = abstractParts
        .map((part: any) => (typeof part === 'string' ? part : part._))
        .join(' ')
        .trim();
    }

    // Authors
    const authors: string[] = [];
    if (articleData.AuthorList && articleData.AuthorList[0].Author) {
      for (const author of articleData.AuthorList[0].Author) {
        const lastName = author.LastName?.[0] || '';
        const foreName = author.ForeName?.[0] || author.Initials?.[0] || '';
        if (lastName) {
          authors.push(`${lastName} ${foreName}`.trim());
        }
      }
    }

    // Year
    let year = 0;
    const yearData = articleData.Journal?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0];
    if (yearData) {
      year = parseInt(yearData);
    }

    // Journal
    const journal = articleData.Journal?.Title?.[0] || '';

    // Study type
    let studyType: StudyType | undefined;
    if (articleData.PublicationTypeList && articleData.PublicationTypeList[0]?.PublicationType) {
      const types = articleData.PublicationTypeList[0].PublicationType.map((t: any) => {
        // Handle both string and object formats
        const typeValue = typeof t === 'string' ? t : (t._ || t);
        return typeof typeValue === 'string' ? typeValue.toLowerCase() : '';
      }).filter(Boolean);

      if (types.includes('randomized controlled trial')) {
        studyType = 'randomized controlled trial';
      } else if (types.includes('meta-analysis')) {
        studyType = 'meta-analysis';
      } else if (types.includes('systematic review')) {
        studyType = 'systematic review';
      } else if (types.includes('clinical trial')) {
        studyType = 'clinical trial';
      } else if (types.includes('review')) {
        studyType = 'review';
      }
    }

    // DOI
    let doi: string | undefined;
    if (article.PubmedData?.[0]?.ArticleIdList?.[0]?.ArticleId) {
      const ids = article.PubmedData[0].ArticleIdList[0].ArticleId;
      const doiObj = ids.find((id: any) => id.$.IdType === 'doi');
      if (doiObj) {
        doi = doiObj._;
      }
    }

    // Estimate participants from abstract
    const participants = extractParticipantCount(abstract);

    return {
      pmid,
      title,
      abstract: abstract || 'No abstract available',
      authors: authors.slice(0, 5), // Limit to first 5 authors
      year,
      journal,
      studyType,
      participants,
      doi,
      pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    };
  } catch (error) {
    console.error('Error parsing article:', error);
    return null;
  }
}

/**
 * Extract participant count from abstract using regex
 */
function extractParticipantCount(abstract: string): number | undefined {
  if (!abstract) return undefined;

  // Patterns to match: "n = 123", "N=123", "123 participants", etc.
  const patterns = [
    /\bn\s*=\s*(\d+)/i,
    /(\d+)\s+participants/i,
    /(\d+)\s+subjects/i,
    /(\d+)\s+patients/i,
  ];

  for (const pattern of patterns) {
    const match = abstract.match(pattern);
    if (match && match[1]) {
      const count = parseInt(match[1]);
      if (count > 0 && count < 100000) {
        // Sanity check
        return count;
      }
    }
  }

  return undefined;
}

/**
 * Delay for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
