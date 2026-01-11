/**
 * Shared mocks for Results Page tests
 *
 * Import this file at the top of test files to apply all necessary mocks
 */

import React from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
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

jest.mock('@/components/portal/StreamingResults', () => {
  return {
    StreamingResults: function MockStreamingResults() {
      return null;
    },
  };
});

jest.mock('@/components/portal/BenefitStudiesModal', () => {
  return function MockBenefitStudiesModal() {
    return null;
  };
});

jest.mock('@/components/portal/ConditionResultsDisplay', () => {
  return function MockConditionResultsDisplay() {
    return null;
  };
});

// Mock lib modules
jest.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

jest.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('@/lib/portal/search-analytics', () => ({
  searchAnalytics: {
    logSuccess: jest.fn(),
    logFailure: jest.fn(),
    logSearch: jest.fn(),
  },
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

// Export for use in test setup
export {};
