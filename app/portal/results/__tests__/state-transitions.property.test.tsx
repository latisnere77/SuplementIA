/**
 * Property Test: State changes trigger re-renders
 * Validates: Requirements 3.5
 * 
 * Property 6: When recommendation, isLoading, or error state changes,
 * the component should re-render and display the appropriate UI
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
    return <div data-testid="product-grid">Products</div>;
  };
});

jest.mock('@/components/portal/ScientificStudiesPanel', () => {
  return function MockStudiesPanel() {
    return <div data-testid="studies-panel">Studies</div>;
  };
});

jest.mock('@/components/portal/ShareReferralCard', () => {
  return function MockShareCard() {
    return <div data-testid="share-card">Share</div>;
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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Property Test: State Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Property 6: State changes from loading → data trigger correct UI updates', async () => {
    const { useSearchParams } = require('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'test-rec-id');
    mockSearchParams.set('supplement', 'ashwagandha');
    useSearchParams.mockReturnValue(mockSearchParams);

    const mockRecommendation = {
      recommendation_id: 'test-123',
      quiz_id: 'quiz-123',
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

    // Initial state: should show loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();

    // After API response: should show recommendation
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 6: State changes from loading → error trigger correct UI updates', async () => {
    const { useSearchParams } = require('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'invalid-rec-id');
    mockSearchParams.set('supplement', 'invalid');
    useSearchParams.mockReturnValue(mockSearchParams);

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'API Error' })
      })
    );

    render(<ResultsPage />);

    // Initial state: should show loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // After API error: should show error state
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('evidence-panel')).not.toBeInTheDocument();
  });
});
