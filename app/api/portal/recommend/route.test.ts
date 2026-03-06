/** @jest-environment node */

/**
 * Tests for recommend route
 * - Verifies resolver wiring (Spanish names sent as English to enrich-v2)
 * - Verifies error status code differentiation
 * - Verifies no raw error message leaks
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

function makeRequest(body: Record<string, unknown> = { category: 'Manzanilla' }) {
  return new Request('http://localhost:3000/api/portal/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('recommend route - resolver wiring', () => {
  it('sends English name "Chamomile" to enrich-v2 when user searches "Manzanilla"', async () => {
    // Mock enrich-v2 response with success
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          name: 'Chamomile',
          whatIsIt: 'A herb',
          worksFor: [{ condition: 'sleep', evidenceGrade: 'B', studyCount: 5 }],
          totalStudies: 5,
          keyStudies: [{ title: 'Study 1' }],
        },
        metadata: {
          hasRealData: true,
          studiesUsed: 5,
        },
      }),
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ category: 'Manzanilla' }));

    // Verify enrich-v2 was called with English name
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.supplementName).toBe('Chamomile');
  });
});

describe('recommend route - error handling', () => {
  it('returns 400 when category is missing', async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 for insufficient_data from enrich-v2', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({
        error: 'insufficient_data',
        message: 'No studies found',
      }),
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('insufficient_data');
  });

  it('returns 502 when enrich-v2 returns 502', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: async () => JSON.stringify({ error: 'upstream error' }),
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe('upstream_service_error');
    expect(data.retryable).toBe(true);
  });

  it('returns 503 when enrich-v2 returns 503', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => JSON.stringify({ error: 'service unavailable' }),
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('upstream_service_error');
    expect(data.retryable).toBe(true);
  });

  it('returns 500 with generic message for unknown errors (no raw message leak)', async () => {
    // Simulate an unexpected throw
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('INTERNAL: aws_secret_key=ABC123 connection timeout')
    );

    const { POST } = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('recommendation_generation_failed');
    // Must NOT contain raw error message
    expect(JSON.stringify(data)).not.toContain('aws_secret_key');
    expect(JSON.stringify(data)).not.toContain('ABC123');
    expect(data.details).toBeUndefined();
  });
});
