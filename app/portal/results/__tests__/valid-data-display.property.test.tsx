/**
 * Property Test: Valid data displays recommendation
 * Validates: Requirements 1.1, 1.2, 2.1
 * 
 * Property 1: When the API returns valid recommendation data,
 * the component should display the recommendation and NOT show error state
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
  return function MockProductGrid() {
    return null;
  };
});

jest.mock('@/components/portal/ScientificStudiesPanel', () => {
  return function MockStudiesPanel() {
    return null;
  };
});

jest.mock('@/components/portal/ShareReferralCard', () => {
  return function MockShareCard() {
    return null;
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

describe('Property Test: Valid Data Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 1: Valid recommendation data displays correctly and no error shown', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'ashwagandha-rec');
    mockSearchParams.set('supplement', 'ashwagandha');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = {
      recommendation_id: 'ashwagandha-rec',
      quiz_id: 'quiz-ash',
      category: 'Adaptogen',
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
      expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('Property 1: Multiple valid supplements all display without errors', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'omega3-rec');
    mockSearchParams.set('supplement', 'omega-3');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = {
      recommendation_id: 'omega3-rec',
      quiz_id: 'quiz-omega',
      category: 'Fatty Acid',
      evidence_summary: {
        totalStudies: 100,
        totalParticipants: 5000,
        efficacyPercentage: 85,
        researchSpanYears: 20,
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
      expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('Property 1: Valid data with minimal fields still displays without error', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'minimal-rec');
    mockSearchParams.set('supplement', 'test-supplement');
    useSearchParams.mockReturnValue(mockSearchParams);

    const minimalRecommendation = {
      recommendation_id: 'minimal-rec',
      quiz_id: 'quiz-min',
      category: 'Test',
      evidence_summary: {
        totalStudies: 1,
        totalParticipants: 10,
        efficacyPercentage: 50,
        researchSpanYears: 1,
        ingredients: []
      },
      ingredients: [],
      products: [],
      personalization_factors: {}
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recommendation: minimalRecommendation })
      })
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 1: Valid data with different categories displays without error', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'vitamin-rec');
    mockSearchParams.set('supplement', 'vitamin-d');
    useSearchParams.mockReturnValue(mockSearchParams);

    const vitaminRecommendation = {
      recommendation_id: 'vitamin-rec',
      quiz_id: 'quiz-vitamin',
      category: 'Vitamin',
      evidence_summary: {
        totalStudies: 200,
        totalParticipants: 10000,
        efficacyPercentage: 90,
        researchSpanYears: 20,
        ingredients: []
      },
      ingredients: [],
      products: [],
      personalization_factors: {}
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recommendation: vitaminRecommendation })
      })
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recommendation-display')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
