/**
 * Property-Based Test for Complete Recommendation Sections
 * 
 * **Feature: frontend-error-display-fix, Property 3: Complete recommendation sections render**
 * **Validates: Requirements 1.4**
 * 
 * Property: For any recommendation with benefits, dosage, and side effects data, 
 * all three sections should be present in the rendered output.
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

// Mock child components - but we need to check if sections are rendered
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

// Mock EvidenceAnalysisPanelNew to render sections based on props
jest.mock('@/components/portal/EvidenceAnalysisPanelNew', () => {
  return function MockEvidencePanel({ evidenceSummary }: any) {
    return (
      <div data-testid="evidence-panel">
        {evidenceSummary?.worksFor && evidenceSummary.worksFor.length > 0 && (
          <div data-testid="benefits-section">Benefits</div>
        )}
        {evidenceSummary?.dosage && (
          <div data-testid="dosage-section">Dosage</div>
        )}
        {evidenceSummary?.sideEffects && (
          Array.isArray(evidenceSummary.sideEffects)
            ? evidenceSummary.sideEffects.length > 0
            : (evidenceSummary.sideEffects.common?.length > 0 || evidenceSummary.sideEffects.rare?.length > 0)
        ) && (
            <div data-testid="side-effects-section">Side Effects</div>
          )}
      </div>
    );
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

// Arbitrary generator for recommendations with complete sections
const completeRecommendationArbitrary = fc.record({
  recommendation_id: fc.string().filter(s => s.length > 0),
  quiz_id: fc.string().filter(s => s.length > 0),
  category: fc.string().filter(s => s.length > 0),
  evidence_summary: fc.record({
    totalStudies: fc.integer({ min: 1, max: 1000 }),
    totalParticipants: fc.integer({ min: 1, max: 100000 }),
    efficacyPercentage: fc.nat(100),
    researchSpanYears: fc.nat(50),
    ingredients: fc.array(fc.record({
      name: fc.string().filter(s => s.length > 0),
      grade: fc.constantFrom('A', 'B', 'C'),
      studyCount: fc.nat(100),
      rctCount: fc.nat(50),
    }), { minLength: 1 }),
  }),
  supplement: fc.record({
    name: fc.string().filter(s => s.length > 0),
    description: fc.string().filter(s => s.length > 0),
    // Benefits (worksFor)
    worksFor: fc.array(fc.record({
      condition: fc.string().filter(s => s.length > 0),
      grade: fc.constantFrom('A', 'B', 'C'),
      notes: fc.string(),
      studyCount: fc.nat(100),
    }), { minLength: 1 }),
    // Dosage
    dosage: fc.record({
      effectiveDose: fc.string().filter(s => s.length > 0),
      standard: fc.string().filter(s => s.length > 0),
      timing: fc.string().filter(s => s.length > 0),
      notes: fc.string(),
    }),
    // Side effects
    sideEffects: fc.array(fc.oneof(
      fc.string().filter(s => s.length > 0),
      fc.record({
        effect: fc.string().filter(s => s.length > 0),
        frequency: fc.string(),
        severity: fc.constantFrom('Mild', 'Moderate', 'Severe'),
      })
    ), { minLength: 1 }),
    contraindications: fc.array(fc.string()),
    interactions: fc.array(fc.string()),
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

describe('Property 3: Complete recommendation sections render', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should render all three sections when recommendation has complete data', async () => {
    const { useSearchParams } = require('next/navigation');

    await fc.assert(
      fc.asyncProperty(completeRecommendationArbitrary, async (recommendation) => {
        // Clean up before each iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();

        // Setup: Mock search params
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', recommendation.recommendation_id);
        mockSearchParams.set('supplement', recommendation.category);
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return complete recommendation
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

        // Wait for evidence panel to render
        await waitFor(
          () => {
            const evidencePanel = screen.queryByTestId('evidence-panel');
            expect(evidencePanel).toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Property: Benefits section should be rendered
        const benefitsSection = screen.queryByTestId('benefits-section');
        expect(benefitsSection).toBeInTheDocument();

        // Property: Dosage section should be rendered
        const dosageSection = screen.queryByTestId('dosage-section');
        expect(dosageSection).toBeInTheDocument();

        // Property: Side effects section should be rendered
        const sideEffectsSection = screen.queryByTestId('side-effects-section');
        expect(sideEffectsSection).toBeInTheDocument();

        // Clean up
        unmount();
      }),
      { numRuns: 10 }
    );
  });

  it('should not render sections when data is missing', async () => {
    const { useSearchParams } = require('next/navigation');

    // Generator for recommendations WITHOUT complete sections
    const incompleteRecommendationArbitrary = fc.record({
      recommendation_id: fc.string().filter(s => s.length > 0),
      quiz_id: fc.string().filter(s => s.length > 0),
      category: fc.string().filter(s => s.length > 0),
      evidence_summary: fc.record({
        totalStudies: fc.integer({ min: 1, max: 1000 }),
        totalParticipants: fc.integer({ min: 1, max: 100000 }),
        efficacyPercentage: fc.nat(100),
        researchSpanYears: fc.nat(50),
        ingredients: fc.array(fc.record({
          name: fc.string().filter(s => s.length > 0),
          grade: fc.constantFrom('A', 'B', 'C'),
          studyCount: fc.nat(100),
          rctCount: fc.nat(50),
        })),
      }),
      supplement: fc.record({
        name: fc.string().filter(s => s.length > 0),
        description: fc.string().filter(s => s.length > 0),
        // No worksFor, dosage, or sideEffects
        worksFor: fc.constant([]),
        dosage: fc.constant(undefined),
        sideEffects: fc.constant([]),
        contraindications: fc.array(fc.string()),
        interactions: fc.array(fc.string()),
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

    await fc.assert(
      fc.asyncProperty(incompleteRecommendationArbitrary, async (recommendation) => {
        // Clean up before each iteration
        document.body.innerHTML = '';
        jest.clearAllMocks();

        // Setup: Mock search params
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('id', recommendation.recommendation_id);
        mockSearchParams.set('supplement', recommendation.category);
        useSearchParams.mockReturnValue(mockSearchParams);

        // Setup: Mock fetch to return incomplete recommendation
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

        // Wait for evidence panel to render
        await waitFor(
          () => {
            const evidencePanel = screen.queryByTestId('evidence-panel');
            expect(evidencePanel).toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Property: Benefits section should NOT be rendered (no data)
        const benefitsSection = screen.queryByTestId('benefits-section');
        expect(benefitsSection).not.toBeInTheDocument();

        // Property: Dosage section should NOT be rendered (no data)
        const dosageSection = screen.queryByTestId('dosage-section');
        expect(dosageSection).not.toBeInTheDocument();

        // Property: Side effects section should NOT be rendered (no data)
        const sideEffectsSection = screen.queryByTestId('side-effects-section');
        expect(sideEffectsSection).not.toBeInTheDocument();

        // Clean up
        unmount();
      }),
      { numRuns: 10 }
    );
  });
});
