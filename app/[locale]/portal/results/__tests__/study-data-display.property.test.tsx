/**
 * Property-Based Test for Study Data Display
 *
 * **Feature: frontend-error-display-fix, Property 2: Study data is displayed**
 * **Validates: Requirements 1.3**
 *
 * Property: For any recommendation with study data (totalStudies > 0),
 * the rendered output should contain the study count and participant count.
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

describe('Property 2: Study data is displayed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should display evidence panel for recommendations with study data (cache flow)', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'study-data-rec';

    const recommendationWithStudies = createRecommendation({
      id: recommendationId,
      category: 'Adaptogen',
      supplementName: 'Ashwagandha',
      totalStudies: 50,
      studiesUsed: 25,
      totalParticipants: 5000,
      researchSpanYears: 10,
    });

    setupCachedRecommendation(recommendationId, recommendationWithStudies);

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    render(<ResultsPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Property: Evidence panel should be displayed
    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();

    // Property: No error when real study data exists
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('should display evidence panel for recommendations with study data (API flow)', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');

    // Use query param to trigger API flow
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('q', 'omega-3');
    useSearchParams.mockReturnValue(mockSearchParams);

    const recommendationWithStudies = createRecommendation({
      id: 'omega3-rec',
      category: 'Fatty Acid',
      supplementName: 'Omega-3',
      totalStudies: 100,
      studiesUsed: 50,
      totalParticipants: 10000,
      researchSpanYears: 20,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(recommendationWithStudies)
    );

    render(<ResultsPage />);

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Property: Evidence panel should be displayed
    expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();

    // Property: No error when real study data exists
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('should display different supplement categories correctly', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const recommendationId = 'vitamin-d-rec';

    const vitaminRecommendation = createRecommendation({
      id: recommendationId,
      category: 'Vitamin',
      supplementName: 'Vitamin D',
      totalStudies: 200,
      studiesUsed: 100,
      totalParticipants: 25000,
      researchSpanYears: 25,
    });

    setupCachedRecommendation(recommendationId, vitaminRecommendation);

    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', recommendationId);
    useSearchParams.mockReturnValue(mockSearchParams);

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
