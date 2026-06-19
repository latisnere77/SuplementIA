/**
 * @jest-environment node
 */
import { GET } from './route';

describe('/api/test-lancedb GET', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('is unavailable in production unless debug routes are explicitly enabled', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Not found' });
  });
});
