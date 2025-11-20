/**
 * Type definitions for Studies Fetcher
 */

export interface StudySearchRequest {
  supplementName: string;
  maxResults?: number;
  filters?: StudyFilters;
}

export interface StudyFilters {
  studyTypes?: StudyType[];
  yearFrom?: number;
  yearTo?: number;
  humanStudiesOnly?: boolean;
  rctOnly?: boolean;
}

export type StudyType =
  | 'randomized controlled trial'
  | 'meta-analysis'
  | 'systematic review'
  | 'clinical trial'
  | 'review';

export interface Study {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  journal?: string;
  studyType?: StudyType;
  participants?: number;
  doi?: string;
  pubmedUrl: string;
}

export interface StudiesResponse {
  success: boolean;
  data?: {
    studies: Study[];
    totalFound: number;
    searchQuery: string;
  };
  metadata?: {
    supplementName: string;
    searchDuration: number;
    source: 'pubmed';
  };
  error?: string;
  message?: string;
}

// PubMed API types
export interface PubMedSearchResult {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
  };
}

export interface PubMedArticle {
  MedlineCitation: {
    PMID: { _: string }[];
    Article: {
      ArticleTitle: string[];
      Abstract?: {
        AbstractText: Array<string | { _: string }>;
      }[];
      AuthorList?: {
        Author: Array<{
          LastName?: string[];
          ForeName?: string[];
          Initials?: string[];
        }>;
      }[];
      Journal: {
        Title?: string[];
        JournalIssue?: {
          PubDate?: {
            Year?: string[];
            Month?: string[];
          }[];
        }[];
      };
      PublicationTypeList?: {
        PublicationType: Array<{ _: string }>;
      }[];
    }[];
  }[];
  PubmedData?: {
    ArticleIdList?: {
      ArticleId: Array<{
        _: string;
        $: { IdType: string };
      }>;
    }[];
  }[];
}
