/**
 * Integration tests for the PubMed search pipeline.
 * Mocks fetch to avoid hitting real PubMed API.
 */
import { searchPubMed, PubMedQueryResult } from '@/lib/services/pubmed-search';

// Mock PubMed API responses
function mockESearchXml(count: number = 5): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>${count}</Count>
  <RetMax>${count}</RetMax>
  <WebEnv>MCID_mock_webenv_12345</WebEnv>
  <QueryKey>1</QueryKey>
  <IdList>
    ${Array.from({ length: count }, (_, i) => `<Id>${30000000 + i}</Id>`).join('\n    ')}
  </IdList>
</eSearchResult>`;
}

function mockESummaryJson(count: number = 5): object {
  const uids = Array.from({ length: count }, (_, i) => String(30000000 + i));
  const result: Record<string, unknown> = { uids };
  for (const uid of uids) {
    result[uid] = {
      uid,
      pubdate: '2024 Jan',
      title: `A randomized controlled trial of supplement therapy`,
      authors: [{ name: 'Smith J' }],
      source: 'J Supplement Res',
    };
  }
  return { result };
}

function mockEmptyESearchXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>0</Count>
  <RetMax>0</RetMax>
  <IdList></IdList>
</eSearchResult>`;
}

// Setup global fetch mock
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (typeof url === 'string' && url.includes('esearch.fcgi')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockESearchXml(3)),
      } as Response);
    }
    if (typeof url === 'string' && url.includes('esummary.fcgi')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockESummaryJson(3)),
      } as Response);
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  }) as jest.Mock;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Known supplements do not error', () => {
  const representativeSupplements = [
    'manzanilla',
    'cúrcuma',
    'ashwagandha',
    'magnesio',
    'melatonina',
    'valeriana',
    'omega-3',
    'probióticos',
    'rhodiola',
    'ginseng',
  ];

  test.each(representativeSupplements)(
    'searchPubMed("%s") does not throw',
    async (supplement) => {
      await expect(searchPubMed(supplement)).resolves.not.toThrow();
    }
  );
});

describe('searchPubMed returns correct shape', () => {
  it('returns PubMedQueryResult with expected fields', async () => {
    const result = await searchPubMed('joint pain');
    expect(result).toHaveProperty('searchType', 'condition');
    expect(result).toHaveProperty('condition', 'joint pain');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('supplementsByEvidence');
    expect(result.supplementsByEvidence).toHaveProperty('gradeA');
    expect(result.supplementsByEvidence).toHaveProperty('gradeB');
    expect(result.supplementsByEvidence).toHaveProperty('gradeC');
    expect(result.supplementsByEvidence).toHaveProperty('gradeD');
  });
});

describe('Unknown terms return empty results', () => {
  it('searchPubMed with unknown term returns empty results (not throws)', async () => {
    // Mock empty PubMed response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockEmptyESearchXml()),
      } as Response)
    ) as jest.Mock;

    const result = await searchPubMed('xyz_nonexistent_12345');
    expect(result.supplementsByEvidence.gradeA).toHaveLength(0);
    expect(result.supplementsByEvidence.gradeB).toHaveLength(0);
    expect(result.supplementsByEvidence.gradeC).toHaveLength(0);
    expect(result.supplementsByEvidence.gradeD).toHaveLength(0);
  });
});

describe('Network failures handled gracefully', () => {
  it('returns empty results on fetch rejection', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      } as Response)
    ) as jest.Mock;

    const result = await searchPubMed('magnesium');
    // Should not throw, should return empty
    expect(result.supplementsByEvidence.gradeA).toHaveLength(0);
    expect(result.supplementsByEvidence.gradeB).toHaveLength(0);
  });
});
