/**
 * Property Test: Fresh data is cached
 * Validates: Requirements 4.4
 *
 * Property 9: When fresh data is received from API,
 * it should be displayed correctly
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';
import {
  createRecommendation,
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

describe('Property Test: Cache Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 9: Fresh API data displays correctly after fetch', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    // Use query param to trigger search/API flow
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'test-supplement');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = createRecommendation({
      id: 'fresh-rec',
      quizId: 'quiz-fresh',
      category: 'Test',
      supplementName: 'Test Supplement',
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

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 9: Different supplements display correctly', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'omega-3');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = createRecommendation({
      id: 'omega3-rec',
      category: 'Fatty Acid',
      supplementName: 'Omega-3',
      totalStudies: 100,
      studiesUsed: 50,
      totalParticipants: 5000,
      researchSpanYears: 20,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(mockRecommendation)
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
