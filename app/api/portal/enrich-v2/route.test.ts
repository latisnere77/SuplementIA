/** @jest-environment node */

/**
 * Tests for enrich-v2 route error handling
 * Mocks global.fetch to avoid calling real Lambda/PubMed
 *
 * Note: expandAbbreviation() does NOT use fetch internally,
 * so fetch mocks map directly to: studies fetch, then enricher fetch.
 */

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function importRoute() {
  jest.resetModules();
  return await import('./route');
}

function makeRequest(body: Record<string, unknown> = { supplementName: 'Chamomile' }) {
  return new Request('http://localhost:3000/api/portal/enrich-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('enrich-v2 route error handling', () => {
  it('returns 400 when supplementName is missing', async () => {
    const { POST } = await importRoute();
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 503 on timeout/AbortError from studies fetch', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    // studies fetch throws AbortError
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('service_unavailable');
    expect(data.retryable).toBe(true);
  });

  it('returns 502 on "Studies fetch failed" error', async () => {
    // studies fetch returns non-ok response -> throws "Studies fetch failed: 404"
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Not Found',
      status: 404,
      statusText: 'Not Found',
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe('studies_service_error');
    expect(data.retryable).toBe(true);
  });

  it('returns 502 on "Enrichment failed" error', async () => {
    // studies fetch succeeds
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { studies: [{ title: 'Study 1' }] } }),
      })
      // enricher fetch returns non-ok -> throws "Enrichment failed: 503"
      .mockResolvedValueOnce({
        ok: false,
        text: async () => 'Service Unavailable',
        status: 503,
        statusText: 'Service Unavailable',
      });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe('enrichment_service_error');
  });

  it('returns 500 with generic message on unknown errors (no raw message leak)', async () => {
    const secretError = new Error('DATABASE_PASSWORD=s3cret connection refused');

    // studies fetch throws unexpected error
    (global.fetch as jest.Mock).mockRejectedValueOnce(secretError);

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('internal_error');
    expect(data.message).toBe('Error inesperado. Por favor, intenta de nuevo.');
    expect(JSON.stringify(data)).not.toContain('DATABASE_PASSWORD');
    expect(JSON.stringify(data)).not.toContain('s3cret');
  });

  it('returns 404 when no studies found', async () => {
    // studies fetch returns empty studies
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { studies: [] } }),
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('insufficient_data');
  });
});
