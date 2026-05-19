/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('/api/portal/recommend POST', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the incoming request origin for enrich-v2 fallback in local smoke runs', async () => {
    const originalVercelUrl = process.env.VERCEL_URL;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_data',
          message: 'No encontramos evidencia clínica humana suficiente para confirmar beneficios de "Piper auritum".',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    try {
      const request = new NextRequest('http://127.0.0.1:3100/api/portal/recommend', {
        method: 'POST',
        body: JSON.stringify({
          category: 'Piper auritum',
          age: 35,
          gender: 'male',
          location: 'CDMX',
          quiz_id: 'quiz_recommend_origin_test',
          jobId: 'job_recommend_origin_test',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('insufficient_data');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3100/api/portal/enrich-v2',
        expect.objectContaining({ method: 'POST' })
      );
    } finally {
      if (originalVercelUrl === undefined) {
        delete process.env.VERCEL_URL;
      } else {
        process.env.VERCEL_URL = originalVercelUrl;
      }
      if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      }
    }
  });
});
