import { isValidPmid } from './pmid';

export interface VerifiedPmid {
  pmid: string;
  title?: string;
  journal?: string;
  year?: string;
}

export interface PmidVerifierOptions {
  endpoint?: string;
  timeoutMs?: number;
  maxPmids?: number;
  fetchFn?: typeof fetch;
}

export interface PmidVerificationResult {
  status: 'not_checked' | 'all_valid' | 'partially_valid' | 'none_valid' | 'verification_failed';
  validatedPmids: string[];
  articles: VerifiedPmid[];
  rejectedPmids: string[];
  error?: string;
  externalCalls: number;
}

interface PubMedSummaryResponse {
  result?: {
    uids?: string[];
    [pmid: string]:
      | {
          uid?: string;
          title?: string;
          fulljournalname?: string;
          source?: string;
          pubdate?: string;
          sortpubdate?: string;
        }
      | string[]
      | undefined;
  };
}

const DEFAULT_EUTILS_SUMMARY_ENDPOINT = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_PMIDS = 20;

export async function verifyPubMedPmids(
  candidatePmids: string[],
  options: PmidVerifierOptions = {}
): Promise<PmidVerificationResult> {
  const maxPmids = options.maxPmids ?? DEFAULT_MAX_PMIDS;
  const numericPmids = unique(candidatePmids.filter(isValidPmid)).slice(0, maxPmids);
  const rejectedPmids = unique(candidatePmids.filter((pmid) => !isValidPmid(pmid)));

  if (numericPmids.length === 0) {
    return {
      status: 'not_checked',
      validatedPmids: [],
      articles: [],
      rejectedPmids,
      externalCalls: 0,
    };
  }

  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    return {
      status: 'verification_failed',
      validatedPmids: [],
      articles: [],
      rejectedPmids,
      error: 'fetch is not available in this runtime',
      externalCalls: 0,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const url = new URL(options.endpoint ?? DEFAULT_EUTILS_SUMMARY_ENDPOINT);
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('id', numericPmids.join(','));
    url.searchParams.set('retmode', 'json');

    const response = await fetchFn(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      return {
        status: 'verification_failed',
        validatedPmids: [],
        articles: [],
        rejectedPmids,
        error: `PubMed E-utilities returned HTTP ${response.status}`,
        externalCalls: 1,
      };
    }

    const body = (await response.json()) as PubMedSummaryResponse;
    const uids = new Set(body.result?.uids ?? []);
    const articles: VerifiedPmid[] = [];

    for (const pmid of numericPmids) {
      if (!uids.has(pmid)) continue;
      const summary = body.result?.[pmid];
      if (!summary || Array.isArray(summary)) continue;
      if (!summary.uid || !summary.title) continue;

      articles.push({
        pmid,
        title: summary.title,
        journal: summary.fulljournalname || summary.source,
        year: extractYear(summary.pubdate || summary.sortpubdate),
      });
    }

    const validatedPmids = articles.map((article) => article.pmid);
    return {
      status: statusForValidation(numericPmids.length, validatedPmids.length),
      validatedPmids,
      articles,
      rejectedPmids: [
        ...rejectedPmids,
        ...numericPmids.filter((pmid) => !validatedPmids.includes(pmid)),
      ],
      externalCalls: 1,
    };
  } catch (error) {
    return {
      status: 'verification_failed',
      validatedPmids: [],
      articles: [],
      rejectedPmids,
      error: error instanceof Error ? error.message : 'PubMed verification failed',
      externalCalls: 1,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function statusForValidation(candidateCount: number, validCount: number): PmidVerificationResult['status'] {
  if (validCount === 0) return 'none_valid';
  if (validCount === candidateCount) return 'all_valid';
  return 'partially_valid';
}

function extractYear(value: string | undefined): string | undefined {
  return value?.match(/\b(19|20)\d{2}\b/)?.[0];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
