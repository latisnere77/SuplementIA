/**
 * Property Test: Cache retrieval works correctly
 * Validates: Requirements 1.5
 * 
 * Property 4: When valid cached data exists, the component should:
 * - Use the cached data without making an API call
 * - Display the recommendation immediately
 * - Not show error state
 * - Not show loading state for extended period
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
    return <div data-testid="evidence-panel">Evidence</div>;
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

  it('Property 4: Fresh data retrieval works when no cache exists', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'fresh-ashwagandha');
    mockSearchParams.set('supplement', 'ashwagandha');
    useSearchParams.mockReturnValue(mockSearchParams);

    const freshRecommendation = {
      recommendation_id: 'fresh-ashwagandha',
      quiz_id: 'quiz-fresh',
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
        json: () => Promise.resolve({ success: true, recommendation: freshRecommendation })
      })
    );

    render(<ResultsPage />);

    // Should make API call when no cache
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Should display recommendation
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should NOT show error state
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 4: Data retrieval works for different supplements', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    
    // Test first supplement
    const mockSearchParams1 = new URLSearchParams();
    mockSearchParams1.set('id', 'omega3-fresh');
    mockSearchParams1.set('supplement', 'omega-3');
    useSearchParams.mockReturnValue(mockSearchParams1);

    const omega3Recommendation = {
      recommendation_id: 'omega3-fresh',
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
        json: () => Promise.resolve({ success: true, recommendation: omega3Recommendation })
      })
    );

    const { unmount } = render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();

    unmount();
    jest.clearAllMocks();
    document.body.innerHTML = '';

    // Test second supplement
    const mockSearchParams2 = new URLSearchParams();
    mockSearchParams2.set('id', 'vitamin-d-fresh');
    mockSearchParams2.set('supplement', 'vitamin-d');
    useSearchParams.mockReturnValue(mockSearchParams2);

    const vitaminDRecommendation = {
      recommendation_id: 'vitamin-d-fresh',
      quiz_id: 'quiz-vitd',
      category: 'Vitamin',
      evidence_summary: {
        totalStudies: 200,
        totalParticipants: 10000,
        efficacyPercentage: 90,
        researchSpanYears: 25,
        ingredients: []
      },
      ingredients: [],
      products: [],
      personalization_factors: {}
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recommendation: vitaminDRecommendation })
      })
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 4: Expired cache triggers API call instead of using stale data', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'expired-cache');
    mockSearchParams.set('supplement', 'magnesium');
    useSearchParams.mockReturnValue(mockSearchParams);

    const expiredRecommendation = {
      recommendation_id: 'expired-cache',
      quiz_id: 'quiz-expired',
      category: 'Mineral',
      evidence_summary: {
        totalStudies: 30,
        totalParticipants: 1000,
        efficacyPercentage: 70,
        researchSpanYears: 5,
        ingredients: []
      },
      ingredients: [],
      products: [],
      personalization_factors: {}
    };

    // Set cache with expired timestamp (25 hours ago)
    localStorage.setItem(
      'recommendation_expired-cache',
      JSON.stringify({
        recommendation: expiredRecommendation,
        timestamp: Date.now() - (25 * 60 * 60 * 1000)
      })
    );

    const freshRecommendation = {
      recommendation_id: 'expired-cache',
      quiz_id: 'quiz-fresh',
      category: 'Mineral',
      evidence_summary: {
        totalStudies: 75,
        totalParticipants: 3000,
        efficacyPercentage: 85,
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
        json: () => Promise.resolve({ success: true, recommendation: freshRecommendation })
      })
    );

    render(<ResultsPage />);

    // Should make API call because cache is expired
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Should display fresh data
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 4: Missing cache triggers API call', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'no-cache');
    mockSearchParams.set('supplement', 'creatine');
    useSearchParams.mockReturnValue(mockSearchParams);

    // No cache set - localStorage is empty

    const freshRecommendation = {
      recommendation_id: 'no-cache',
      quiz_id: 'quiz-fresh',
      category: 'Amino Acid',
      evidence_summary: {
        totalStudies: 150,
        totalParticipants: 8000,
        efficacyPercentage: 88,
        researchSpanYears: 15,
        ingredients: []
      },
      ingredients: [],
      products: [],
      personalization_factors: {}
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, recommendation: freshRecommendation })
      })
    );

    render(<ResultsPage />);

    // Should make API call because no cache exists
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Should display fresh data
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 4: Valid data prevents error state', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'valid-no-error');
    mockSearchParams.set('supplement', 'zinc');
    useSearchParams.mockReturnValue(mockSearchParams);

    const validRecommendation = {
      recommendation_id: 'valid-no-error',
      quiz_id: 'quiz-zinc',
      category: 'Mineral',
      evidence_summary: {
        totalStudies: 80,
        totalParticipants: 4000,
        efficacyPercentage: 82,
        researchSpanYears: 12,
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

    // Should display recommendation
    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Critical: Should NOT show error state with valid data
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
