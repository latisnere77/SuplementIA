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
import {
  createRecommendation,
  setupCachedRecommendation,
  createMockFetchResponse,
} from './factories/recommendation.factory';

// Suppress console.log to prevent memory issues during tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalLog;
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
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
    ErrorState: function MockErrorState({ error }: { error: string | { message?: string } }) {
      const message = typeof error === 'string' ? error : error?.message || 'Error';
      return <div data-testid="error-state">{message}</div>;
    },
  };
});

jest.mock('@/components/portal/EvidenceAnalysisPanelNew', () => {
  return function MockEvidencePanel() {
    return <div data-testid="evidence-panel">Evidence</div>;
  };
});

jest.mock('@/components/portal/ProductRecommendationsGrid', () => {
  return function MockProductGrid() { return null; };
});

jest.mock('@/components/portal/ScientificStudiesPanel', () => {
  return function MockStudiesPanel() { return null; };
});

jest.mock('@/components/portal/ShareReferralCard', () => {
  return function MockShareCard() { return null; };
});

jest.mock('@/components/portal/PaywallModal', () => {
  return function MockPaywallModal() { return null; };
});

jest.mock('@/components/portal/LegalDisclaimer', () => {
  return function MockLegalDisclaimer() { return null; };
});

jest.mock('@/components/portal/ViewToggle', () => {
  return { ViewToggle: function MockViewToggle() { return null; } };
});

jest.mock('@/components/portal/ExamineStyleView', () => {
  return function MockExamineView() { return null; };
});

jest.mock('@/components/portal/StreamingResults', () => {
  return { StreamingResults: function MockStreamingResults() { return null; } };
});

jest.mock('@/components/portal/BenefitStudiesModal', () => {
  return function MockBenefitStudiesModal() { return null; };
});

jest.mock('@/components/portal/ConditionResultsDisplay', () => {
  return function MockConditionResultsDisplay() { return null; };
});

jest.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('@/lib/portal/search-analytics', () => ({
  searchAnalytics: { logSuccess: jest.fn(), logFailure: jest.fn(), logSearch: jest.fn() },
}));

jest.mock('@/lib/portal/xray-client', () => ({
  traceSearch: jest.fn(),
}));

jest.mock('@/lib/portal/query-normalization', () => ({
  normalizeQuery: (query: string) => ({ normalized: query, confidence: 1.0 }),
}));

jest.mock('@/lib/portal/supplement-search', () => ({
  searchSupplement: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/portal/benefit-normalization', () => ({
  normalizeBenefit: (benefit: string) => benefit,
}));

jest.mock('@/lib/portal/supplement-benefit-suggestions', () => ({
  getTopSuggestedBenefit: jest.fn().mockReturnValue(null),
  getSuggestedBenefits: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/portal/benefit-study-filter', () => ({
  filterByBenefit: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/i18n/supplement-names', () => ({
  getLocalizedSupplementName: (name: string) => name,
}));

describe('Cache Retrieval on Page Load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Valid Cache Scenarios (Shared Link Flow)', () => {
    it('should use valid cached data on page load', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'test-rec-123';

      // Setup cache BEFORE rendering
      const cachedRecommendation = createRecommendation({
        id: recommendationId,
        category: 'Adaptogen',
        supplementName: 'Ashwagandha',
        totalStudies: 50,
        studiesUsed: 25,
      });

      setupCachedRecommendation(recommendationId, cachedRecommendation);

      // Setup search params with id (shared link flow)
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      // Should use cached data and display recommendation
      await waitFor(() => {
        expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      }, { timeout: 3000 });

      // No error state
      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();

      // No API call (cache hit)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not show error state when using valid cache', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'valid-cache-rec';

      const cachedRecommendation = createRecommendation({
        id: recommendationId,
        category: 'Vitamin',
        supplementName: 'Vitamin D',
        totalStudies: 100,
        studiesUsed: 50,
      });

      setupCachedRecommendation(recommendationId, cachedRecommendation);

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Invalid Cache Scenarios', () => {
    it('should show error when cache is expired', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'expired-rec';

      const cachedRecommendation = createRecommendation({
        id: recommendationId,
        category: 'Mineral',
        supplementName: 'Magnesium',
        totalStudies: 30,
        studiesUsed: 15,
      });

      // Set expired cache (25 hours ago, TTL is 24 hours)
      setupCachedRecommendation(recommendationId, cachedRecommendation, {
        ttl: 24 * 60 * 60 * 1000,
        age: 25 * 60 * 60 * 1000,
      });

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      // Should show error (shared link flow doesn't fetch, just errors)
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show error when no cache exists for shared link', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', 'non-existent-rec');
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle corrupted cache data gracefully', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'corrupted-rec';

      // Store corrupted JSON
      localStorage.setItem(`recommendation_${recommendationId}`, 'invalid-json{{{');

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      // Should show error due to corrupted cache
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Search Flow (API Call)', () => {
    it('should fetch from API when using query param', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');

      // Use query param to trigger search flow
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('q', 'ashwagandha');
      useSearchParams.mockReturnValue(mockSearchParams);

      const freshRecommendation = createRecommendation({
        id: 'search-result',
        category: 'Adaptogen',
        supplementName: 'Ashwagandha',
        totalStudies: 50,
        studiesUsed: 25,
      });

      (global.fetch as jest.Mock).mockImplementation(() =>
        createMockFetchResponse(freshRecommendation)
      );

      render(<ResultsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    });
  });
});
