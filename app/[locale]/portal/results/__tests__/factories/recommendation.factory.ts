/**
 * Test Factory for Recommendation Data
 *
 * Generates valid recommendation objects that pass isValidCache() validation.
 * Use these factories in tests to ensure consistent, valid test data.
 *
 * IMPORTANT: When the data structure changes, update this factory ONCE
 * instead of updating every test file.
 */

export interface RecommendationFactoryOptions {
  id?: string;
  quizId?: string;
  category?: string;
  supplementName?: string;
  totalStudies?: number;
  studiesUsed?: number;
  totalParticipants?: number;
  efficacyPercentage?: number;
  researchSpanYears?: number;
  /** Set to true to create invalid data (for testing validation) */
  invalid?: boolean;
  /** Override _enrichment_metadata entirely */
  enrichmentMetadata?: Record<string, unknown> | null;
}

/**
 * Creates a valid recommendation object that passes isValidCache() validation.
 *
 * Key validation requirements (from page.tsx isValidCache):
 * 1. Must have recommendation_id and category
 * 2. Must have _enrichment_metadata.studiesUsed > 0 OR totalStudies > 0 with metadata
 * 3. Cannot have totalStudies > 0 with studiesUsed = 0 and no metadata (detected as fake)
 */
export function createRecommendation(options: RecommendationFactoryOptions = {}) {
  const {
    id = `rec-${Date.now()}`,
    quizId = `quiz-${Date.now()}`,
    category = 'Adaptogen',
    supplementName = 'Ashwagandha',
    totalStudies = 50,
    studiesUsed = 25,
    totalParticipants = 2000,
    efficacyPercentage = 80,
    researchSpanYears = 10,
    invalid = false,
    enrichmentMetadata,
  } = options;

  // Base recommendation structure
  const recommendation: Record<string, unknown> = {
    recommendation_id: id,
    quiz_id: quizId,
    category,
    evidence_summary: {
      totalStudies,
      totalParticipants,
      efficacyPercentage,
      researchSpanYears,
      ingredients: [
        {
          name: supplementName,
          confidence: 0.95,
          studyCount: totalStudies,
        },
      ],
    },
    ingredients: [
      {
        name: supplementName,
        dosage: '300-600mg',
        timing: 'morning',
      },
    ],
    products: [],
    personalization_factors: {
      goals: ['stress-reduction', 'energy'],
      constraints: [],
    },
    supplement: {
      name: supplementName,
      category,
      whatIsIt: `${supplementName} is a popular adaptogenic herb.`,
      primaryUses: ['Stress reduction', 'Energy support'],
      worksFor: [
        {
          condition: 'Stress & Anxiety',
          evidenceGrade: 'A',
          effectSize: 'Moderate to Large',
          notes: 'Well-documented anxiolytic effects',
        },
        {
          condition: 'Physical Performance',
          evidenceGrade: 'B',
          effectSize: 'Moderate',
          notes: 'May improve strength and recovery',
        },
      ],
      doesntWorkFor: [],
      limitedEvidence: [],
      mechanisms: [
        {
          name: 'HPA Axis Modulation',
          description: 'Helps regulate cortisol response',
          evidenceLevel: 'strong',
          target: 'Hypothalamic-pituitary-adrenal axis',
        },
      ],
      dosage: {
        standard: '300-600mg daily',
        timing: 'Morning or evening',
        duration: '8-12 weeks for full effects',
        effectiveDose: '300mg',
        optimalDose: '600mg',
      },
      safety: {
        overallRating: 'Generally Safe',
        sideEffects: [
          {
            effect: 'Mild digestive upset',
            frequency: 'Occasional',
            severity: 'Mild',
          },
        ],
        contraindications: ['Pregnancy', 'Autoimmune conditions'],
        interactions: [],
      },
      buyingGuidance: {
        preferredForm: 'KSM-66 or Sensoril extract',
        keyCompounds: [
          {
            name: 'Withanolides',
            source: 'Root extract',
            lookFor: '5% withanolides minimum',
          },
        ],
        avoidFlags: ['Proprietary blends', 'No third-party testing'],
        qualityIndicators: ['Standardized extract', 'Third-party tested', 'Organic certified'],
        notes: 'Root extracts are most studied',
      },
    },
  };

  // Add enrichment metadata (required for isValidCache validation)
  if (enrichmentMetadata === null) {
    // Explicitly no metadata (for testing invalid scenarios)
  } else if (enrichmentMetadata) {
    recommendation._enrichment_metadata = enrichmentMetadata;
  } else if (!invalid) {
    // Default valid metadata
    recommendation._enrichment_metadata = {
      studiesUsed,
      enrichedAt: new Date().toISOString(),
      model: 'claude-3-sonnet',
      hasRealData: true,
    };
  }

  return recommendation;
}

