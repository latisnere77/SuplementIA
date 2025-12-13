/**
 * Cache Retrieval Tests
 * Tests for cache retrieval on page load
 * 
 * Tests that:
 * - Valid cached data is used on page load
 * - Page doesn't show error with valid cache
 * - Cache retrieval success/failure is logged
 * 
 * **Validates: Requirements 1.5**
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock all child components
jest.mock('@/components/portal/IntelligentLoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock('@/components/portal/ErrorState', () => {
  return {
    ErrorState: function MockErrorState({ error }: { error: string }) {
      return <div data-testid="error-state">{error}</div>;
    },
  };
});

jest.mock('@/components/portal/EvidenceAnalysisPanelNew', () => {
  return function MockEvidencePanel() {
    return <div data-testid="evidence-panel">Evidence</div>;
  };
});

jest.mock('@/components/portal/ProductRecommendationsGrid', () => {
  return function MockProductGrid() {
    return <div data-testid="product-grid">Products</div>;
  };
});

jest.mock('@/components/portal/ScientificStudiesPanel', () => {
  return function MockStudiesPanel() {
    return <div data-testid="studies-panel">Studies</div>;
  };
});

jest.mock('@/components/portal/ShareReferralCard', () => {
  return function MockShareCard() {
    return <div data-testid="share-card">Share</div>;
  };
});

jest.mock('@/components/portal/PaywallModal', () => {
  return function MockPaywallModal() {
    return null;
  };
});

jest.mock('@/components/portal/LegalDisclaimer', () => {
  return function MockLegalDisclaimer() {
    return null;
  };
});

jest.mock('@/components/portal/ViewToggle', () => {
  return {
    ViewToggle: function MockViewToggle() {
      return null;
    },
  };
});

jest.mock('@/components/portal/ExamineStyleView', () => {
  return function MockExamineView() {
    return null;
  };
});

jest.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('@/lib/portal/supplement-suggestions', () => ({
  suggestSupplementCorrection: () => null,
  getBestSuggestion: () => null,
  getSuggestions: () => [],
}));

jest.mock('@/lib/portal/search-analytics', () => ({
  searchAnalytics: {
    logSuccess: jest.fn(),
    logFailure: jest.fn(),
  },
}));

jest.mock('@/lib/portal/xray-client', () => ({
  traceSearch: jest.fn(),
}));

jest.mock('@/lib/portal/query-normalization', () => ({
  normalizeQuery: (query: string) => ({ normalized: query, confidence: 1.0 }),
}));

// Helper to create valid cached recommendation
const createValidCachedRecommendation = (overrides: any = {}) => ({
  recommendation_id: 'test-rec-123',
  quiz_id: 'quiz-123',
  category: 'Ashwagandha',
  evidence_summary: {
    totalStudies: 50,
    totalParticipants: 5000,
    efficacyPercentage: 75,
    researchSpanYears: 10,
    ingredients: [
      {
        name: 'Ashwagandha',
        grade: 'A' as const,
        studyCount: 50,
        rctCount: 30,
      },
    ],
  },
  ingredients: [
    {
      name: 'Ashwagandha',
      grade: 'A' as const,
    },
  ],
  products: [],
  personalization_factors: {},
  _enrichment_metadata: {
    hasRealData: true,
    studiesUsed: 50,
    intelligentSystem: true,
    fallback: false,
    source: 'pubmed',
    version: '1.0',
    timestamp: new Date().toISOString(),
  },
  supplement: {
    name: 'Ashwagandha',
    description: 'An adaptogenic herb',
    dosage: {
      effectiveDose: '300-500mg',
      timing: 'Daily',
    },
    worksFor: [
      {
        condition: 'Stress reduction',
        grade: 'A',
        studyCount: 20,
      },
    ],
    doesntWorkFor: [],
    limitedEvidence: [],
    sideEffects: [],
    contraindications: [],
    interactions: [],
  },
  ...overrides,
});

describe('Cache Retrieval on Page Load', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = jest.fn();
    
    // Clear localStorage
    localStorage.clear();
    
    // Spy on console.log to verify logging
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    consoleLogSpy.mockRestore();
    // Clean up any rendered components
    document.body.innerHTML = '';
  });

  describe('Valid Cache Scenarios', () => {
    it('should use valid cached data on page load', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Create valid cached data
      const cachedRecommendation = createValidCachedRecommendation();
      const cacheKey = `recommendation_${cachedRecommendation.recommendation_id}`;
      const cacheData = {
        recommendation: cachedRecommendation,
        timestamp: Date.now(),
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Setup: Mock search params with the cached recommendation ID
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', cachedRecommendation.recommendation_id);
      mockSearchParams.set('supplement', cachedRecommendation.category);
      useSearchParams.mockReturnValue(mockSearchParams);

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for cache to be loaded
      await waitFor(
        () => {
          const recommendationDisplay = screen.queryByTestId('recommendation-display');
          expect(recommendationDisplay).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: No error state is shown
      const errorState = screen.queryByTestId('error-state');
      expect(errorState).not.toBeInTheDocument();

      // Verify: Loading spinner is not shown (cache hit)
      const loadingSpinner = screen.queryByTestId('loading-spinner');
      expect(loadingSpinner).not.toBeInTheDocument();

      // Verify: Recommendation display is shown
      const recommendationDisplay = screen.getByTestId('recommendation-display');
      expect(recommendationDisplay).toBeInTheDocument();

      // Verify: No API call was made (cache hit)
      expect(global.fetch).not.toHaveBeenCalled();
      
      unmount();
    });

    it('should log cache hit when valid cache is found', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Create valid cached data
      const cachedRecommendation = createValidCachedRecommendation();
      const cacheKey = `recommendation_${cachedRecommendation.recommendation_id}`;
      const cacheData = {
        recommendation: cachedRecommendation,
        timestamp: Date.now(),
        ttl: 7 * 24 * 60 * 60 * 1000,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', cachedRecommendation.recommendation_id);
      mockSearchParams.set('supplement', cachedRecommendation.category);
      useSearchParams.mockReturnValue(mockSearchParams);

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for cache to be loaded
      await waitFor(
        () => {
          const recommendationDisplay = screen.queryByTestId('recommendation-display');
          expect(recommendationDisplay).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: Cache retrieval logs are present
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Checking cache for key:',
        cacheKey
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Found cached data, parsing...'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] ✅ Cache hit - valid data found'
      );
      
      unmount();
    });

    it('should not show error state when using valid cache', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Create valid cached data
      const cachedRecommendation = createValidCachedRecommendation();
      const cacheKey = `recommendation_${cachedRecommendation.recommendation_id}`;
      const cacheData = {
        recommendation: cachedRecommendation,
        timestamp: Date.now(),
        ttl: 7 * 24 * 60 * 60 * 1000,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', cachedRecommendation.recommendation_id);
      mockSearchParams.set('supplement', cachedRecommendation.category);
      useSearchParams.mockReturnValue(mockSearchParams);

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for cache to be loaded
      await waitFor(
        () => {
          const recommendationDisplay = screen.queryByTestId('recommendation-display');
          expect(recommendationDisplay).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: No error state throughout the entire render
      const errorState = screen.queryByTestId('error-state');
      expect(errorState).not.toBeInTheDocument();
      
      // Verify: State update logs show error was cleared
      const stateUpdateLogs = consoleLogSpy.mock.calls.filter(
        call => call[0] === '[State Update] Before setting recommendation from cache - clearing error first'
      );
      expect(stateUpdateLogs.length).toBeGreaterThan(0);
      
      unmount();
    });
  });

  describe('Invalid Cache Scenarios', () => {
    it('should fetch fresh data when cache is expired', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Create expired cached data
      const cachedRecommendation = createValidCachedRecommendation();
      const cacheKey = `recommendation_${cachedRecommendation.recommendation_id}`;
      const cacheData = {
        recommendation: cachedRecommendation,
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago (expired)
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', cachedRecommendation.recommendation_id);
      mockSearchParams.set('supplement', cachedRecommendation.category);
      useSearchParams.mockReturnValue(mockSearchParams);

      // Setup: Mock fetch to return fresh data
      const freshRecommendation = createValidCachedRecommendation({
        recommendation_id: 'fresh-rec-123',
      });
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            recommendation: freshRecommendation,
          }),
        })
      );

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for fresh data to be loaded
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verify: Cache expiration was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] ⚠️ Cache expired, removing:',
        cacheKey
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Cache miss - expired'
      );

      // Verify: Cache was removed from localStorage
      expect(localStorage.getItem(cacheKey)).toBeNull();
      
      unmount();
    });

    it('should fetch fresh data when cache validation fails', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Create invalid cached data (no real studies)
      const invalidRecommendation = createValidCachedRecommendation({
        evidence_summary: {
          totalStudies: 0, // Invalid - no studies
          totalParticipants: 0,
          efficacyPercentage: 0,
          researchSpanYears: 0,
          ingredients: [],
        },
        _enrichment_metadata: {
          hasRealData: false,
          studiesUsed: 0, // Invalid - no studies used
          intelligentSystem: false,
          fallback: true,
          source: 'generated',
          version: '1.0',
          timestamp: new Date().toISOString(),
        },
      });
      
      const cacheKey = `recommendation_${invalidRecommendation.recommendation_id}`;
      const cacheData = {
        recommendation: invalidRecommendation,
        timestamp: Date.now(),
        ttl: 7 * 24 * 60 * 60 * 1000,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', invalidRecommendation.recommendation_id);
      mockSearchParams.set('supplement', invalidRecommendation.category);
      useSearchParams.mockReturnValue(mockSearchParams);

      // Setup: Mock fetch to return fresh data
      const freshRecommendation = createValidCachedRecommendation({
        recommendation_id: 'fresh-rec-456',
      });
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            recommendation: freshRecommendation,
          }),
        })
      );

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for fresh data to be loaded
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verify: Cache validation failure was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] ❌ Cache validation failed, removing invalid cache:',
        cacheKey
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Cache miss - invalid data'
      );

      // Verify: Invalid cache was removed from localStorage
      expect(localStorage.getItem(cacheKey)).toBeNull();
      
      unmount();
    });

    it('should log cache miss when no cache is found', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: No cached data in localStorage
      const recommendationId = 'non-existent-rec-123';
      const cacheKey = `recommendation_${recommendationId}`;
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      mockSearchParams.set('supplement', 'TestSupplement');
      useSearchParams.mockReturnValue(mockSearchParams);

      // Setup: Mock fetch to return data
      const freshRecommendation = createValidCachedRecommendation({
        recommendation_id: recommendationId,
      });
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            recommendation: freshRecommendation,
          }),
        })
      );

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for data to be loaded
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verify: Cache miss was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Cache miss - no data found for key:',
        cacheKey
      );
      
      unmount();
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle corrupted cache data gracefully', async () => {
      const { useSearchParams } = require('next/navigation');
      
      // Setup: Store corrupted JSON in cache
      const recommendationId = 'corrupted-rec-123';
      const cacheKey = `recommendation_${recommendationId}`;
      localStorage.setItem(cacheKey, 'invalid-json{{{');
      
      // Setup: Mock search params
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      mockSearchParams.set('supplement', 'TestSupplement');
      useSearchParams.mockReturnValue(mockSearchParams);

      // Setup: Mock fetch to return data
      const freshRecommendation = createValidCachedRecommendation({
        recommendation_id: recommendationId,
      });
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            recommendation: freshRecommendation,
          }),
        })
      );

      // Render the component
      const { unmount } = render(<ResultsPage />);

      // Wait for data to be loaded
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verify: Cache error was logged
      const errorLogs = consoleLogSpy.mock.calls.filter(
        call => call[0] && call[0].includes('[Cache Retrieval] ❌ Error reading from cache')
      );
      expect(errorLogs.length).toBeGreaterThan(0);
      
      // Verify: Cache miss was logged after error
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Cache Retrieval] Cache miss - error occurred'
      );
      
      unmount();
    });
  });
});
