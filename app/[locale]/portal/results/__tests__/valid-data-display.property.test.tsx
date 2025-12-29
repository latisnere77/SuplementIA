/**
 * Property Test: Valid data displays recommendation
 * Validates: Requirements 1.1, 1.2, 2.1
 *
 * Property 1: When the API returns valid recommendation data,
 * the component should display the recommendation and NOT show error state
 */

import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from '../page';
import {
  createRecommendation,
  createMockFetchResponse,
} from './factories/recommendation.factory';

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

    const mockRecommendation = createRecommendation({
      id: 'ashwagandha-rec',
      quizId: 'quiz-ash',
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
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
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

    const mockRecommendation = createRecommendation({
      id: 'omega3-rec',
      quizId: 'quiz-omega',
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

    const minimalRecommendation = createRecommendation({
      id: 'minimal-rec',
      quizId: 'quiz-min',
      category: 'Test',
      supplementName: 'Test Supplement',
      totalStudies: 1,
      studiesUsed: 1,
      totalParticipants: 10,
      efficacyPercentage: 50,
      researchSpanYears: 1,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(minimalRecommendation)
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('Property 1: Valid data with different categories displays without error', async () => {
    const { useSearchParams } = jest.requireMock('next/navigation');
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.set('id', 'vitamin-rec');
    mockSearchParams.set('supplement', 'vitamin-d');
    useSearchParams.mockReturnValue(mockSearchParams);

    const vitaminRecommendation = createRecommendation({
      id: 'vitamin-rec',
      quizId: 'quiz-vitamin',
      category: 'Vitamin',
      supplementName: 'Vitamin D',
      totalStudies: 200,
      studiesUsed: 100,
      totalParticipants: 10000,
      efficacyPercentage: 90,
      researchSpanYears: 20,
    });

    (global.fetch as jest.Mock).mockImplementation(() =>
      createMockFetchResponse(vitaminRecommendation)
    );

    render(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('evidence-panel')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
