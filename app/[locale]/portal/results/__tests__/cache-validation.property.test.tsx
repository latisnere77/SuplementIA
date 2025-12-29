/**
 * Property Tests: Cache Validation
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 *
 * Property 7: Empty cache triggers API call (search flow)
 * Property 8: Invalid cache shows error (shared link flow)
 * Property 10: Cache validation runs on load
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';
import {
  createRecommendation,
  createMockFetchResponse,
  setupCachedRecommendation,
  createInvalidRecommendation,
} from './factories/recommendation.factory';

// Suppress console.log to prevent memory issues during tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalLog;
});

// Mock Next.js router and all dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));

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

describe('Property Test: Cache Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Property 7: Empty cache triggers API call (search flow)', () => {
    it('should fetch from API when no cache exists and using query', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');

      // Use query param to trigger search flow
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('q', 'ashwagandha');
      useSearchParams.mockReturnValue(mockSearchParams);

      const mockRecommendation = createRecommendation({
        id: 'test-rec',
        category: 'Adaptogen',
        supplementName: 'Ashwagandha',
        totalStudies: 50,
        studiesUsed: 25,
      });

      (global.fetch as jest.Mock).mockImplementation(() =>
        createMockFetchResponse(mockRecommendation)
      );

      render(<ResultsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Property 8: Invalid cache shows error (shared link flow)', () => {
    it('should show error when cache has null recommendation', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'test-rec';

      // Set invalid cache with null recommendation
      const invalidCache = {
        recommendation: null,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(`recommendation_${recommendationId}`, JSON.stringify(invalidCache));

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      // Shared link flow shows error when cache is invalid
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show error for fake data without enrichment metadata', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'fake-data-rec';

      // Create fake data (totalStudies > 0 but no _enrichment_metadata)
      const fakeRecommendation = createInvalidRecommendation('fake-data');
      const cacheData = {
        recommendation: fakeRecommendation,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(`recommendation_${recommendationId}`, JSON.stringify(cacheData));

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Property 10: Cache validation runs on load', () => {
    it('should validate and use valid cache', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'valid-cached';

      const validRecommendation = createRecommendation({
        id: recommendationId,
        category: 'Test',
        supplementName: 'Test Supplement',
        totalStudies: 50,
        studiesUsed: 25,
      });

      setupCachedRecommendation(recommendationId, validRecommendation);

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
      }, { timeout: 3000 });

      // No API call - used cache
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject cache with missing required fields', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const recommendationId = 'invalid-cached';

      // Create recommendation missing required fields
      const invalidRecommendation = createInvalidRecommendation('missing-fields');
      const cacheData = {
        recommendation: invalidRecommendation,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(`recommendation_${recommendationId}`, JSON.stringify(cacheData));

      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', recommendationId);
      useSearchParams.mockReturnValue(mockSearchParams);

      render(<ResultsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
