/**
 * @jest-environment node
 *
 * Unit tests for searchPubMedForSupplement — validates slim→rich type bridge.
 * Mocks global.fetch to control executePubMedSearch responses without hitting real API.
 */
import { searchPubMedForSupplement } from '@/lib/services/pubmed-search';

// ====================================
// Mock helpers
// ====================================

function makeESearchXml(count: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>${count}</Count>
  <RetMax>${count}</RetMax>
  <WebEnv>MCID_mock_webenv_99999</WebEnv>
  <QueryKey>1</QueryKey>
  <IdList>
    ${Array.from({ length: count }, (_, i) => `<Id>${10000000 + i}</Id>`).join('\n    ')}
  </IdList>
</eSearchResult>`;
}

function makeESummaryJson(articles: Array<{
  uid: string;
  pubdate: string;
  title: string;
  authors: Array<{ name: string }> | null | undefined;
  source: string;
}>): object {
  const uids = articles.map(a => a.uid);
  const result: Record<string, unknown> = { uids };
  for (const article of articles) {
    result[article.uid] = article;
  }
  return { result };
}

function makeEmptyESearchXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>0</Count>
  <RetMax>0</RetMax>
  <IdList></IdList>
</eSearchResult>`;
}

// ====================================
// Test setup
// ====================================

const originalFetch = global.fetch;

function mockFetchSequence(
  esearchXml: string,
  esummaryJson: object
): void {
  let callCount = 0;
  global.fetch = jest.fn(() => {
    callCount++;
    if (callCount === 1) {
      // First call: esearch
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(esearchXml),
      } as Response);
    }
    // Second call: esummary
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(esummaryJson),
    } as Response);
  }) as jest.Mock;
}

afterEach(() => {
  global.fetch = originalFetch;
});

// ====================================
// Tests
// ====================================

describe('searchPubMedForSupplement', () => {
  it('maps slim esummary article to rich PubMedArticle shape', async () => {
    const slimArticle = {
      uid: '12345678',
      pubdate: '2023 Jan',
      title: 'Magnesium supplementation in adults: a randomized controlled trial',
      authors: [{ name: 'Smith J' }, { name: 'Doe A' }],
      source: 'JAMA',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('magnesium');

    expect(results).toHaveLength(1);
    const article = results[0];
    expect(article.pmid).toBe('12345678');
    expect(article.title).toBe('Magnesium supplementation in adults: a randomized controlled trial');
    expect(article.journal).toBe('JAMA');
    expect(article.year).toBe(2023);
    expect(article.authors).toEqual(['Smith J', 'Doe A']);
  });

  it('sets abstract to "No abstract available" always (esummary limitation)', async () => {
    const slimArticle = {
      uid: '11111111',
      pubdate: '2020 Jun',
      title: 'Vitamin C study',
      authors: [{ name: 'Jones B' }],
      source: 'BMJ',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('vitamin c');

    expect(results).toHaveLength(1);
    expect(results[0].abstract).toBe('No abstract available');
  });

  it('sets publicationTypes to [] always (esummary limitation)', async () => {
    const slimArticle = {
      uid: '22222222',
      pubdate: '2021 Mar',
      title: 'Zinc meta-analysis',
      authors: [{ name: 'Lee C' }],
      source: 'Cochrane',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('zinc');

    expect(results).toHaveLength(1);
    expect(results[0].publicationTypes).toEqual([]);
  });

  it('handles missing authors gracefully (returns [])', async () => {
    const slimArticle = {
      uid: '33333333',
      pubdate: '2022 Apr',
      title: 'Iron deficiency review',
      authors: null as unknown as Array<{ name: string }>,
      source: 'Lancet',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('iron');

    expect(results).toHaveLength(1);
    expect(results[0].authors).toEqual([]);
  });

  it('returns year:0 when pubdate is missing or empty', async () => {
    const slimArticle = {
      uid: '44444444',
      pubdate: '',
      title: 'Calcium trial',
      authors: [{ name: 'Brown D' }],
      source: 'NEJM',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('calcium');

    expect(results).toHaveLength(1);
    expect(results[0].year).toBe(0);
  });

  it('returns [] when esummary returns no articles (empty esearch result)', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(makeEmptyESearchXml()),
      } as Response)
    ) as jest.Mock;

    const results = await searchPubMedForSupplement('nonexistent_supplement_xyz');

    expect(results).toEqual([]);
  });

  it('extracts year correctly from pubdate with only year', async () => {
    const slimArticle = {
      uid: '55555555',
      pubdate: '2019',
      title: 'Selenium study',
      authors: [{ name: 'White E' }],
      source: 'Am J Clin Nutr',
    };

    mockFetchSequence(
      makeESearchXml(1),
      makeESummaryJson([slimArticle])
    );

    const results = await searchPubMedForSupplement('selenium');

    expect(results).toHaveLength(1);
    expect(results[0].year).toBe(2019);
  });
});
