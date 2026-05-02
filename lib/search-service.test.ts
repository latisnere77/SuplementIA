describe('search service fallback chain', () => {
  const originalFetch = global.fetch;
  const originalUseLanceDb = process.env.USE_LANCEDB;
  const originalSearchApiUrl = process.env.SEARCH_API_URL;
  const originalSearchBackend = process.env.SEARCH_BACKEND;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalUseLanceDb === undefined) {
      delete process.env.USE_LANCEDB;
    } else {
      process.env.USE_LANCEDB = originalUseLanceDb;
    }
    if (originalSearchApiUrl === undefined) {
      delete process.env.SEARCH_API_URL;
    } else {
      process.env.SEARCH_API_URL = originalSearchApiUrl;
    }
    if (originalSearchBackend === undefined) {
      delete process.env.SEARCH_BACKEND;
    } else {
      process.env.SEARCH_BACKEND = originalSearchBackend;
    }
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it.each([
    ['Vitamin B Complex', 'Vitamin B Complex'],
    ['Vitamin D', 'Vitamin D'],
    ['Omega-3', 'Omega-3'],
    ['Magnesium Glycinate', 'Magnesium'],
    ['Creatine', 'Creatine'],
    ['Ashwagandha', 'Ashwagandha'],
    ['Zinc', 'Zinc'],
    ['Collagen', 'Collagen'],
  ])('finds %s in the local catalog fallback', async (query, expectedName) => {
    const { searchLocalCatalog } = await import('./search-service');

    const [result] = searchLocalCatalog(query, 3);

    expect(result).toBeDefined();
    expect(result.name).toBe(expectedName);
    expect(result.source).toBe('local_catalog');
    expect(result.study_count).toBeGreaterThan(0);
    expect(result.ingredients?.length).toBeGreaterThan(0);
  });

  it('falls back to the local catalog when Lambda is forbidden', async () => {
    process.env.SEARCH_BACKEND = 'auto';
    process.env.USE_LANCEDB = 'false';
    process.env.SEARCH_API_URL = 'https://search.example.test/';
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => '{"Message":"Forbidden"}',
    })) as unknown as typeof fetch;

    const { searchSupplements } = await import('./search-service');

    const results = await searchSupplements('Collagen', 5);

    expect(global.fetch).toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      name: 'Collagen',
      source: 'local_catalog',
    });
  });
});
