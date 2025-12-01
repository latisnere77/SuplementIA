import { useState, useCallback } from 'react';
import { z } from 'zod';

// Schema for a single search result
const SearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  score: z.number(),
});

// Schema for the API response
const ApiResponseSchema = z.array(SearchResultSchema);

export type SearchResult = z.infer<typeof SearchResultSchema>;

export function useIntelligentSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      
      // Validate API response with Zod
      const validation = ApiResponseSchema.safeParse(data);

      if (!validation.success) {
        console.error('Zod validation error:', validation.error);
        throw new Error('Invalid data structure received from API.');
      }

      setResults(validation.data);
      return validation.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('[useIntelligentSearch] Search failed:', errorMessage);
      setError(errorMessage);
      setResults([]); // Clear results on error
      throw err; // Re-throw to allow caller to handle it
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    search,
    isLoading,
    error,
    results,
  };
}