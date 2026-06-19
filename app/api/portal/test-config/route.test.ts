/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('/api/portal/test-config GET', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('is unavailable in production without testing the portal API gateway', async () => {
    const request = new NextRequest('http://localhost/api/portal/test-config');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Not found' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
