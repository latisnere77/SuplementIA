/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(() => {
    const send = jest.fn();
    (globalThis as any).__mockStudiesLambdaSend = send;
    return { send };
  }),
  InvokeCommand: jest.fn((input) => input),
}));

describe('/api/portal/studies POST', () => {
  const originalStudiesApiUrl = process.env.STUDIES_API_URL;
  const originalNextPublicStudiesApiUrl = process.env.NEXT_PUBLIC_STUDIES_API_URL;
  const originalSearchApiUrl = process.env.SEARCH_API_URL;
  const originalStudiesFetcherLambda = process.env.STUDIES_FETCHER_LAMBDA;

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as any).__mockStudiesLambdaSend?.mockReset();

    if (originalStudiesApiUrl === undefined) delete process.env.STUDIES_API_URL;
    else process.env.STUDIES_API_URL = originalStudiesApiUrl;
    if (originalNextPublicStudiesApiUrl === undefined) delete process.env.NEXT_PUBLIC_STUDIES_API_URL;
    else process.env.NEXT_PUBLIC_STUDIES_API_URL = originalNextPublicStudiesApiUrl;
    if (originalSearchApiUrl === undefined) delete process.env.SEARCH_API_URL;
    else process.env.SEARCH_API_URL = originalSearchApiUrl;
    if (originalStudiesFetcherLambda === undefined) delete process.env.STUDIES_FETCHER_LAMBDA;
    else process.env.STUDIES_FETCHER_LAMBDA = originalStudiesFetcherLambda;
  });

  it('uses the configured studies API URL with the expected request body and safe headers', async () => {
    process.env.STUDIES_API_URL = 'https://studies.example.test/search';
    delete process.env.NEXT_PUBLIC_STUDIES_API_URL;
    delete process.env.SEARCH_API_URL;

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            studies: [
              {
                pmid: '12345678',
                title: 'Magnesium clinical study',
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const request = new NextRequest('http://localhost/api/portal/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'studies-route-test',
      },
      body: JSON.stringify({
        supplementName: 'Magnesium',
        maxResults: 5,
        filters: {
          rctOnly: false,
          yearFrom: 2010,
          humanStudiesOnly: true,
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    const [, fetchOptions] = fetchMock.mock.calls[0];
    const headers = (fetchOptions as RequestInit).headers as Record<string, string>;
    const outboundBody = JSON.parse(String((fetchOptions as RequestInit).body));

    expect(response.status).toBe(200);
    expect(body.studies).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://studies.example.test/search',
      expect.objectContaining({ method: 'POST' })
    );
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'X-Request-ID': 'studies-route-test',
    });
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers).not.toHaveProperty('X-API-Key');
    expect(outboundBody).toEqual(
      expect.objectContaining({
        supplementName: 'Magnesium',
        maxResults: 5,
        humanStudiesOnly: true,
        yearFrom: 2010,
      })
    );
  });

  it('falls back to IAM Lambda invoke when the configured studies endpoint returns 403', async () => {
    process.env.STUDIES_API_URL = 'https://studies.example.test/search';
    process.env.STUDIES_FETCHER_LAMBDA = 'suplementia-studies-fetcher-prod';
    delete process.env.NEXT_PUBLIC_STUDIES_API_URL;
    delete process.env.SEARCH_API_URL;

    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    (globalThis as any).__mockStudiesLambdaSend.mockResolvedValueOnce({
      StatusCode: 200,
      Payload: Buffer.from(JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            ranked: {
              positive: [
                {
                  pmid: '3544968',
                  title: 'Titrated extract of Centella asiatica in venous insufficiency',
                },
              ],
              negative: [],
              mixed: [],
            },
          },
        }),
      })),
    });

    const request = new NextRequest('http://localhost/api/portal/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': 'studies-route-iam-test',
      },
      body: JSON.stringify({
        supplementName: 'Centella asiatica',
        maxResults: 5,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.studies).toEqual([
      expect.objectContaining({
        pmid: '3544968',
        title: 'Titrated extract of Centella asiatica in venous insufficiency',
      }),
    ]);
    expect((globalThis as any).__mockStudiesLambdaSend).toHaveBeenCalledWith(
      expect.objectContaining({
        FunctionName: 'suplementia-studies-fetcher-prod',
        InvocationType: 'RequestResponse',
      })
    );
  });
});
