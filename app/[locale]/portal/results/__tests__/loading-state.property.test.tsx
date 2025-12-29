/**
 * Property-Based Test for Loading State Transitions
 *
 * **Feature: frontend-error-display-fix, Property 5: Loading state transitions correctly**
 * **Validates: Requirements 2.4, 2.5**
 *
 * Property: For any API call, the system should transition from isLoading=true to
 * isLoading=false when the response is received, and the loading spinner should be hidden.
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';
import {
  createRecommendation,
  createMockFetchResponse,
  setupCachedRecommendation,
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
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}));

// Mock all child components to isolate the loading state logic
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

describe('Property 5: Loading state transitions correctly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should transition from loading to loaded state when API responds', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    // Use query param to trigger API flow
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'test-supplement');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = createRecommendation({
      id: 'test-rec',
      category: 'Test',
      supplementName: 'Test Supplement',
      totalStudies: 50,
      studiesUsed: 25,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(mockRecommendation)
    );

    render(<ResultsPage />);

    // Property: Initially, loading spinner should be visible
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Property: After API response, loading spinner should be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Either error state or recommendation should be shown (not loading)
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should hide loading spinner when error occurs', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    // Use query param to trigger API flow
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'test-supplement');
    useSearchParams.mockReturnValue(mockSearchParams);

    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server Error' }),
      })
    );

    render(<ResultsPage />);

    // Property: Initially, loading spinner should be visible
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Property: After error, loading spinner should be hidden and error state shown
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should hide loading spinner when recommendation is received from cache', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'cached-rec';

    // Pre-populate cache
    const cachedRecommendation = createRecommendation({
      id: recommendationId,
      category: 'Adaptogen',
      supplementName: 'Ashwagandha',
      totalStudies: 50,
      studiesUsed: 25,
    });
    setupCachedRecommendation(recommendationId, cachedRecommendation);

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    render(<ResultsPage />);

    // Property: After cache load, loading spinner should be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Property: Recommendation display should be visible
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
