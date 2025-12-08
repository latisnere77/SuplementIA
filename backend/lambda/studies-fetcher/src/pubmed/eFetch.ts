/**
 * PubMed EFetch Wrapper
 * Handles fetching full records
 */

import { parseStringPromise } from 'xml2js';
import { pubmedClient } from './client';
import { Study } from '../types';

export interface EFetchOptions {
  db?: string;
  id?: string[];
  WebEnv?: string;
  query_key?: number;
  retstart?: number;
  retmax?: number;
}

/**
 * Fetch full records from PubMed
 */
export async function eFetch(options: EFetchOptions): Promise<Study[]> {
  const params: Record<string, string> = {
    db: options.db || 'pubmed',
    retmode: 'xml',
  };

  // Either use IDs or History Server
  if (options.id && options.id.length > 0) {
    params.id = options.id.join(',');
  } else if (options.WebEnv && options.query_key !== undefined) {
    params.WebEnv = options.WebEnv;
    params.query_key = options.query_key.toString();
  } else {
    throw new Error('Either id or WebEnv+query_key must be provided');
  }

  // Optional pagination
  if (options.retstart !== undefined) {
    params.retstart = options.retstart.toString();
  }

  if (options.retmax !== undefined) {
    params.retmax = options.retmax.toString();
  }

  const url = pubmedClient.buildUrl('efetch', params);
  const response = await pubmedClient.request(url);
  const xmlText = await response.text();

  // Parse XML
  const parsed = await parseStringPromise(xmlText);
  const articles = parsed.PubmedArticleSet?.PubmedArticle || [];

  return articles
    .map((article: any) => parseArticle(article))
    .filter((study: Study | null): study is Study => study !== null);
}

/**
 * PubMed XML Article Structure (from xml2js parser)
 */
interface PubMedArticleXML {
  MedlineCitation: Array<{
    PMID: Array<string | { _: string }>;
    Article: Array<{
      ArticleTitle: string[];
      Abstract?: Array<{ AbstractText?: string[] }>;
      AuthorList?: Array<{ Author?: unknown[] }>;
      Journal?: Array<{
        Title?: string[];
        JournalIssue?: Array<{ PubDate?: Array<{ Year?: string[] }> }>;
      }>;
    }>;
    MeshHeadingList?: Array<{ MeshHeading?: unknown[] }>;
  }>;
}

/**
 * Parse PubMed article XML to Study object
 */
function parseArticle(article: PubMedArticleXML): Study | null {
  try {
    const citation = article.MedlineCitation[0];
    const articleData = citation.Article[0];

    // PMID (required)
    const pmidValue = citation.PMID[0];
    const pmid = typeof pmidValue === 'string' ? pmidValue : pmidValue._;
    if (!pmid) return null;

    // Title (required)
    const title = articleData.ArticleTitle[0];
    if (!title) return null;

    // Abstract
    let abstract = '';
    if (articleData.Abstract?.[0]?.AbstractText) {
      const abstractParts = articleData.Abstract[0].AbstractText;
      abstract = abstractParts
        .map((part: any) => (typeof part === 'string' ? part : part._))
        .join(' ')
        .trim();
    }

    // Authors
    const authors: string[] = [];
    if (articleData.AuthorList?.[0]?.Author) {
      for (const author of articleData.AuthorList[0].Author as Array<{ LastName?: string[]; ForeName?: string[]; Initials?: string[]; }>) {
        const lastName = author.LastName?.[0] || '';
        const foreName = author.ForeName?.[0] || author.Initials?.[0] || '';
        if (lastName) {
          authors.push(`${lastName} ${foreName}`.trim());
        }
      }
    }

    // Year
    let year = 0;
    const yearData = articleData.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0];
    if (yearData) {
      year = parseInt(yearData);
    }

    // Journal
    const journal = articleData.Journal?.[0]?.Title?.[0] || '';

    // Study type
    const studyType = extractStudyType(articleData) as any;

    // DOI
    const doi = extractDOI(article);

    // Participants
    const participants = extractParticipantCount(abstract);

    return {
      pmid,
      title,
      abstract: abstract || 'No abstract available',
      authors: authors.slice(0, 5),
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
 * Extract study type from publication types
 */
function extractStudyType(articleData: any): string | undefined {
  if (!articleData.PublicationTypeList?.[0]?.PublicationType) {
    return undefined;
  }

  const types = articleData.PublicationTypeList[0].PublicationType
    .map((t: any) => {
      const typeValue = typeof t === 'string' ? t : (t._ || t);
      return typeof typeValue === 'string' ? typeValue.toLowerCase() : '';
    })
    .filter(Boolean);

  // Priority order
  if (types.includes('meta-analysis')) return 'meta-analysis';
  if (types.includes('systematic review')) return 'systematic review';
  if (types.includes('randomized controlled trial')) return 'randomized controlled trial';
  if (types.includes('clinical trial')) return 'clinical trial';
  if (types.includes('review')) return 'review';

  return undefined;
}

/**
 * Extract DOI from article
 */
function extractDOI(article: any): string | undefined {
  const ids = article.PubmedData?.[0]?.ArticleIdList?.[0]?.ArticleId;
  if (!ids) return undefined;

  const doiObj = ids.find((id: any) => id.$.IdType === 'doi');
  return doiObj?._ || undefined;
}

/**
 * Extract participant count from abstract
 */
function extractParticipantCount(abstract: string): number | undefined {
  if (!abstract) return undefined;

  const patterns = [
    /\bn\s*=\s*(\d+)/i,
    /(\d+)\s+participants/i,
    /(\d+)\s+subjects/i,
    /(\d+)\s+patients/i,
  ];

  for (const pattern of patterns) {
    const match = abstract.match(pattern);
    if (match?.[1]) {
      const count = parseInt(match[1]);
      if (count > 0 && count < 100000) {
        return count;
      }
    }
  }

  return undefined;
}
