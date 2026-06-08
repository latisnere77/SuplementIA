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
    ['Psyllium', 'Psyllium'],
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

  it('uses an ingredient definition for magnesium instead of internal catalog tags', async () => {
    const { searchLocalCatalog } = await import('./search-service');

    const [result] = searchLocalCatalog('Magnesium', 3);

    expect(result).toMatchObject({
      name: 'Magnesium',
      source: 'local_catalog',
    });
    expect(result.abstract).toContain('essential mineral');
    expect(result.description).toBe(result.abstract);
    expect(result.abstract).not.toContain('catálogo local');
    expect(result.abstract).not.toContain('local catalog');
    expect(result.abstract).not.toContain('sleep, muscles, cramps');
  });

  it('uses Spanish Ashwagandha copy in the local catalog fallback', async () => {
    const { searchLocalCatalog } = await import('./search-service');

    const [result] = searchLocalCatalog('Ashwagandha', 3);

    expect(result).toMatchObject({
      name: 'Ashwagandha',
      source: 'local_catalog',
    });
    expect(result.abstract).toContain('planta adaptógena');
    expect(result.abstract).toContain('withanólidos');
    expect(result.abstract).not.toContain('is an adaptogenic botanical');
  });

  it.each([
    ['sabila', 'Aloe Vera', 'Aloe barbadensis'],
    ['withania somnifera', 'Ashwagandha', 'Withania somnifera'],
    ['panax ginseng', 'Ginseng', 'Panax'],
  ])('uses curated definitions for alias and scientific-name lookup: %s', async (query, expectedName, expectedDefinitionTerm) => {
    const { searchLocalCatalog } = await import('./search-service');

    const [result] = searchLocalCatalog(query, 3);

    expect(result.name).toBe(expectedName);
    expect(result.abstract).toContain(expectedDefinitionTerm);
    expect(result.abstract).not.toContain('catálogo local');
    expect(result.abstract).not.toContain('local catalog');
  });

  it.each([
    ['tongkat ali', 'Tongkat Ali', 'Eurycoma longifolia'],
    ['fadogia agrestis', 'Fadogia Agrestis', 'human clinical evidence remains limited'],
    ['psyllium husk', 'Psyllium', 'soluble fiber'],
    ['sea moss', 'Sea Moss', 'Chondrus crispus'],
    ['musgo marino', 'Musgo Marino', 'Chondrus crispus'],
    ['shilajit', 'Shilajit', 'fulvic acids'],
    ['black seed oil', 'Black Seed Oil', 'Nigella sativa'],
    ['aceite de comino negro', 'Aceite de Comino Negro', 'Nigella sativa'],
    ['bacopa monnieri', 'Bacopa', 'Bacopa monnieri'],
  ])('resolves uncommon/trendy supplement query without returning an unrelated catalog item: %s', async (query, expectedName, expectedDefinitionTerm) => {
    const { searchLocalCatalog } = await import('./search-service');

    const [result] = searchLocalCatalog(query, 3);

    expect(result).toMatchObject({
      name: expectedName,
      source: 'local_catalog',
    });
    expect(result.abstract).toContain(expectedDefinitionTerm);
    expect(result.abstract).not.toContain('Valerian');
    expect(result.abstract).not.toContain('Rhodiola');
    expect(result.abstract).not.toContain('Flaxseed');
    expect(result.abstract).not.toContain('Coconut Oil');
  });

  it('does not match a multi-word unknown query from a single weak substring token', async () => {
    const { searchLocalCatalog } = await import('./search-service');

    const results = searchLocalCatalog('notareal ali', 3);

    expect(results).toHaveLength(0);
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
