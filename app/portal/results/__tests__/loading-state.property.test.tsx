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
import fc from 'fast-check';
import ResultsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock all child components to isolate the loading state logic
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

// Arbitrary generator for API response data
const apiResponseArbitrary = fc.record({
  success: fc.boolean(),
  recommendation: fc.option(
    fc.record({
      recommendation_id: fc.string(),
      quiz_id: fc.string(),
      category: fc.string(),
      evidence_summary: fc.record({
        totalStudies: fc.nat(1000),
        totalParticipants: fc.nat(100000),
        efficacyPercentage: fc.nat(100),
        researchSpanYears: fc.nat(50),
        ingredients: fc.array(
          fc.record({
            name: fc.string(),
            grade: fc.constantFrom('A', 'B', 'C'),
            studyCount: fc.nat(100),
            rctCount: fc.nat(50),
          })
        ),
      }),
      ingredients: fc.array(
        fc.record({
          name: fc.string(),
          grade: fc.constantFrom('A', 'B', 'C'),
        })
      ),
      products: fc.array(fc.record({})),
      personalization_factors: fc.record({}),
    }),
    { nil: null }
  ),
});

describe('Property 5: Loading state transitions correctly', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = jest.fn();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any rendered components
    document.body.innerHTML = '';
  });

  it('should transition from loading to loaded state when API responds', async () => {
    const { useSearchParams } = require('next/navigation');
    
    await fc.assert(
      fc.asyncProperty(apiResponseArbitrary, async (apiResponse) => {
        // Clean up before each property test iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Setup: Mock search params with a recommendation ID
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', 'test-rec-id');
        mockSearchParams.set('supplement', 'test-supplement');
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return the API response after a delay
        (global.fetch as jest.Mock).mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(apiResponse),
          })
        );

        // Render the component
        const { unmount } = render(<ResultsPage />);

        // Property: Initially, loading spinner should be visible
        const initialLoadingSpinner = screen.queryByTestId('loading-spinner');
        expect(initialLoadingSpinner).toBeInTheDocument();

        // Property: After API response, loading spinner should be hidden
        await waitFor(
          () => {
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            expect(loadingSpinner).not.toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Property: Either error state or recommendation should be shown (not loading)
        const errorState = screen.queryByTestId('error-state');
        const recommendationDisplay = screen.queryByTestId('recommendation-display');
        
        // At least one of these should be present (not loading anymore)
        expect(errorState !== null || recommendationDisplay !== null).toBe(true);
        
        // Clean up after this iteration
        unmount();
      }),
      { numRuns: 10 } // Reduced from 100 to 10 for faster feedback during development
    );
  });

  it('should hide loading spinner when error occurs', async () => {
    const { useSearchParams } = require('next/navigation');
    
    await fc.assert(
      fc.asyncProperty(fc.string().filter(s => s.length > 0), async (errorMessage) => {
        // Clean up before each property test iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();
        
        // Setup: Mock search params
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', 'test-rec-id');
        mockSearchParams.set('supplement', 'test-supplement');
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return an error
        (global.fetch as jest.Mock).mockImplementation(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: errorMessage }),
          })
        );

        // Render the component
        const { unmount } = render(<ResultsPage />);

        // Property: Initially, loading spinner should be visible
        const initialLoadingSpinner = screen.queryByTestId('loading-spinner');
        expect(initialLoadingSpinner).toBeInTheDocument();

        // Property: After error, loading spinner should be hidden and error state shown
        await waitFor(
          () => {
            const loadingSpinner = screen.queryByTestId('loading-spinner');
            const errorState = screen.queryByTestId('error-state');
            
            expect(loadingSpinner).not.toBeInTheDocument();
            expect(errorState).toBeInTheDocument();
          },
          { timeout: 3000 }
        );
        
        // Clean up after this iteration
        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('should hide loading spinner when recommendation is received', async () => {
    const { useSearchParams } = require('next/navigation');
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          recommendation_id: fc.string().filter(s => s.length > 0),
          quiz_id: fc.string().filter(s => s.length > 0),
          category: fc.string().filter(s => s.length > 0),
          evidence_summary: fc.record({
            totalStudies: fc.nat(1000),
            totalParticipants: fc.nat(100000),
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
        }),
        async (recommendation) => {
          // Clean up before each property test iteration
          document.body.innerHTML = '';
          jest.clearAllMocks();
          
          // Setup: Mock search params
          const mockSearchParams = new URLSearchParams();
          mockSearchParams.set('id', recommendation.recommendation_id);
          mockSearchParams.set('supplement', recommendation.category);
          useSearchParams.mockReturnValue(mockSearchParams);

          // Setup: Mock fetch to return valid recommendation
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

          // Property: Initially, loading spinner should be visible
          const initialLoadingSpinner = screen.queryByTestId('loading-spinner');
          expect(initialLoadingSpinner).toBeInTheDocument();

          // Property: After recommendation loads, loading spinner should be hidden
          await waitFor(
            () => {
              const loadingSpinner = screen.queryByTestId('loading-spinner');
              expect(loadingSpinner).not.toBeInTheDocument();
            },
            { timeout: 3000 }
          );

          // Property: Recommendation display should be visible
          await waitFor(
            () => {
              const recommendationDisplay = screen.queryByTestId('recommendation-display');
              expect(recommendationDisplay).toBeInTheDocument();
            },
            { timeout: 3000 }
          );
          
          // Clean up after this iteration
          unmount();
        }
      ),
      { numRuns: 10 }
    );
  });
});
