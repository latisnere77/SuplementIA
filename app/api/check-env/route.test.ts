/**
 * @jest-environment node
 */
import { GET } from './route';

describe('/api/check-env GET', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports configuration status without exposing raw backend URLs', async () => {
    process.env.NEXT_PUBLIC_USE_INTELLIGENT_SEARCH = 'true';
    process.env.NODE_ENV = 'production';
    process.env.SEARCH_API_URL = 'https://private-search.example.test/path?token=secret';
    process.env.NEXT_PUBLIC_SEARCH_API_URL = 'https://public-search.example.test/path?token=public-token';

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({
      NEXT_PUBLIC_USE_INTELLIGENT_SEARCH: 'true',
      isTrue: true,
      NODE_ENV: 'production',
      SEARCH_API_URL_CONFIGURED: true,
      NEXT_PUBLIC_SEARCH_API_URL_CONFIGURED: true,
      NEXT_PUBLIC_SEARCH_API_URL_HOST: 'public-search.example.test',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('/path');
  });
});
