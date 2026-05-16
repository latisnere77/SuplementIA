export type LiteratureStudyCategory =
  | 'human_clinical'
  | 'review'
  | 'preclinical'
  | 'phytochemical'
  | 'other';

export interface LiteratureProfileArticle {
  pmid: string;
  title: string;
  abstract: string;
  year?: number;
  publicationTypes: string[];
  category: LiteratureStudyCategory;
}

export interface PubMedLiteratureProfile {
  query: string;
  totalCount: number;
  sampledCount: number;
  categories: Record<LiteratureStudyCategory, number>;
  articles: LiteratureProfileArticle[];
}

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL_NAME = process.env.PUBMED_TOOL_NAME || 'SuplementiaSearch';
const TOOL_EMAIL = process.env.PUBMED_TOOL_EMAIL || 'support@suplementia.com';

const EMPTY_CATEGORIES: Record<LiteratureStudyCategory, number> = {
  human_clinical: 0,
  review: 0,
  preclinical: 0,
  phytochemical: 0,
  other: 0,
};

function escapePubMedPhrase(term: string): string {
  return term.replace(/"/g, '').trim();
}

function buildBroadQuery(term: string): string {
  const phrase = escapePubMedPhrase(term);
  return `"${phrase}"[Title/Abstract] OR "${phrase}"[All Fields]`;
}

export function classifyLiteratureArticle(input: {
  title: string;
  abstract?: string;
  publicationTypes?: string[];
}): LiteratureStudyCategory {
  const text = `${input.title} ${input.abstract || ''}`.toLowerCase();
  const types = (input.publicationTypes || []).map((type) => type.toLowerCase());

  if (
    types.some((type) =>
      type.includes('randomized controlled trial') ||
      type.includes('clinical trial') ||
      type.includes('controlled clinical trial')
    ) ||
    /\b(human|humans|patients|subjects|volunteers|participants|clinical trial|randomi[sz]ed)\b/.test(text)
  ) {
    return 'human_clinical';
  }

  if (
    types.some((type) => type.includes('review') || type.includes('meta-analysis')) ||
    /\b(review|systematic review|meta-analysis)\b/.test(text)
  ) {
    return 'review';
  }

  if (
    /\b(in vitro|cell line|cells|murine|mouse|mice|rat|rats|animal model|zebrafish|drosophila)\b/.test(text)
  ) {
    return 'preclinical';
  }

  if (
    /\b(phytochemical|essential oil|extract|compound|flavonoid|alkaloid|terpene|chemical composition|chromatograph|metabolite)\b/.test(text)
  ) {
    return 'phytochemical';
  }

  return 'other';
}

function textContent(xml: string, pattern: RegExp): string | undefined {
  const match = xml.match(pattern);
  return match?.[1]
    ?.replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArticles(xmlText: string): LiteratureProfileArticle[] {
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

  return articleMatches.flatMap((articleXml) => {
    const pmid = textContent(articleXml, /<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmid) return [];

    const title = textContent(articleXml, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) || 'No title available';
    const abstract = textContent(articleXml, /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/) || '';
    const yearText = textContent(articleXml, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const publicationTypes = [...articleXml.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map(
      (match) => match[1]
    );
    const category = classifyLiteratureArticle({ title, abstract, publicationTypes });

    return [
      {
        pmid,
        title,
        abstract,
        year: yearText ? Number(yearText) : undefined,
        publicationTypes,
        category,
      },
    ];
  });
}

export async function searchPubMedLiteratureProfile(
  term: string,
  options: { maxArticles?: number; signal?: AbortSignal } = {}
): Promise<PubMedLiteratureProfile | null> {
  const maxArticles = options.maxArticles ?? 8;
  const query = buildBroadQuery(term);
  const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxArticles}&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;

  const searchResponse = await fetch(searchUrl, { signal: options.signal });
  if (!searchResponse.ok) {
    throw new Error(`PubMed profile search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const idList: string[] = searchData.esearchresult?.idlist || [];
  const totalCount = Number(searchData.esearchresult?.count || idList.length || 0);

  if (idList.length === 0) {
    return {
      query,
      totalCount,
      sampledCount: 0,
      categories: { ...EMPTY_CATEGORIES },
      articles: [],
    };
  }

  const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;
  const fetchResponse = await fetch(fetchUrl, { signal: options.signal });
  if (!fetchResponse.ok) {
    throw new Error(`PubMed profile fetch failed: ${fetchResponse.status}`);
  }

  const articles = parseArticles(await fetchResponse.text());
  const categories = articles.reduce<Record<LiteratureStudyCategory, number>>(
    (acc, article) => {
      acc[article.category] += 1;
      return acc;
    },
    { ...EMPTY_CATEGORIES }
  );

  return {
    query,
    totalCount,
    sampledCount: articles.length,
    categories,
    articles,
  };
}

export function formatLiteratureProfileMessage(term: string, profile: PubMedLiteratureProfile | null): string {
  if (!profile || profile.totalCount === 0) {
    return `No encontramos evidencia clínica humana suficiente para confirmar beneficios de "${term}".`;
  }

  const parts: string[] = [];
  if (profile.categories.human_clinical > 0) {
    parts.push(`${profile.categories.human_clinical} clínico(s) humano(s) en la muestra`);
  }
  if (profile.categories.preclinical > 0) {
    parts.push(`${profile.categories.preclinical} preclínico(s)`);
  }
  if (profile.categories.phytochemical > 0) {
    parts.push(`${profile.categories.phytochemical} fitoquímico(s)`);
  }
  if (profile.categories.review > 0) {
    parts.push(`${profile.categories.review} revisión(es)`);
  }

  const detail = parts.length > 0 ? ` En la muestra revisada: ${parts.join(', ')}.` : '';

  return `Encontramos literatura publicada sobre "${term}" en PubMed, pero no evidencia clínica humana suficiente para confirmar beneficios.${detail} Por seguridad, no tratamos estos hallazgos como beneficios clínicos confirmados.`;
}
