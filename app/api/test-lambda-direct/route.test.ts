/**
 * @jest-environment node
 */
import { GET } from './route';

describe('/api/test-lambda-direct GET', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('is unavailable in production without calling the configured search API', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Not found' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
