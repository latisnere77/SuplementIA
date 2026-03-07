/** @jest-environment node */

/**
 * Tests for enrich-simple route
 * Mocks global.fetch to avoid calling real Lambda
 *
 * Tests cover:
 * 1. Parameter validation (missing supplementName, missing URL)
 * 2. Slug passthrough for all 6 category slugs added in Phase 6
 */

const originalFetch = global.fetch;
const originalEnricherUrl = process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL;

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEnricherUrl !== undefined) {
    process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL = originalEnricherUrl;
  } else {
    delete process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL;
  }
});

async function importRoute() {
  jest.resetModules();
  return await import('./route');
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/portal/enrich-simple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('enrich-simple route — parameter validation', () => {
  it('returns 400 when supplementName is missing', async () => {
    process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL = 'http://mock-lambda';
    const { POST } = await importRoute();
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('returns 500 when NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL;
    const { POST } = await importRoute();
    const req = makeRequest({ supplementName: 'lavender' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

describe('enrich-simple route — slug passthrough for 6 category slugs', () => {
  const slugs = [
    'lavender',
    'caffeine',
    'beta-alanine',
    'bacopa-monnieri',
    'fiber-psyllium',
    'echinacea',
  ];

  slugs.forEach(slug => {
    it(`returns 200 with success:true for supplementName="${slug}"`, async () => {
      process.env.NEXT_PUBLIC_CONTENT_ENRICHER_FUNCTION_URL = 'http://mock-lambda';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Test', content: 'ok' }),
      });
      const { POST } = await importRoute();
      const req = makeRequest({ supplementName: slug });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
