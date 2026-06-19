import { getSuggestions } from './autocomplete-suggestions-fuzzy';
import { searchLanceDB } from '@/lib/lancedb-service';

jest.mock('../services/abbreviation-expander', () => ({
  expandAbbreviation: jest.fn(),
}));

jest.mock('@/lib/lancedb-service', () => ({
  searchLanceDB: jest.fn(),
}));

const mockedSearchLanceDB = searchLanceDB as jest.MockedFunction<typeof searchLanceDB>;

describe('getSuggestions backend selection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockedSearchLanceDB.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('uses the local catalog when SEARCH_BACKEND=local even if USE_LANCEDB=true', async () => {
    process.env.SEARCH_BACKEND = 'local';
    process.env.USE_LANCEDB = 'true';

    const suggestions = await getSuggestions('magnesium', 'en', 5);

    expect(mockedSearchLanceDB).not.toHaveBeenCalled();
    expect(suggestions.some(suggestion => suggestion.text.toLowerCase().includes('magnesium'))).toBe(true);
  });

  it('can use LanceDB autocomplete when SEARCH_BACKEND is not local and USE_LANCEDB=true', async () => {
    process.env.SEARCH_BACKEND = 'auto';
    process.env.USE_LANCEDB = 'true';
    mockedSearchLanceDB.mockResolvedValue([
      {
        name: 'Mocked LanceDB Result',
        similarity: 0.91,
        metadata: {
          evidence_grade: 'A',
          study_count: 10,
        },
      } as any,
    ]);

    const suggestions = await getSuggestions('magnesium', 'en', 5);

    expect(mockedSearchLanceDB).toHaveBeenCalledWith('magnesium', 10);
    expect(suggestions).toEqual([
      {
        text: 'Mocked LanceDB Result',
        type: 'supplement',
        score: 91,
        category: 'A',
        healthConditions: [],
      },
    ]);
  });
});
