/**
 * @jest-environment node
 */
import { GET } from './route';
import { searchSupplements } from '@/lib/search-service';

jest.mock('@/lib/search-service', () => ({
  searchSupplements: jest.fn(),
}));

const mockedSearchSupplements = searchSupplements as jest.MockedFunction<typeof searchSupplements>;

describe('/api/portal/search GET', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('delegates to the configured search backend without labeling every request as Lambda', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockedSearchSupplements.mockResolvedValue([
      {
        name: 'Magnesium',
        source: 'local_catalog',
      },
    ]);

    const response = await GET(new Request('http://localhost/api/portal/search?q=magnesium&limit=3'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ name: 'Magnesium', source: 'local_catalog' }]);
    expect(mockedSearchSupplements).toHaveBeenCalledWith('magnesium', 3);
    expect(logSpy).toHaveBeenCalledWith('[Search-API] Searching for "magnesium" via configured search backend');
    expect(logSpy.mock.calls.flat().join('\n')).not.toContain('via Lambda');
  });

  it('returns 400 for invalid query parameters without calling search', async () => {
    const response = await GET(new Request('http://localhost/api/portal/search?limit=3'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid query parameters' });
    expect(mockedSearchSupplements).not.toHaveBeenCalled();
  });
});
