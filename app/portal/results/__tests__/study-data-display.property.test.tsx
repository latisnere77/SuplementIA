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
import fc from 'fast-check';
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

// Arbitrary generator for recommendations with study data
const recommendationWithStudiesArbitrary = fc.record({
  recommendation_id: fc.string().filter(s => s.length > 0),
  quiz_id: fc.string().filter(s => s.length > 0),
  category: fc.string().filter(s => s.length > 0),
  evidence_summary: fc.record({
    totalStudies: fc.integer({ min: 1, max: 1000 }), // At least 1 study
    totalParticipants: fc.integer({ min: 0, max: 100000 }),
    efficacyPercentage: fc.nat(100),
    researchSpanYears: fc.nat(50),
    ingredients: fc.array(fc.record({
      name: fc.string().filter(s => s.length > 0),
      grade: fc.constantFrom('A', 'B', 'C'),
      studyCount: fc.nat(100),
      rctCount: fc.nat(50),
    })),
  }),
  ingredients: fc.array(fc.record({
    name: fc.string().filter(s => s.length > 0),
    grade: fc.constantFrom('A', 'B', 'C'),
  })),
  products: fc.array(fc.record({})),
  personalization_factors: fc.record({}),
  _enrichment_metadata: fc.record({
    studiesUsed: fc.integer({ min: 1, max: 100 }),
    hasRealData: fc.constant(true),
  }),
});

describe('Property 2: Study data is displayed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should display study count and participant count for recommendations with study data', async () => {
    const { useSearchParams } = require('next/navigation');
    
    await fc.assert(
      fc.asyncProperty(recommendationWithStudiesArbitrary, async (recommendation) => {
        // Clean up before each iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Setup: Mock search params
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', recommendation.recommendation_id);
        mockSearchParams.set('supplement', recommendation.category);
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return recommendation with study data
        (global.fetch as jest.Mock).mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              recommendation,
            }),
          })
        );

        // Render the component
        const { unmount } = render(<ResultsPage />);

        // Wait for loading to complete
        await waitFor(
          () => {
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            expect(loadingSpinner).not.toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Property: Study data summary should be displayed
        const studyDataSummary = screen.queryByTestId('study-data-summary');
        expect(studyDataSummary).toBeInTheDocument();

        // Property: Study count should be in the rendered text
        const studyCount = recommendation.evidence_summary.totalStudies;
        expect(studyDataSummary?.textContent).toContain(studyCount.toLocaleString());

        // Property: If participants > 0, participant count should be displayed
        if (recommendation.evidence_summary.totalParticipants > 0) {
          const participantCount = recommendation.evidence_summary.totalParticipants;
          expect(studyDataSummary?.textContent).toContain(participantCount.toLocaleString());
        }

        // Property: No warning should be shown when real study data exists
        const noStudyWarning = screen.queryByTestId('no-study-data-warning');
        expect(noStudyWarning).not.toBeInTheDocument();
        
        // Clean up
        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('should show warning when no study data is available', async () => {
    const { useSearchParams } = require('next/navigation');
    
    // Generator for recommendations WITHOUT study data
    const recommendationWithoutStudiesArbitrary = fc.record({
      recommendation_id: fc.string().filter(s => s.length > 0),
      quiz_id: fc.string().filter(s => s.length > 0),
      category: fc.string().filter(s => s.length > 0),
      evidence_summary: fc.record({
        totalStudies: fc.constant(0), // No studies
        totalParticipants: fc.constant(0),
        efficacyPercentage: fc.nat(100),
        researchSpanYears: fc.nat(50),
        ingredients: fc.array(fc.record({
          name: fc.string().filter(s => s.length > 0),
          grade: fc.constantFrom('A', 'B', 'C'),
          studyCount: fc.nat(100),
          rctCount: fc.nat(50),
        })),
      }),
      ingredients: fc.array(fc.record({
        name: fc.string().filter(s => s.length > 0),
        grade: fc.constantFrom('A', 'B', 'C'),
      })),
      products: fc.array(fc.record({})),
      personalization_factors: fc.record({}),
      _enrichment_metadata: fc.record({
        studiesUsed: fc.constant(0), // No studies used
        hasRealData: fc.constant(false),
      }),
    });
    
    await fc.assert(
      fc.asyncProperty(recommendationWithoutStudiesArbitrary, async (recommendation) => {
        // Clean up before each iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Setup: Mock search params
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', recommendation.recommendation_id);
        mockSearchParams.set('supplement', recommendation.category);
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return recommendation without study data
        (global.fetch as jest.Mock).mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              recommendation,
            }),
          })
        );

        // Render the component
        const { unmount } = render(<ResultsPage />);

        // Wait for loading to complete
        await waitFor(
          () => {
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            expect(loadingSpinner).not.toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Property: Warning should be displayed when no study data
        const noStudyWarning = screen.queryByTestId('no-study-data-warning');
        expect(noStudyWarning).toBeInTheDocument();

        // Property: Study data summary should NOT be displayed
        const studyDataSummary = screen.queryByTestId('study-data-summary');
        expect(studyDataSummary).not.toBeInTheDocument();
        
        // Clean up
        unmount();
      }),
      { numRuns: 10 }
    );
  });
});