/**
 * Creates an invalid recommendation (for testing error states)
 * This will fail isValidCache() validation
 */
export function createInvalidRecommendation(
  reason: 'no-metadata' | 'fake-data' | 'missing-fields' | 'no-studies' = 'fake-data'
) {
  switch (reason) {
    case 'no-metadata':
      return createRecommendation({
        enrichmentMetadata: null,
        totalStudies: 0,
      });

    case 'fake-data':
      // totalStudies > 0 but studiesUsed = 0 and no metadata = fake data
      return {
        recommendation_id: 'fake-rec',
        quiz_id: 'fake-quiz',
        category: 'Test',
        evidence_summary: {
          totalStudies: 100, // Has studies
          totalParticipants: 5000,
          efficacyPercentage: 90,
          researchSpanYears: 15,
          ingredients: [],
        },
        ingredients: [],
        products: [],
        personalization_factors: {},
        // NO _enrichment_metadata = will be detected as fake
      };

    case 'missing-fields':
      return {
        // Missing recommendation_id and category
        quiz_id: 'orphan-quiz',
        evidence_summary: {},
      };

    case 'no-studies':
      return createRecommendation({
        totalStudies: 0,
        studiesUsed: 0,
      });

    default:
      return createInvalidRecommendation('fake-data');
  }
}

/**
 * Creates a recommendation with specific supplement data
 */
export function createSupplementRecommendation(
  supplementName: string,
  category: string,
  overrides: Partial<RecommendationFactoryOptions> = {}
) {
  return createRecommendation({
    id: `rec-${supplementName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    supplementName,
    category,
    ...overrides,
  });
}

/**
 * Pre-configured recommendations for common test scenarios
 */
export const TestRecommendations = {
  ashwagandha: () =>
    createSupplementRecommendation('Ashwagandha', 'Adaptogen', {
      totalStudies: 50,
      studiesUsed: 25,
    }),

  omega3: () =>
    createSupplementRecommendation('Omega-3', 'Fatty Acid', {
      totalStudies: 100,
      studiesUsed: 50,
      totalParticipants: 5000,
      researchSpanYears: 20,
    }),

  creatine: () =>
    createSupplementRecommendation('Creatine', 'Sports Nutrition', {
      totalStudies: 200,
      studiesUsed: 100,
      totalParticipants: 10000,
      efficacyPercentage: 95,
    }),

  vitaminD: () =>
    createSupplementRecommendation('Vitamin D', 'Vitamin', {
      totalStudies: 150,
      studiesUsed: 75,
    }),

  magnesium: () =>
    createSupplementRecommendation('Magnesium', 'Mineral', {
      totalStudies: 80,
      studiesUsed: 40,
    }),
};

/**
 * Creates a mock fetch response for recommendations
 */
export function createMockFetchResponse(recommendation: Record<string, unknown>) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, recommendation }),
  });
}

/**
 * Creates a mock fetch that returns the given recommendation
 */
export function mockFetchWithRecommendation(recommendation: Record<string, unknown>) {
  return jest.fn().mockImplementation(() => createMockFetchResponse(recommendation));
}

/**
 * Creates cache data structure for localStorage
 */
export function createCacheData(
  recommendation: Record<string, unknown>,
  options: { ttl?: number; age?: number } = {}
) {
  const { ttl = 24 * 60 * 60 * 1000, age = 0 } = options; // Default 24h TTL
  return {
    recommendation,
    timestamp: Date.now() - age,
    ttl,
  };
}

/**
 * Sets up localStorage with cached recommendation
 */
export function setupCachedRecommendation(
  recommendationId: string,
  recommendation: Record<string, unknown>,
  options: { ttl?: number; age?: number } = {}
) {
  const cacheKey = `recommendation_${recommendationId}`;
  const cacheData = createCacheData(recommendation, options);
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  return cacheKey;
}
