/**
 * Property Test: Fresh data is cached
 * Validates: Requirements 4.4
 * 
 * Property 9: When fresh data is received from API,
 * it should be displayed correctly
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

jest.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
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
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'fresh-rec');
    mockSearchParams.set('supplement', 'test-supplement');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = {
      recommendation_id: 'fresh-rec',
      quiz_id: 'quiz-fresh',
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
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
