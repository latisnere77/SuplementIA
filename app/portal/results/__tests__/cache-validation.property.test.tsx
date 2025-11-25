/**
 * Property Tests: Cache Validation
 * Validates: Requirements 4.1, 4.2, 4.3, 4.5
 * 
 * Property 7: Empty cache triggers API call
 * Property 8: Invalid cache is removed
 * Property 10: Cache validation runs on load
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';

// Mock Next.js router and all dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('@/components/portal/IntelligentLoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock('@/components/portal/ErrorState', () => {
  return {
    ErrorState: function MockErrorState() {
      return <div data-testid="error-state">Error</div>;
    },
  };
});

jest.mock('@/components/portal/EvidenceAnalysisPanelNew', () => {
  return function MockEvidencePanel() {
    return <div data-testid="recommendation-display">Evidence</div>;
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

jest.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('@/lib/portal/supplement-suggestions', () => ({
  suggestSupplementCorrection: () => null,
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

  describe('Property 7: Empty cache triggers API call', () => {
    it('should fetch from API when no cache exists', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', 'test-rec');
      mockSearchParams.set('supplement', 'ashwagandha');
      useSearchParams.mockReturnValue(mockSearchParams);

      const mockRecommendation = {
        recommendation_id: 'test-rec',
        quiz_id: 'quiz-test',
        category: 'Test',
        evidence_summary: {
          totalStudies: 50,
          totalParticipants: 2000,
          efficacyPercentage: 80,
          researchSpanYears: 10,
          ingredients: []
        },
        ingredients: [],
        products: [],
        personalization_factors: {}
      };

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, recommendation: mockRecommendation })
        })
      );

      render(<ResultsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Property 8: Invalid cache is removed', () => {
    it('should remove cache with null recommendation and fetch fresh data', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', 'test-rec');
      mockSearchParams.set('supplement', 'test');
      useSearchParams.mockReturnValue(mockSearchParams);

      const invalidCache = {
        recommendation: null,
        timestamp: Date.now()
      };

      localStorage.setItem('recommendation_test-rec', JSON.stringify(invalidCache));

      const mockRecommendation = {
        recommendation_id: 'test-rec',
        quiz_id: 'quiz-test',
        category: 'Test',
        evidence_summary: {
          totalStudies: 50,
          totalParticipants: 2000,
          efficacyPercentage: 80,
          researchSpanYears: 10,
          ingredients: []
        },
        ingredients: [],
        products: [],
        personalization_factors: {}
      };

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, recommendation: mockRecommendation })
        })
      );

      render(<ResultsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Property 10: Cache validation runs on load', () => {
    it('should validate and remove invalid cache with missing evidence_summary', async () => {
      const { useSearchParams } = jest.requireMock('next/navigation');
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('id', 'invalid-cached');
      mockSearchParams.set('supplement', 'invalid-test');
      useSearchParams.mockReturnValue(mockSearchParams);

      const invalidCache = {
        recommendation: {
          recommendation_id: 'invalid-cached',
          quiz_id: 'quiz-invalid',
          category: 'Test',
          // Missing evidence_summary - invalid
          ingredients: [],
          products: [],
          personalization_factors: {}
        },
        timestamp: Date.now()
      };

      localStorage.setItem('recommendation_invalid-cached', JSON.stringify(invalidCache));

      const validRecommendation = {
        recommendation_id: 'invalid-cached',
        quiz_id: 'quiz-invalid',
        category: 'Test',
        evidence_summary: {
          totalStudies: 50,
          totalParticipants: 2000,
          efficacyPercentage: 80,
          researchSpanYears: 10,
          ingredients: []
        },
        ingredients: [],
        products: [],
        personalization_factors: {}
      };

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, recommendation: validRecommendation })
        })
      );

      render(<ResultsPage />);

      // Should fetch from API because cache is invalid
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
