/**
 * Property Test: Cache retrieval works correctly
 * Validates: Requirements 1.5
 *
 * Property 4: When valid cached data exists, the component should:
 * - Use the cached data without making an API call
 * - Display the recommendation immediately
 * - Not show error state
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

// ===========================================
// MOCKS
// ===========================================

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
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

// ===========================================
// TESTS
// ===========================================

describe('Property Test: Cache Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test the shared link flow (id parameter):
   * When user visits with ?id=xxx, component checks localStorage cache
   */
  it('Property 4: Valid cached data displays recommendation (shared link flow)', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'cached-ashwagandha';

    // Setup search params with id (shared link flow)
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    // Pre-populate cache BEFORE rendering
    const cachedRecommendation = createRecommendation({
      id: recommendationId,
      quizId: 'quiz-cached',
      category: 'Adaptogen',
      supplementName: 'Ashwagandha',
      totalStudies: 50,
      studiesUsed: 25,
    });

    setupCachedRecommendation(recommendationId, cachedRecommendation);

    render(<ResultsPage />);

    // Should use cached data and display recommendation
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should NOT show error state
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();

    // Should NOT make API call (using cache)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Property 4: Valid cached Omega-3 displays correctly', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'omega3-cached';

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    const cachedRecommendation = createRecommendation({
      id: recommendationId,
      quizId: 'quiz-omega',
      category: 'Fatty Acid',
      supplementName: 'Omega-3',
      totalStudies: 100,
      studiesUsed: 50,
      totalParticipants: 5000,
      researchSpanYears: 20,
    });

    setupCachedRecommendation(recommendationId, cachedRecommendation);

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 4: Expired cache shows error (shared link flow)', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'expired-cache';

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    // Set cache with expired timestamp (25 hours ago)
    const expiredRecommendation = createRecommendation({
      id: recommendationId,
      quizId: 'quiz-expired',
      category: 'Mineral',
      supplementName: 'Magnesium',
      totalStudies: 30,
      studiesUsed: 15,
    });

    setupCachedRecommendation(recommendationId, expiredRecommendation, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      age: 25 * 60 * 60 * 1000, // 25 hours ago (expired)
    });

    render(<ResultsPage />);

    // Should show error state for expired cache
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('evidence-panel')).not.toBeInTheDocument();
  });

  it('Property 4: Missing cache shows error (shared link flow)', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'non-existent');
    useSearchParams.mockReturnValue(mockSearchParams);

    // No cache set - localStorage is empty

    render(<ResultsPage />);

    // Should show error state when no cache exists for shared link
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('evidence-panel')).not.toBeInTheDocument();
  });

  /**
   * Test the search flow (query parameter):
   * When user searches, component makes API call
   */
  it('Property 4: Search flow makes API call', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    // Setup search params with query (search flow)
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'ashwagandha');
    useSearchParams.mockReturnValue(mockSearchParams);

    const searchRecommendation = createRecommendation({
      id: 'search-ashwagandha',
      quizId: 'quiz-search',
      category: 'Adaptogen',
      supplementName: 'Ashwagandha',
      totalStudies: 50,
      studiesUsed: 25,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(searchRecommendation)
    );

    render(<ResultsPage />);

    // Should make API call for search flow
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Should display recommendation from API
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
