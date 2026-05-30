/**
 * Portal Results Page
 * Displays evidence analysis, personalization, and product recommendations
 * Force redeploy: 2025-12-14T08:00:00Z
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// Client component - fetches data client-side via useEffect
// Data freshness is ensured by API calls on component mount

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EvidenceAnalysisPanelNew from '@/components/portal/EvidenceAnalysisPanelNew';
import ProductRecommendationsGrid from '@/components/portal/ProductRecommendationsGrid';
import PaywallModal from '@/components/portal/PaywallModal';
import ShareReferralCard from '@/components/portal/ShareReferralCard';
import ScientificStudiesPanel from '@/components/portal/ScientificStudiesPanel';
import RankingAnalysisPanel from '@/components/portal/RankingAnalysisPanel';
import IntelligentLoadingSpinner from '@/components/portal/IntelligentLoadingSpinner';

import LegalDisclaimer from '@/components/portal/LegalDisclaimer';
import { StreamingResults as _StreamingResults } from '@/components/portal/StreamingResults';
import ExamineStyleView from '@/components/portal/ExamineStyleView';
import { ViewToggle, type ViewMode } from '@/components/portal/ViewToggle';
import { ErrorState } from '@/components/portal/ErrorState';
import VariantSelectorModal from '@/components/portal/VariantSelectorModal';
import type { VariantDetectionResult, SupplementVariant } from '@/types/supplement-variants';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/lib/auth/useAuth';
import { searchAnalytics } from '@/lib/portal/search-analytics';
import { traceSearch } from '@/lib/portal/xray-client';
import { normalizeQuery as _normalizeQuery } from '@/lib/portal/query-normalization';
import { searchSupplement as _searchSupplement } from '@/lib/portal/supplement-search';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { normalizeBenefit } from '@/lib/portal/benefit-normalization';
import { getTopSuggestedBenefit, getSuggestedBenefits } from '@/lib/portal/supplement-benefit-suggestions';
import { filterByBenefit } from '@/lib/portal/benefit-study-filter';
import BenefitStudiesModal from '@/components/portal/BenefitStudiesModal';
import { getLocalizedSupplementName } from '@/lib/i18n/supplement-names';
import type { GradeType } from '@/types/supplement-grade';
import type { PubMedQueryResult, SupplementEvidence as _SupplementEvidence } from '@/lib/services/pubmed-search';
import ConditionResultsDisplay from '@/components/portal/ConditionResultsDisplay';
import { compareEvidenceGrades, isStrongEvidenceGrade, normalizeEvidenceGrade } from '@/lib/portal/evidence-grades';
import { trackGAEvent } from '@/lib/analytics/ga4';
import {
  cleanDosageValue,
  getDefaultDosageMessage,
  getVisibleEvidenceMetadata,
} from '@/lib/portal/visible-evidence-metadata';

// ====================================
// CACHE VALIDATION HELPER
// ====================================

/**
 * Validates cached recommendation data
 * Checks for null/undefined, metadata structure, and real study data
 * 
 * @param cachedRecommendation - The cached recommendation object to validate
 * @returns true if cache is valid, false otherwise
 */
function isValidCache(cachedRecommendation: any): boolean {
  console.log('[Cache Validation] Starting validation...');

  // Check 1: Null/undefined recommendation
  if (!cachedRecommendation) {
    console.log('[Cache Validation] ❌ Recommendation is null or undefined');
    return false;
  }

  // Check 2: Validate basic structure
  if (!cachedRecommendation.recommendation_id || !cachedRecommendation.category) {
    console.log('[Cache Validation] ❌ Missing required fields (recommendation_id or category)');
    return false;
  }

  // Check 3: Validate metadata structure
  const metadata = cachedRecommendation._enrichment_metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;

  console.log('[Cache Validation] Metadata check:', {
    hasMetadata,
    metadataKeys: Object.keys(metadata),
  });

  // Check 4: Validate study data - check totalStudies OR studiesUsed > 0
  const totalStudies = cachedRecommendation.evidence_summary?.totalStudies || 0;
  const studiesUsed = metadata.studiesUsed || 0;

  // Valid if either totalStudies > 0 OR studiesUsed > 0
  const hasRealData = totalStudies > 0 || studiesUsed > 0;

  console.log('[Cache Validation] Study data check:', {
    totalStudies,
    studiesUsed,
    hasRealData,
    category: cachedRecommendation.category,
  });

  // Check 5: Additional validation - ensure not fake/generated data
  // Fake data has totalStudies > 0 but studiesUsed = 0
  const hasFakeData = totalStudies > 0 && studiesUsed === 0 && !hasMetadata;

  if (hasFakeData) {
    console.log('[Cache Validation] ❌ Detected fake/generated data (totalStudies > 0 but studiesUsed = 0)');
    return false;
  }

  // Final result
  const isValid = hasRealData;
  console.log('[Cache Validation] Final result:', {
    isValid,
    reason: isValid ? 'Has real study data' : 'No real study data found',
  });

  return isValid;
}

function attachResponseSource(recommendation: any, source?: string): any {
  if (!recommendation || !source) return recommendation;
  return {
    ...recommendation,
    _response_source: source,
  };
}

// ====================================
// ADAPTER FUNCTION - Client-Side Transformation
// ====================================

/**
 * Transform recommendation data to format expected by EvidenceAnalysisPanelNew
 * This is a SIMPLE client-side adapter (no API calls, no DynamoDB, no hardcoded data)
 *
 * The new intelligent system (/api/portal/recommend → /enrich → Lambdas) already
 * provides all the data we need. We just need to map it to the visual format.
 */
function transformRecommendationToEvidence(recommendation: Recommendation, language: 'en' | 'es' = 'es'): any {
  // Extract supplement data from recommendation (defensive)
  const supplement = (recommendation as any).supplement || {};
  const evidenceSummary = recommendation.evidence_summary || {};

  // DEBUG: Log transformation input
  console.log('[transformRecommendationToEvidence] Input:', {
    category: recommendation.category,
    supplementName: supplement.name,
    hasWorksFor: Array.isArray(supplement.worksFor),
    worksForCount: supplement.worksFor?.length || 0,
    hasDoesntWorkFor: Array.isArray(supplement.doesntWorkFor),
    doesntWorkForCount: supplement.doesntWorkFor?.length || 0,
    hasLimitedEvidence: Array.isArray(supplement.limitedEvidence),
    limitedEvidenceCount: supplement.limitedEvidence?.length || 0,
    hasSideEffects: Array.isArray(supplement.sideEffects),
    sideEffectsCount: supplement.sideEffects?.length || 0,
    hasDosage: !!supplement.dosage,
    dosageType: typeof supplement.dosage,
    ingredientsCount: evidenceSummary.ingredients?.length || 0,
  });

  // 🔍🔍🔍 CRITICAL DEBUG: Check studies.ranked data
  const evidenceSummaryAny = evidenceSummary as any;
  console.log('🔍🔍🔍 [FRONTEND_STUDIES_CHECK] evidenceSummary.studies:', {
    hasStudies: !!evidenceSummaryAny.studies,
    studiesKeys: evidenceSummaryAny.studies ? Object.keys(evidenceSummaryAny.studies) : [],
    hasRanked: !!evidenceSummaryAny.studies?.ranked,
    rankedKeys: evidenceSummaryAny.studies?.ranked ? Object.keys(evidenceSummaryAny.studies.ranked) : [],
    fullStudiesObject: evidenceSummaryAny.studies
  });

  // 🔍 Also check metadata path (legacy)
  const enrichmentMetadata = (recommendation as any)._enrichment_metadata || {};
  console.log('🔍 [FRONTEND_METADATA_CHECK] _enrichment_metadata:', {
    hasMetadata: !!enrichmentMetadata,
    metadataKeys: enrichmentMetadata ? Object.keys(enrichmentMetadata) : [],
    hasMetadataStudies: !!enrichmentMetadata.studies,
    metadataStudiesKeys: enrichmentMetadata.studies ? Object.keys(enrichmentMetadata.studies) : []
  });

  const rawWorksFor = Array.isArray(supplement.worksFor) ? supplement.worksFor.map((item: any) => {
    const grade = normalizeEvidenceGrade(item.evidenceGrade || item.grade);
    return {
      condition: item.condition || item.use || item.benefit || '',
      grade,
      description: item.notes || item.effectSize || item.magnitude || '',
      studyCount: item.studyCount || 0,
      metaAnalysis: item.metaAnalysis || false,
    };
  }) : [];

  // Only grade A/B evidence is allowed in "Funciona para".
  // Lower or missing grades must not be promoted from catalog/search metadata.
  const worksFor = rawWorksFor
    .filter((item: any) => isStrongEvidenceGrade(item.grade))
    .sort((a: any, b: any) => compareEvidenceGrades(a.grade, b.grade) || ((b.studyCount || 0) - (a.studyCount || 0)));

  const doesntWorkFor = Array.isArray(supplement.doesntWorkFor) ? supplement.doesntWorkFor.map((item: any) => ({
    condition: item.condition || item.use || '',
    grade: item.evidenceGrade || item.grade || 'D',
    description: item.notes || item.effectSize || '',
    studyCount: item.studyCount || 0,
  })) : [];

  const limitedEvidence = Array.isArray(supplement.limitedEvidence) ? supplement.limitedEvidence.map((item: any) => {
    const rawGrade = normalizeEvidenceGrade(item.evidenceGrade || item.grade);
    const adjustedGrade = isStrongEvidenceGrade(rawGrade) ? 'C' : rawGrade;

    return {
      condition: item.condition || item.use || '',
      grade: adjustedGrade as GradeType,
      description: item.notes || '',
      studyCount: item.studyCount || 0,
    };
  }) : [];

  // NEW: Transform evidence_by_benefit
  const evidenceByBenefit = Array.isArray(recommendation.evidence_by_benefit) ? recommendation.evidence_by_benefit.map((item: any) => ({
    benefit: item.benefit || '',
    evidenceLevel: item.evidence_level || 'Insuficiente',
    studiesFound: item.studies_found || 0,
    totalParticipants: item.total_participants || 0,
    summary: item.summary || '',
  })) : [];

  // DEBUG: Log parsed structured data
  console.log('[transformRecommendationToEvidence] Structured data:', {
    worksForCount: worksFor.length,
    doesntWorkForCount: doesntWorkFor.length,
    limitedEvidenceCount: limitedEvidence.length,
  });

  // Defensive: Ensure ingredients array exists
  const ingredients = Array.isArray(evidenceSummary.ingredients) ? evidenceSummary.ingredients : [];

  // Determine overall grade from ingredients
  const overallGrade = ingredients.length > 0
    ? ingredients[0].grade
    : ('C' as any);

  // Transform dosage
  const rawDosage = typeof supplement.dosage === 'object' && supplement.dosage !== null ? supplement.dosage : {};
  const shouldShowDosage = Object.keys(rawDosage).length > 0 || worksFor.length > 0 || limitedEvidence.length > 0;
  const effectiveDose = cleanDosageValue(rawDosage.effectiveDose || rawDosage.optimalDose);
  const commonDose = cleanDosageValue(rawDosage.standard || rawDosage.commonDose || rawDosage.optimalDose);
  const timing = cleanDosageValue(rawDosage.timing);
  const notes = cleanDosageValue(rawDosage.notes);
  const transformedDosage = shouldShowDosage ? {
    effectiveDose: effectiveDose || getDefaultDosageMessage(language),
    commonDose: commonDose || getDefaultDosageMessage(language),
    timing: timing || '',
    notes: notes || getDefaultDosageMessage(language),
  } : undefined;

  // DEBUG: Log dosage transformation
  console.log('[transformRecommendationToEvidence] Dosage transformation:', {
    inputType: typeof supplement.dosage,
    inputKeys: supplement.dosage ? Object.keys(supplement.dosage) : [],
    outputDefined: !!transformedDosage,
    output: transformedDosage,
  });

  // ✅ TRANSFORM side effects to expected structure: { common: [], rare: [], severity: string }
  const rawSideEffects = Array.isArray(supplement.sideEffects) ? supplement.sideEffects : [];
  const sideEffects = {
    common: rawSideEffects
      .filter((item: any) => {
        if (typeof item === 'string') return true;
        // Check frequency - "Common", "10-15%", etc. are considered common
        const freq = (item.frequency || '').toLowerCase();
        return freq.includes('common') || freq.includes('10') || freq.includes('15') || freq.includes('20') || !freq.includes('rare');
      })
      .map((item: any) => {
        if (typeof item === 'string') return item;
        const freq = item.frequency ? ` (${item.frequency})` : '';
        const notes = item.notes ? ` - ${item.notes}` : '';
        return `${item.effect || item.name}${freq}${notes}`;
      }),
    rare: rawSideEffects
      .filter((item: any) => {
        if (typeof item === 'string') return false;
        const freq = (item.frequency || '').toLowerCase();
        return freq.includes('rare') || freq.includes('<1') || freq.includes('< 1');
      })
      .map((item: any) => {
        if (typeof item === 'string') return item;
        const freq = item.frequency ? ` (${item.frequency})` : '';
        const notes = item.notes ? ` - ${item.notes}` : '';
        return `${item.effect || item.name}${freq}${notes}`;
      }),
    severity: (supplement.safety?.overallRating as any) || 'Generally mild',
    notes: rawSideEffects.length > 0
      ? rawSideEffects.find((s: any) => s.notes)?.notes
      : undefined,
  };

  const contraindications = Array.isArray(supplement.contraindications) ? supplement.contraindications : [];

  // ✅ TRANSFORM interactions to expected structure: { medications: [], supplements: [] }
  const rawInteractions = Array.isArray(supplement.interactions) ? supplement.interactions : [];
  const interactions = {
    medications: rawInteractions.map((item: any) => {
      if (typeof item === 'string') {
        return { medication: item, severity: 'Moderate' as const, description: '' };
      }
      return {
        medication: item.medication || item.drug || item.substance || '',
        severity: (item.severity || 'Moderate') as 'Mild' | 'Moderate' | 'Severe',
        description: item.description || item.effect || item.mechanism || '',
      };
    }),
    supplements: [], // Could be populated if we had supplement interaction data
    foods: undefined,
  };

  // Extract intelligent ranking from metadata
  // Extract intelligent ranking from evidence_summary (primary) or metadata (legacy)
  const metadata = (recommendation as any)._enrichment_metadata || {};
  const baseStudies = (evidenceSummary as any).studies || metadata.studies || {
    ranked: {
      positive: [],
      negative: [],
      metadata: {
        consensus: 'neutral',
        confidenceScore: 0,
        totalPositive: 0,
        totalNegative: 0,
        totalNeutral: 0,
      },
    },
    all: [],
    total: 0,
  };

  // Ensure total is populated from evidence_summary if not in studies
  const studies = {
    ...baseStudies,
    total: baseStudies.total || evidenceSummary.totalStudies || 0,
  };

  const result = {
    overallGrade,
    // Prioritize whatIsIt (rich description) over description (often generic)
    whatIsItFor: supplement.whatIsIt
      || (supplement.description && !supplement.description.includes('Suplemento analizado') && !supplement.description.includes('Supplement found with')
          ? supplement.description
          : `Suplemento: ${recommendation.category}`),
    evidenceByBenefit, // Add the new transformed data
    worksFor,
    doesntWorkFor, // ✅ NOW POPULATED with real data
    limitedEvidence,
    ingredients: ingredients.map((ing: any) => ({
      name: ing.name,
      grade: ing.grade || 'C',
      studyCount: ing.studyCount || 0,
      rctCount: ing.rctCount || 0,
      description: ing.description,
    })),
    qualityBadges: {
      hasRCTs: ingredients.some((i: any) => i.rctCount > 0),
      hasMetaAnalysis: worksFor.some((w: any) => w.metaAnalysis === true),
      longTermStudies: evidenceSummary.researchSpanYears >= 5,
      safetyEstablished: (sideEffects.common.length === 0 && sideEffects.rare.length === 0) ||
        sideEffects.severity === 'Generally Safe' || sideEffects.severity === 'Generally mild',
    },
    // Use transformed dosage
    dosage: transformedDosage,
    sideEffects,
    interactions,
    contraindications,
    // Mechanisms of action
    mechanisms: Array.isArray(supplement.mechanisms) ? supplement.mechanisms.map((m: any) => ({
      name: m.name || '',
      description: m.description || '',
      evidenceLevel: m.evidenceLevel || 'moderate',
    })) : [],
    // NEW: Include intelligent ranking
    studies,
    // Research span for evidence overview
    researchSpanYears: evidenceSummary.researchSpanYears || 0,
    // NEW: Include synergies from external DB or Claude fallback
    synergies: Array.isArray(supplement.synergies) ? supplement.synergies : [],
    synergiesSource: supplement.synergiesSource || ((supplement.synergies && supplement.synergies.length > 0) ? 'external_db' : undefined),
  };

  // DEBUG: Log final result summary
  console.log('[transformRecommendationToEvidence] Output summary:', {
    overallGrade: result.overallGrade,
    worksForCount: result.worksFor.length,
    hasDosage: !!result.dosage,
    ingredientsCount: result.ingredients.length,
    synergiesCount: result.synergies.length,
    synergiesSource: result.synergiesSource,
  });

  return result;
}

/**
 * Transform recommendation data to Examine.com style format
 * Focuses on quantitative data and precise measurements
 */
function transformToExamineFormat(recommendation: Recommendation): any {
  const supplement = (recommendation as any).supplement || {};
  const sideEffects = Array.isArray(supplement.sideEffects) ? supplement.sideEffects : [];
  const interactions = Array.isArray(supplement.interactions) ? supplement.interactions : [];
  const strongWorksFor = Array.isArray(supplement.worksFor)
    ? supplement.worksFor
      .map((item: any) => ({
        ...item,
        grade: normalizeEvidenceGrade(item.evidenceGrade || item.grade),
      }))
      .filter((item: any) => isStrongEvidenceGrade(item.grade))
    : [];

  return {
    overview: {
      whatIsIt: supplement.description || supplement.whatIsIt || `Suplemento: ${recommendation.category}`,
      functions: supplement.primaryUses || supplement.functions || [],
      sources: supplement.sources || [],
    },
    benefitsByCondition: strongWorksFor.map((item: any) => ({
      condition: item.condition || '',
      effect: item.magnitude || item.effectSize || 'Moderate',
      quantitativeData: item.quantitativeData || item.notes || 'Ver estudios para detalles',
      evidence: `${item.studyCount || 0} estudios${item.participants ? `, ${item.participants} participantes` : ''}`,
      context: item.context || item.notes || '',
      studyTypes: item.studyTypes || ['RCT', 'Meta-analysis'],
    })),
    dosage: {
      effectiveDose: supplement.dosage?.effectiveDose || supplement.dosage?.optimalDose || 'Consultar con profesional',
      commonDose: supplement.dosage?.standard || supplement.dosage?.commonDose || 'Consultar con profesional',
      timing: supplement.dosage?.timing || 'Según indicaciones',
      forms: (supplement.dosage?.forms || []).map((form: any) => ({
        name: form.form || form.name || '',
        bioavailability: form.bioavailability || '',
        notes: form.notes || form.description || '',
      })),
      notes: supplement.dosage?.notes || '',
    },
    safety: {
      sideEffects: {
        common: sideEffects
          .filter((e: any) => typeof e === 'string' || e.frequency === 'Common')
          .map((e: any) => typeof e === 'string' ? e : e.effect),
        rare: sideEffects
          .filter((e: any) => typeof e === 'object' && e.frequency === 'Rare')
          .map((e: any) => e.effect),
        severity: supplement.safety?.overallRating || 'Generally mild',
      },
      interactions: {
        medications: interactions.map((i: any) => ({
          medication: typeof i === 'string' ? i : i.medication,
          severity: typeof i === 'object' ? i.severity : 'Moderate',
          description: typeof i === 'object' ? i.description : '',
        })),
      },
      contraindications: supplement.contraindications || [],
      pregnancyLactation: supplement.safety?.pregnancyCategory || 'Consultar con médico',
    },
    mechanisms: supplement.mechanisms || [],
  };
}

interface Recommendation {
  recommendation_id: string;
  quiz_id: string;
  category: string;
  evidence_summary: {
    totalStudies: number;
    totalParticipants: number;
    efficacyPercentage: number;
    researchSpanYears: number;
    ingredients: Array<{
      name: string;
      grade: 'A' | 'B' | 'C';
      studyCount: number;
      rctCount: number;
    }>;
    studies?: {
      ranked?: any;
      [key: string]: unknown;
    };
  };
  ingredients: Array<{
    name: string;
    grade: 'A' | 'B' | 'C';
    adjustedDose?: string;
    adjustmentReason?: string;
  }>;
  supplement?: {
    name?: string;
  };
  products: Array<{
    tier: 'budget' | 'value' | 'premium';
    name: string;
    price: number;
    currency: string;
    contains: string[];
    whereToBuy: string;
    affiliateLink?: string;
    directLink?: string;
    description: string;
    isAnkonere?: boolean;
    isAffiliate?: boolean;
    affiliateProvider?: 'iherb';
  }>;
  personalization_factors: {
    altitude?: number;
    climate?: string;
    gender?: string;
    age?: number;
    location?: string;
  };
  evidence_by_benefit?: Array<{
    benefit: string;
    evidence_level: 'Fuerte' | 'Moderada' | 'Limitada' | 'Insuficiente';
    studies_found: number;
    total_participants: number;
    summary: string;
  }>;
}

type RecommendationProduct = Recommendation['products'][number];

function hasSupportedWorksFor(recommendation: Recommendation | null): boolean {
  const worksFor = (recommendation?.supplement as { worksFor?: unknown } | undefined)?.worksFor;

  return Array.isArray(worksFor) && worksFor.some((item: any) => {
    const grade = normalizeEvidenceGrade(item.evidenceGrade || item.grade);
    return isStrongEvidenceGrade(grade);
  });
}

function isCannabisResearchContext(recommendation: Recommendation | null, query: string | null): boolean {
  const haystack = [
    query,
    recommendation?.category,
    recommendation?.supplement?.name,
  ].filter(Boolean).join(' ').toLowerCase();

  return /\b(cannabis sativa|cannabis|cannabinoids?|cbd|cannabidiol|thc|tetrahydrocannabinol|nabiximols|sativex|dronabinol|nabilone)\b/.test(haystack);
}

function buildAffiliateAwareProducts(recommendation: Recommendation | null, query: string | null, _language: string): RecommendationProduct[] {
  if (!hasSupportedWorksFor(recommendation) || isCannabisResearchContext(recommendation, query)) {
    return [];
  }

  const providedProducts = Array.isArray(recommendation?.products)
    ? recommendation.products.filter(Boolean)
    : [];

  return providedProducts;
}

function getLinkHostname(link?: string) {
  if (!link) {
    return undefined;
  }

  try {
    return new URL(link).hostname;
  } catch {
    return undefined;
  }
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Use ref to keep router stable across renders (prevents infinite loops in useEffect)
  const routerRef = useRef(router);
  routerRef.current = router;
  const trackedResultsRef = useRef<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [conditionResult, setConditionResult] = useState<PubMedQueryResult | null>(null);
  const [searchType, setSearchType] = useState<'ingredient' | 'condition' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | {
    type: 'insufficient_scientific_data' | 'system_error' | 'network_error' | 'generic';
    message: string;
    searchedFor?: string;
    suggestions?: Array<{
      name: string;
      confidence?: number;
      hasStudies?: boolean;
    }>;
    metadata?: {
      normalizedQuery?: string;
      requestId?: string;
      timestamp?: string;
      [key: string]: unknown;
    };
  } | null>(null);
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [showPaywall, setShowPaywall] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [_isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [transformedEvidence, setTransformedEvidence] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [examineContent, setExamineContent] = useState<any>(null);
  const [benefitQuery, setBenefitQuery] = useState('');
  const [submittedBenefitQuery, setSubmittedBenefitQuery] = useState('');

  // Modal state for benefit-specific studies popup
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<{ en: string; es: string } | null>(null);

  // NEW: Variant selector state
  const [variantDetection, setVariantDetection] = useState<VariantDetectionResult | null>(null);
  const [showVariantSelector, setShowVariantSelector] = useState(false);

  // ====================================
  // LOGGING: State Change Tracking
  // ====================================
  useEffect(() => {
    console.log('[ResultsPage] State changed:', {
      hasRecommendation: !!recommendation,
      recommendationId: recommendation?.recommendation_id,
      recommendationCategory: recommendation?.category,
      isLoading,
      hasError: !!error,
      errorMessage: error,
      timestamp: new Date().toISOString(),
    });
  }, [recommendation, isLoading, error]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setIsLoadingSubscription(false);
        return;
      }

      try {
        const response = await fetch(`/api/portal/subscription/status?user_id=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    checkSubscription();
  }, [user]);

  // Handle offline/online status
  useEffect(() => {
    if (!isOnline) {
      setError('Sin conexión a internet. Verifica tu red y vuelve a intentar.');
    } else if (error === 'Sin conexión a internet. Verifica tu red y vuelve a intentar.') {
      // Clear offline error when connection is restored
      setError(null);
    }
  }, [isOnline, error]);

  // ====================================
  // BENEFIT QUERY EXTRACTION FROM URL
  // ====================================
  // Extract and normalize benefit query from URL (e.g., "magnesio para dormir")
  // This ensures benefit-specific searches work from the main search bar
  useEffect(() => {
    // PRIORITY: Check supplement parameter first, then fall back to q
    const supplementParam = searchParams.get('supplement');
    const qParam = searchParams.get('q');
    const query = supplementParam || qParam; // Prioritize supplement over q
    if (!query) return;

    let benefitDetected = false;

    // 1. Check for explicit benefit keywords: " para " (Spanish) or " for " (English)
    const benefitKeywords = [' para ', ' for '];

    for (const keyword of benefitKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        // Split query: "magnesio para dormir" → ["magnesio", "dormir"]
        const parts = query.split(new RegExp(keyword, 'i'));
        const extractedBenefit = parts.slice(1).join(keyword).trim();

        if (extractedBenefit) {
          // Normalize benefit from Spanish to English
          const normalized = normalizeBenefit(extractedBenefit);

          console.log('[Benefit Extraction] URL benefit detected:', {
            original: extractedBenefit,
            normalized: normalized.normalized,
            confidence: normalized.confidence,
            category: normalized.category,
          });

          // Use normalized English term if confidence is high enough
          const finalBenefit = normalized.confidence >= 0.7
            ? normalized.normalized
            : extractedBenefit;

          setBenefitQuery(extractedBenefit); // Show original in UI
          setSubmittedBenefitQuery(finalBenefit); // Use normalized for API
          benefitDetected = true;
        }
        break;
      }
    }

    // 2. If NO explicit benefit, DON'T auto-send to backend
    // Just log that suggestions are available (they'll show as buttons in UI)
    if (!benefitDetected) {
      const topSuggestion = getTopSuggestedBenefit(query);

      if (topSuggestion) {
        console.log('[Benefit Auto-Suggestion] Supplement has suggested benefits (UI only):', {
          supplement: query,
          topBenefit: topSuggestion.benefit,
          benefitEs: topSuggestion.benefitEs,
          priority: topSuggestion.priority,
          note: 'NOT auto-sending to backend - user must click button or type manually',
        });

        // DO NOT auto-populate - let user click the button
        // setBenefitQuery and setSubmittedBenefitQuery remain empty
      }
    }
  }, [searchParams]);

  const isFreeUser = !subscription || subscription.plan_id === 'free';

  // PRIORITY: Check supplement parameter first, then fall back to q
  const supplementParam = searchParams.get('supplement');
  const qParam = searchParams.get('q');
  const query = supplementParam || qParam; // Prioritize supplement over q
  const urlJobId = searchParams.get('id');

  // Generate jobId ONCE if not provided (for direct searches)
  // Use useRef to keep it stable across renders - this prevents useEffect from re-running
  const generatedJobIdRef = useRef<string | null>(null);
  if (!generatedJobIdRef.current && !urlJobId) {
    generatedJobIdRef.current = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  const jobId = urlJobId || generatedJobIdRef.current || '';

  // ====================================
  // LOCALIZED SUPPLEMENT NAME
  // ====================================
  // Translate the supplement name to the user's language
  const localizedSupplementName = recommendation?.category
    ? getLocalizedSupplementName(recommendation.category, language as 'en' | 'es')
    : query || 'supplement';
  const researchSupplementName = recommendation?.category || query || localizedSupplementName;
  const visibleEvidenceMetadata = recommendation
    ? getVisibleEvidenceMetadata(recommendation, language as 'en' | 'es')
    : null;

  useEffect(() => {
    if (isLoading || error) {
      return;
    }

    const resultType = recommendation ? 'ingredient' : conditionResult ? 'condition' : null;

    if (!resultType) {
      return;
    }

    const resultId = recommendation?.recommendation_id || `${resultType}:${query || urlJobId || 'unknown'}`;

    if (trackedResultsRef.current === resultId) {
      return;
    }

    trackedResultsRef.current = resultId;

    const products = buildAffiliateAwareProducts(recommendation, query, language);
    const metadata = (recommendation as any)?._enrichment_metadata || {};

    trackGAEvent('view_search_results', {
      search_term: query || recommendation?.category || urlJobId || 'unknown',
      query: query || undefined,
      result_type: resultType,
      recommendation_id: recommendation?.recommendation_id,
      supplement_name: recommendation?.category,
      locale: language,
      language,
      page_type: 'search_results',
      total_studies: recommendation?.evidence_summary?.totalStudies || 0,
      studies_used: metadata.studiesUsed || 0,
      has_affiliate_products: products.length > 0,
      affiliate_product_count: products.length,
    });
  }, [conditionResult, error, isLoading, language, query, recommendation, urlJobId]);

  // Transform evidence data when recommendation changes (CLIENT-SIDE, instant)
  useEffect(() => {
    if (!recommendation) {
      setTransformedEvidence(null);
      return;
    }

    // Check if this is mock/generated data with no real studies
    const metadata = (recommendation as any)._enrichment_metadata || {};
    const totalStudies = recommendation.evidence_summary?.totalStudies || 0;
    const metadataStudiesUsed = metadata.studiesUsed || 0;

    // SIMPLE FIX: Trust totalStudies from evidence_summary if available
    // This handles cases where metadata is incomplete but evidence_summary has data
    const hasRealData = totalStudies > 0 || (metadata.hasRealData && metadataStudiesUsed > 0);

    // If no real data, show warning
    if (!hasRealData) {
      console.warn('⚠️ No real data found for:', recommendation.category);
      console.warn('Metadata:', metadata);
      console.warn('Evidence Summary totalStudies:', totalStudies);
      // Still transform, but user should see warning
    }

    // Simple client-side transformation (no API calls needed)
    const transformed = transformRecommendationToEvidence(recommendation, language as 'en' | 'es');

    // Log section availability
    const _supplement = (recommendation as any).supplement || {};
    console.log('[Recommendation Sections]', {
      category: recommendation.category,
      hasWorksFor: Array.isArray(transformed.worksFor) && transformed.worksFor.length > 0,
      worksForCount: transformed.worksFor?.length || 0,
      hasDoesntWorkFor: Array.isArray(transformed.doesntWorkFor) && transformed.doesntWorkFor.length > 0,
      doesntWorkForCount: transformed.doesntWorkFor?.length || 0,
      hasDosage: !!transformed.dosage,
      dosageKeys: transformed.dosage ? Object.keys(transformed.dosage) : [],
      hasSideEffects: Array.isArray(transformed.sideEffects) && transformed.sideEffects.length > 0,
      sideEffectsCount: transformed.sideEffects?.length || 0,
      hasInteractions: transformed.interactions && (
        (Array.isArray(transformed.interactions.medications) && transformed.interactions.medications.length > 0) ||
        (Array.isArray(transformed.interactions.supplements) && transformed.interactions.supplements.length > 0)
      ),
      hasContraindications: Array.isArray(transformed.contraindications) && transformed.contraindications.length > 0,
    });

    setTransformedEvidence(transformed);

    // Also transform to Examine format
    const examineFormatted = transformToExamineFormat(recommendation);
    setExamineContent(examineFormatted);
  }, [language, recommendation]);

  useEffect(() => {
    let isMounted = true;

    // Handle different scenarios
    if (urlJobId) {
      // CASE 1: User has jobId in URL (from cache/sharing) - check cache only
      if (typeof window !== 'undefined') {
        try {
          const cacheKey = `recommendation_${jobId}`;
          console.log('[Cache Retrieval] Checking cache for shared link:', cacheKey);
          const cachedData = localStorage.getItem(cacheKey);

          if (cachedData) {
            const { recommendation, timestamp, ttl } = JSON.parse(cachedData);
            const age = Date.now() - timestamp;

            if (age < ttl && isValidCache(recommendation)) {
              console.log('[Cache Retrieval] ✅ Valid cache found for shared link');
              setError(null);
              setRecommendation(recommendation);
              setSearchType('ingredient'); // Set searchType so evidence panel renders
              setIsLoading(false);
              return;
            }
          }

          // Cache miss or expired - redirect to new search
          console.log('[Cache Retrieval] Cache miss for shared link - redirecting to homepage');
          setError('Esta recomendación ya no está disponible. Por favor, genera una nueva búsqueda.');
          setIsLoading(false);
          setTimeout(() => routerRef.current.push('/portal'), 2000);
        } catch (error) {
          console.error('[Cache Retrieval] Error:', error);
          setError('Error al cargar la recomendación. Por favor, genera una nueva búsqueda.');
          setIsLoading(false);
        }
      }
    } else if (query) {
      // Generate new recommendation from search query
      const abortController = new AbortController();

      const generateRecommendation = async () => {
        try {
          // Smart detection: ingredient vs category
          // Categories are typically action/goal words, ingredients are typically noun compounds
          const normalizedQuery = query.toLowerCase().trim();

          // Known categories (action/goal words)
          const categoryMap: Record<string, string> = {
            // English - Categories (goals/actions)
            'muscle': 'muscle-gain',
            'muscle gain': 'muscle-gain',
            'build muscle': 'muscle-gain',
            'gain muscle': 'muscle-gain',
            'exercise': 'muscle-gain',
            'workout': 'muscle-gain',
            'cognitive': 'cognitive',
            'memory': 'cognitive',
            'focus': 'cognitive',
            'brain': 'cognitive',
            'sleep': 'sleep',
            'insomnia': 'sleep',
            'immune': 'immune',
            'immunity': 'immune',
            'heart': 'heart',
            'cardiovascular': 'heart',
            'fat loss': 'fat-loss',
            'weight loss': 'fat-loss',
            'lose weight': 'fat-loss',
            'skin': 'skin',
            'hair': 'hair',
            'digestion': 'digestion',
            'energy': 'energy',
            // Spanish - Categories
            'musculo': 'muscle-gain',
            'ganar musculo': 'muscle-gain',
            'construir musculo': 'muscle-gain',
            'músculo': 'muscle-gain',
            'ejercicio': 'muscle-gain',
            'cognitivo': 'cognitive',
            'memoria': 'cognitive',
            'enfoque': 'cognitive',
            'cerebro': 'cognitive',
            'sueño': 'sleep',
            'dormir': 'sleep',
            'insomnio': 'sleep',
            'inmune': 'immune',
            'inmunidad': 'immune',
            'corazón': 'heart',
            'perder peso': 'fat-loss',
            'bajar de peso': 'fat-loss',
            'grasa': 'fat-loss',
            'piel': 'skin',
            'cabello': 'hair',
            'digestión': 'digestion',
            'energía': 'energy',
          };

          // Check if query matches a known category
          const matchedCategory = categoryMap[normalizedQuery];

          // Explicit supplement URLs should stay in supplement mode even if the backend
          // later returns a condition-shaped payload.
          const _isIngredientSearch = !matchedCategory;
          const searchIntent = supplementParam ? 'supplement' : matchedCategory ? 'condition' : 'supplement';

          // The quiz endpoint handles all normalization and enrichment.
          // We send the raw user query directly to it.
          const searchTerm = normalizedQuery;
          const category = searchTerm;

          // Use the stable page job ID for complete traceability.
          const requestJobId = jobId;
          console.log(`🔖 Job ID: ${requestJobId} - Query: "${normalizedQuery}" → "${category}"`);

          // Always call the app route. It owns search fallback, async polling,
          // and Lambda orchestration without exposing stale public Lambda URLs.
          const apiUrl = `/api/portal/quiz?t=${Date.now()}`;

          console.log(`🚀 Calling quiz API: ${apiUrl}`);

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Job-ID': requestJobId,
            },
            body: JSON.stringify({
              category,
              age: 35, // Default - in production, get from user profile
              gender: 'male', // Default
              location: 'CDMX', // Default
              jobId: requestJobId, // Include in body for backend logging
              benefitQuery: submittedBenefitQuery, // Pass the benefit query
              searchIntent,
            }),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = {};

            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText };
            }

            // Handle 404: No scientific data found (NOT a system error)
            if (response.status === 404 && errorData.error === 'insufficient_data') {
              console.log(`ℹ️  No scientific data found for: ${searchTerm} (original: ${normalizedQuery})`);

              // Log analytics - search failed
              searchAnalytics.logFailure(
                normalizedQuery,
                searchTerm,
                []
              );

              // Trace search failure
              traceSearch(normalizedQuery, 'api-request-complete', {
                success: false,
                errorType: 'insufficient_data',
                normalizedQuery: searchTerm,
              });

              console.log('[State Update] Setting error - clearing recommendation first');
              setRecommendation(null); // Clear recommendation before setting error

              // Show error message
              setError({
                type: 'insufficient_scientific_data',
                message: errorData.message || `No encontramos evidencia clínica humana suficiente para confirmar beneficios de "${normalizedQuery}".`,
                searchedFor: normalizedQuery,
                suggestions: [],
                metadata: {
                  normalizedQuery: searchTerm,
                  requestId: errorData.requestId,
                  timestamp: new Date().toISOString(),
                  ...(errorData.metadata || {}),
                },
              });
              setIsLoading(false);
              return;
            }

            // Handle other errors
            console.error('❌ API Error:', response.status, errorText);
            let errorMessage = `Backend error: ${response.status}`;
            errorMessage = errorData.message || errorData.error || errorMessage;

            console.log('[State Update] Setting error - clearing recommendation first');
            setRecommendation(null); // Clear recommendation before setting error
            setError(errorMessage);
            setIsLoading(false);
            return;
          }

          const data = await response.json();

          // Handle variant detection data if present
          if (data.variantDetection) {
            console.log('[Variant Detection] Variants detected:', {
              baseSupplementName: data.variantDetection.baseSupplementName,
              variantCount: data.variantDetection.variants.length,
              hasVariants: data.variantDetection.hasVariants,
              variants: data.variantDetection.variants.map((v: any) => v.displayName),
            });
            setVariantDetection(data.variantDetection);

            // CACHE: Save variant detection to localStorage (follows recommendation cache pattern)
            if (data.variantDetection && typeof window !== 'undefined') {
              try {
                const normalizedName = data.variantDetection.baseSupplementName?.toLowerCase().trim();
                const studyCount = data.variantDetection._cacheMetadata?.studyCount || 0;
                const cacheKey = `variant_detection_${normalizedName}_${studyCount}`;
                const timestamp = Date.now();
                const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days (same as recommendations)

                const cacheData = {
                  variantDetection: data.variantDetection,
                  supplementName: data.variantDetection.baseSupplementName,
                  studyCount: studyCount,
                  timestamp,
                  ttl
                };

                localStorage.setItem(cacheKey, JSON.stringify(cacheData));

                console.log('[Variant Cache] ✅ Cached variant detection:', {
                  cacheKey,
                  supplement: data.variantDetection.baseSupplementName,
                  variantCount: data.variantDetection.variants?.length || 0,
                  studyCount: studyCount,
                  cacheHit: data.variantDetection._cacheMetadata?.hit,
                  timestamp: new Date(timestamp).toISOString(),
                  expiresAt: new Date(timestamp + ttl).toISOString(),
                  ttlDays: 7
                });

                // Cleanup old cache entries for this supplement (remove previous versions)
                Object.keys(localStorage)
                  .filter(key => key.startsWith(`variant_detection_${normalizedName}_`) && key !== cacheKey)
                  .forEach(oldKey => {
                    localStorage.removeItem(oldKey);
                    console.log(`[Variant Cache] 🗑️ Cleaned up old cache: ${oldKey}`);
                  });

              } catch (cacheError) {
                console.error('[Variant Cache] ❌ Failed to cache variant detection:', cacheError);
                // Don't fail the entire operation if caching fails
              }
            }

            // Show variant selector modal if there are meaningful variants
            // BUT only if a specific variant hasn't already been selected
            const shouldShowVariantModal =
              data.variantDetection.hasVariants &&
              data.variantDetection.variants.length > 1 &&
              !data.variantDetection._selectedVariant;

            if (shouldShowVariantModal) {
              console.log('[Variant Modal] Showing variant selector for:', data.recommendation?.supplement?.name);
              setShowVariantSelector(true);
            } else if (data.variantDetection._selectedVariant) {
              console.log('[Variant Modal] Skipping - variant already selected:', data.variantDetection._selectedVariant.fullName);
            }
          }

          if (data.success && data.status === 'processing' && (data.jobId || data.recommendation_id)) {
            const pollJobId = data.jobId || data.recommendation_id;
            const pollInterval = parseInt(data.pollInterval || '3') * 1000;
            const maxPollTime = 180000;
            const startTime = Date.now();
            const statusUrl = `/api/portal/status/${pollJobId}`;

            console.log('[Async Polling] Backend is still enriching recommendation:', {
              jobId: pollJobId,
              hasInitialRecommendation: !!data.recommendation,
            });

            const pollStatus = async () => {
              try {
                console.log('[Async Polling] Fetching status:', statusUrl);
                const statusResponse = await fetch(statusUrl);
                const statusData = await statusResponse.json();

                console.log('[Async Polling] Status update:', {
                  status: statusData.status,
                  hasRecommendation: !!statusData.recommendation,
                });

                if (statusData.status === 'completed' && statusData.recommendation) {
                  const statusRecommendation = attachResponseSource(statusData.recommendation, statusData.source);
                  const finalRecommendation = submittedBenefitQuery
                    ? filterByBenefit(statusRecommendation, submittedBenefitQuery)
                    : statusRecommendation;

                  setError(null);
                  setRecommendation(finalRecommendation);
                  setConditionResult(null);
                  setSearchType('ingredient');
                  setIsLoading(false);
                  return;
                }

                if (statusData.status === 'failed') {
                  setRecommendation(null);
                  setError(statusData.error || 'Failed to generate recommendation');
                  setIsLoading(false);
                  return;
                }

                if (Date.now() - startTime < maxPollTime) {
                  setTimeout(pollStatus, pollInterval);
                  return;
                }

                setRecommendation(null);
                setError('La recomendación está tardando más de lo esperado. Por favor, intenta de nuevo.');
                setIsLoading(false);
              } catch (pollError: any) {
                console.error('[Async Polling] ❌ Polling error:', pollError);

                if (Date.now() - startTime < maxPollTime) {
                  setTimeout(pollStatus, pollInterval);
                  return;
                }

                setRecommendation(null);
                setError('Error al verificar el estado de la recomendación');
                setIsLoading(false);
              }
            };

            setTimeout(pollStatus, pollInterval);
            return;
          }

          if (data.searchType === 'condition') {
            if (searchIntent === 'supplement') {
              console.warn('[Data Fetch] API returned CONDITION result for supplement intent; showing no-data state instead.', {
                query: normalizedQuery,
                data,
              });
              setRecommendation(null);
              setConditionResult(null);
              setSearchType('ingredient');
              setError({
                type: 'insufficient_scientific_data',
                message: language === 'es'
                  ? `No encontramos evidencia clínica humana suficiente para recomendar beneficios de "${normalizedQuery}".`
                  : `We did not find enough human clinical evidence to recommend benefits for "${normalizedQuery}".`,
                searchedFor: normalizedQuery,
                suggestions: [],
                metadata: {
                  normalizedQuery,
                  requestId: data.requestId,
                  timestamp: new Date().toISOString(),
                  receivedSearchType: 'condition',
                },
              });
              setIsLoading(false);
              return;
            }

            console.log('[Data Fetch] ✅ Received CONDITION result:', data);
            setConditionResult(data);
            setRecommendation(null); // Clear other state
            setSearchType('condition');
          } else if (data.success && data.recommendation) {
            // LEGACY SYNC PATTERN or ingredient search
            console.log('[Data Fetch] ✅ Received INGREDIENT result:', data.recommendation);
            setRecommendation(attachResponseSource(data.recommendation, data.source));
            setConditionResult(null); // Clear other state
            setSearchType('ingredient');
          } else {
            // Handle cases where response is not in expected format
            throw new Error('Invalid API response format');
          }

          setIsLoading(false);
          return; // End of successful data handling


          // ASYNC PATTERN: Backend returned 202 with recommendation_id - start polling
          if (response.status === 202 && data.recommendation_id) {
            console.log('[Async Polling] Starting polling for recommendation:', data.recommendation_id);

            // Update URL immediately with job ID (without navigation)
            if (typeof window !== 'undefined') {
              const newUrl = `/portal/results?id=${data.recommendation_id || data.jobId}`;
              const currentUrl = window.location.pathname + window.location.search;
              if (currentUrl !== newUrl) {
                console.log('📝 Updating URL for polling:', newUrl);
                window.history.replaceState({}, '', newUrl);
                // DO NOT call router.push() - it causes unnecessary page reload
              }
            }

            // Start polling for status using quiz endpoint
            const pollInterval = parseInt(data.pollInterval || '3') * 1000; // Convert to ms
            const maxPollTime = 180000; // 3 minutes max
            const startTime = Date.now();

            // Use enrichment-status endpoint for polling
            const statusUrl = `/api/portal/enrichment-status/${data.recommendation_id}?supplement=${encodeURIComponent(category)}`;

            const pollStatus = async () => {
              try {
                console.log('[Async Polling] Fetching status:', statusUrl);
                const statusResponse = await fetch(statusUrl);
                const statusData = await statusResponse.json();

                console.log('[Async Polling] Status update:', {
                  status: statusData.status,
                  progress: statusData.progress,
                  message: statusData.progressMessage,
                  hasRecommendation: !!statusData.recommendation,
                });

                if (statusData.status === 'completed' && statusData.recommendation) {
                  console.log('[Async Polling] ✅ Recommendation completed:', {
                    id: statusData.recommendation.recommendation_id,
                    category: statusData.recommendation.category,
                  });
                  console.log('[State Update] Before setting recommendation from polling - clearing error first');
                  setError(null); // Clear error before setting recommendation
                  console.log('[State Update] Setting recommendation from polling');

                  // Apply client-side benefit filter if benefitQuery exists
                  const finalRecommendation = submittedBenefitQuery
                    ? filterByBenefit(statusData.recommendation, submittedBenefitQuery)
                    : statusData.recommendation;

                  setRecommendation(finalRecommendation);
                  console.log('[State Update] Setting isLoading to false');
                  setIsLoading(false);
                  return; // Stop polling
                } else if (statusData.status === 'failed') {
                  console.error('[Async Polling] ❌ Recommendation failed:', statusData.error);
                  console.log('[State Update] Setting error from polling - clearing recommendation first');
                  setRecommendation(null); // Clear recommendation before setting error
                  setError(statusData.error || 'Failed to generate recommendation');
                  console.log('[State Update] Setting isLoading to false');
                  setIsLoading(false);
                  return; // Stop polling
                } else if (statusData.status === 'processing') {
                  // Continue polling if we haven't exceeded max time
                  if (Date.now() - startTime < maxPollTime) {
                    console.log('[Async Polling] Still processing, will poll again in', pollInterval, 'ms');
                    setTimeout(pollStatus, pollInterval);
                  } else {
                    console.error('[Async Polling] ❌ Polling timeout exceeded');
                    console.log('[State Update] Setting error - clearing recommendation first');
                    setRecommendation(null); // Clear recommendation before setting error
                    setError('La recomendación está tardando más de lo esperado. Por favor, intenta de nuevo.');
                    setIsLoading(false);
                  }
                }
              } catch (pollError: any) {
                console.error('[Async Polling] ❌ Polling error:', pollError);
                // Continue polling on error (might be transient)
                if (Date.now() - startTime < maxPollTime) {
                  console.log('[Async Polling] Error occurred, will retry in', pollInterval, 'ms');
                  setTimeout(pollStatus, pollInterval);
                } else {
                  console.error('[Async Polling] ❌ Max poll time exceeded after error');
                  console.log('[State Update] Setting error - clearing recommendation first');
                  setRecommendation(null); // Clear recommendation before setting error
                  setError('Error al verificar el estado de la recomendación');
                  setIsLoading(false);
                }
              }
            };

            // Start polling after initial delay
            setTimeout(pollStatus, pollInterval);
            return; // Don't set isLoading to false yet - we're polling
          }

          // LEGACY SYNC PATTERN: Backend returned recommendation directly
          if (data.success && data.recommendation) {
            // Validate recommendation structure - use jobId for consistency
            if (!data.recommendation.recommendation_id) {
              data.recommendation.recommendation_id = requestJobId; // Use existing jobId instead of generating rec_*
            }
            if (!data.recommendation.quiz_id) {
              data.recommendation.quiz_id = data.quiz_id || `quiz_${Date.now()}`;
            }

            console.log('[Quiz API] ✅ Recommendation received (sync pattern):', {
              id: data.recommendation.recommendation_id,
              category: data.recommendation.category,
              ingredientsCount: data.recommendation.ingredients?.length || 0,
              hasEvidenceSummary: !!data.recommendation.evidence_summary,
              totalStudies: data.recommendation.evidence_summary?.totalStudies || 0,
            });

            // Log analytics - search successful (with both original and normalized terms)
            searchAnalytics.logSuccess(
              normalizedQuery,
              searchTerm,
              true, // hadMapping
              false // usedFallback
            );

            // Trace search success
            traceSearch(normalizedQuery, 'api-request-complete', {
              success: true,
              studiesFound: data.recommendation?.evidence_summary?.totalStudies || 0,
              normalizedQuery: searchTerm,
            });

            if (isMounted) {
              console.log('[State Update] Before setting recommendation - clearing error first');
              setError(null); // Clear error before setting recommendation
              console.log('[State Update] Setting recommendation from quiz API');

              // Apply client-side benefit filter if benefitQuery exists
              const recommendationWithSource = attachResponseSource(data.recommendation, data.source);
              const finalRecommendation = submittedBenefitQuery
                ? filterByBenefit(recommendationWithSource, submittedBenefitQuery)
                : recommendationWithSource;

              setRecommendation(finalRecommendation);
              console.log('[State Update] Setting isLoading to false');
              setIsLoading(false); // Stop loading spinner
            }

            // CACHE: Save to localStorage for later retrieval
            // Only cache recommendations with real data (validated)
            // Use jobId for cache key to match job-store
            const cacheJobId = data.jobId || data.recommendation.recommendation_id || requestJobId;
            if (cacheJobId && typeof window !== 'undefined') {
              console.log('[Cache Storage] Evaluating cache eligibility for:', {
                jobId: cacheJobId,
                category: data.recommendation.category,
              });

              // Use validation function to check if data is cacheable
              const isValidForCache = isValidCache(data.recommendation);

              if (isValidForCache) {
                try {
                  const cacheKey = `recommendation_${cacheJobId}`;
                  const timestamp = Date.now();
                  const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

                  const cacheData = {
                    recommendation: data.recommendation,
                    jobId: cacheJobId,
                    timestamp,
                    ttl,
                  };

                  localStorage.setItem(cacheKey, JSON.stringify(cacheData));

                  console.log('[Cache Storage] ✅ Successfully cached recommendation:', {
                    cacheKey,
                    jobId: cacheJobId,
                    category: data.recommendation.category,
                    timestamp: new Date(timestamp).toISOString(),
                    expiresAt: new Date(timestamp + ttl).toISOString(),
                    ttlDays: Math.floor(ttl / (24 * 60 * 60 * 1000)),
                  });
                } catch (cacheError) {
                  console.error('[Cache Storage] ❌ Failed to cache recommendation:', cacheError);
                  // Don't fail the entire operation if caching fails
                }
              } else {
                console.log('[Cache Storage] ⚠️ Skipping cache - validation failed (no real study data)');
              }

              // DISABLED: URL update with ID
              // The /api/portal/recommendation/[id] endpoint returns 410 (Gone) because
              // it was designed for async polling which we no longer use.
              // Until we implement proper ID-based retrieval from DynamoDB,
              // we keep the URL as ?q= to avoid 410 errors on page refresh.
              //
              // const newUrl = `/portal/results?id=${data.recommendation.recommendation_id}`;
              // const currentUrl = window.location.pathname + window.location.search;
              // if (currentUrl !== newUrl) {
              //   console.log('📝 Updating URL without navigation:', newUrl);
              //   window.history.replaceState({}, '', newUrl);
              // }
            }
          } else {
            const errorMessage = data.error || data.message || 'Failed to generate recommendation';
            console.error('❌ Invalid API response:', errorMessage);
            if (isMounted) {
              console.log('[State Update] Setting error - clearing recommendation first');
              setRecommendation(null); // Clear recommendation before setting error
              setError(errorMessage);
              setIsLoading(false);
            }
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            return;
          }

          console.error('Fetch error:', err);
          if (isMounted) {
            console.log('[State Update] Setting error - clearing recommendation first');
            setRecommendation(null); // Clear recommendation before setting error
            setError(err.message || 'An unexpected error occurred');
            setIsLoading(false);
          }
        }
      };

      generateRecommendation();

      return () => {
        isMounted = false;
        abortController.abort();
      };
    } else {
      if (isMounted) {
        console.log('[State Update] Setting error - clearing recommendation first');
        setRecommendation(null); // Clear recommendation before setting error
        setError('No search query or recommendation ID provided');
        setIsLoading(false);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  // Note: routerRef is used instead of router to prevent infinite re-renders
  }, [query, jobId, submittedBenefitQuery, supplementParam, urlJobId, language]);

  // ====================================
  // VARIANT SELECTOR HANDLERS
  // ====================================
  const handleSelectVariant = (variant: SupplementVariant | null) => {
    if (!variant) return;

    console.log('[Variant Selection] User selected variant:', variant);
    setShowVariantSelector(false);

    // FIX: Instead of triggering a new search (which fails for variants),
    // update the current recommendation with variant-specific information
    if (recommendation) {
      // Create a variant-specific version of the current recommendation
      const variantName = variant.displayName;

      // Update evidence_summary with variant-specific study count
      // Need to update both totalStudies AND studies.total (if it exists)
      const updatedEvidenceSummary = {
        ...recommendation.evidence_summary,
        totalStudies: variant.studyCount || 0,
        ...(recommendation.evidence_summary.studies && {
          studies: {
            ...recommendation.evidence_summary.studies,
            total: variant.studyCount || 0,
          },
        }),
      };

      const variantRecommendation = {
        ...recommendation,
        category: variantName, // Update supplement name
        evidence_summary: updatedEvidenceSummary,
        _variantInfo: {
          selectedVariant: variant,
          originalBaseSupplementName: variantDetection?.baseSupplementName,
        },
      };

      console.log('[Variant Selection] Updated recommendation with variant data:', {
        variantName,
        studyCount: variant.studyCount,
        confidence: variant.confidence,
      });

      // Update state with variant-specific recommendation
      setRecommendation(variantRecommendation);

      // Update URL for sharing (but don't trigger new search)
      const newUrl = `/portal/results?q=${encodeURIComponent(variantName)}&variant=selected`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleSelectGeneric = () => {
    console.log('[Variant Selection] User selected generic search for all variants');
    setShowVariantSelector(false);
    // Continue with the current recommendation (no variant filtering)
  };

  const handleBuyClick = (product: RecommendationProduct) => {
    if (isFreeUser && product.tier !== 'budget' && product.isAnkonere && !product.isAffiliate) {
      trackGAEvent('cta_clicked', {
        cta_name: 'paywall_opened',
        product_tier: product.tier,
        product_name: product.name,
        supplement_name: recommendation?.category || query || undefined,
        locale: language,
        language,
        page_type: 'search_results',
      });
      setShowPaywall(true);
    } else {
      const link = product.isAnkonere ? product.directLink : product.affiliateLink;
      if (link) {
        trackGAEvent(product.isAffiliate || product.affiliateLink ? 'affiliate_click' : 'outbound_click', {
          product_tier: product.tier,
          product_name: product.name,
          provider: product.affiliateProvider || product.whereToBuy,
          link_domain: getLinkHostname(link),
          outbound_domain: getLinkHostname(link),
          supplement_name: recommendation?.category || query || undefined,
          supplement_slug: recommendation?.category
            ? recommendation.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            : undefined,
          recommendation_id: recommendation?.recommendation_id,
          locale: language,
          language,
          page_type: 'search_results',
        });
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // ====================================
  // LOGGING: Conditional Rendering Decision
  // ====================================
  console.log('[Render Decision]', {
    isLoading,
    hasError: !!error,
    hasRecommendation: !!recommendation,
    willRender: isLoading ? 'LoadingSpinner' : error ? 'ErrorState' : !recommendation ? 'NoDataState' : 'Recommendation',
  });

  // STATE 1: Show loading state (only while fetching, not while transforming)
  if (isLoading) {
    console.log('[Render] Branch: LOADING - Showing IntelligentLoadingSpinner', {
      reason: 'isLoading === true',
      supplementName: query || undefined,
    });
    // Default loading spinner for searches
    // TODO: Integrate StreamingResults properly with the quiz/recommend flow
    return <IntelligentLoadingSpinner supplementName={query || undefined} />;
  }

  // STATE 2: Show error state ONLY when error !== null
  if (error !== null) {
    console.log('[Render] Branch: ERROR - Showing ErrorState', {
      reason: 'error !== null',
      hasError: !!error,
      errorType: typeof error === 'object' ? error.type : 'string',
      hasRecommendation: !!recommendation,
    });

    // If error is already an object with type, pass it directly
    // Otherwise, create a generic error object with fallback suggestions
    const errorObject = typeof error === 'object' && error.type
      ? error
      : {
        type: 'generic' as const,
        message: typeof error === 'string' ? error : 'Error desconocido',
        searchedFor: query || 'supplement',
        suggestions: [
          { name: 'Ashwagandha', hasStudies: true },
          { name: 'Omega-3', hasStudies: true },
          { name: 'Vitamin D', hasStudies: true },
          { name: 'Magnesium', hasStudies: true },
        ],
      };

    return (
      <ErrorState
        error={errorObject}
        supplementName={query || 'supplement'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // STATE 3: Handle no-data state. If conditionResult exists (even if empty),
  // show the condition display. Otherwise, show the error state.
  if (!recommendation && !conditionResult) {
    console.log('[Render] Branch: NO_DATA - No data for ingredient or condition.', {
      reason: '!recommendation && !conditionResult && !isLoading && !error',
      isLoading,
      hasError: !!error,
    });

    return (
      <ErrorState
        error="Recommendation not found"
        supplementName={query || 'supplement'}
        onRetry={() => window.location.reload()}
        suggestions={['Ashwagandha', 'Omega-3', 'Vitamin D', 'Magnesium']}
      />
    );
  }

  // STATE 4: Show recommendation display when we have valid data
  console.log('[Render] Branch: RECOMMENDATION - Showing recommendation display', {
    reason: '(recommendation || conditionResult) && !isLoading && !error',
    searchType,
    hasRecommendation: !!recommendation,
    hasConditionResult: !!conditionResult,
  });

  return (
    <div className="min-h-screen bg-gray-50" data-testid="recommendation-display">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="font-medium">Sin conexión a internet</span>
          </div>
        </div>
      )}

      {/* Legal Disclaimer Banner */}
      <LegalDisclaimer language={language} />

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 min-h-[44px] px-4 py-3 inline-flex items-center"
          >
            {t('results.back')}
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t('results.title')} {localizedSupplementName}
          </h1>
          {visibleEvidenceMetadata && (
            <div className="text-gray-600" data-testid="study-data-summary">
              <p className="font-medium text-gray-700">
                {visibleEvidenceMetadata.label}
                {visibleEvidenceMetadata.count ? (
                  <> · {visibleEvidenceMetadata.count.toLocaleString()} {visibleEvidenceMetadata.countLabel}</>
                ) : null}
              </p>
              <p className="text-sm">{visibleEvidenceMetadata.detail}</p>
            </div>
          )}
        </div>

        {/* Warning banner if no real data - Only show if BOTH are 0 AND no evidence data */}
        {(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const metadata = (recommendation as any)?._enrichment_metadata || {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supplement = (recommendation as any)?.supplement || {};
          const totalStudies = recommendation?.evidence_summary?.totalStudies || 0;
          const metadataStudiesUsed = metadata.studiesUsed || 0;

          // Check if there's actual evidence data (worksFor, dosage, etc.)
          const hasWorksFor = Array.isArray(supplement.worksFor) && supplement.worksFor.length > 0;
          const hasDosage = supplement.dosage && typeof supplement.dosage === 'object';
          const hasEvidenceData = hasWorksFor || hasDosage;

          // Only show warning if NO studies AND NO evidence data
          const hasNoData = totalStudies === 0 && metadataStudiesUsed === 0 && !hasEvidenceData;

          if (!hasNoData) return null;

          // Suggestion functionality removed - using vector search now
          return (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    No se encontró evidencia clínica humana suficiente para &ldquo;{localizedSupplementName}&rdquo;
                  </h3>
                  <p className="text-yellow-800 text-sm mb-2">
                    Puede haber estudios preliminares, preclínicos o fitoquímicos publicados. La información mostrada no debe interpretarse como beneficios clínicos confirmados.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Conditional Rendering: Condition View vs. Ingredient View */}
        <div className="mb-8">
          {searchType === 'condition' && conditionResult ? (
            <ConditionResultsDisplay result={conditionResult} />
          ) : (
            searchType === 'ingredient' && recommendation && (
              <>
                {transformedEvidence ? (
                  <>
                    <ViewToggle mode={viewMode} onChange={setViewMode} language={language} />
                    {viewMode === 'standard' ? (
                      <EvidenceAnalysisPanelNew
                        evidenceSummary={transformedEvidence}
                        supplementName={localizedSupplementName}
                        language={language}
                        overviewLabel={visibleEvidenceMetadata?.label}
                        overviewCount={visibleEvidenceMetadata?.count}
                        overviewCountLabel={visibleEvidenceMetadata?.countLabel}
                      />
                    ) : (
                      examineContent && (
                        <ExamineStyleView
                          content={examineContent}
                          supplementName={localizedSupplementName}
                        />
                      )
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                    <p className="text-gray-500 text-sm mt-4">Procesando evidencia científica...</p>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {/* Common sections for ingredient view */}
        {searchType === 'ingredient' && recommendation && (
          <>
            {/* Ranking Analysis Panel - Displays intelligent analysis of ranked studies */}
            {(() => {
              const rankingData = recommendation?.evidence_summary?.studies?.ranked;
              return rankingData ? (
                <RankingAnalysisPanel
                  ranking={rankingData}
                  supplementName={localizedSupplementName}
                />
              ) : null;
            })()}

            <div className="mb-8">
              <ScientificStudiesPanel
                supplementName={researchSupplementName}
                displaySupplementName={localizedSupplementName}
                maxStudies={5}
                filters={{ rctOnly: false, yearFrom: 2010 }}
                autoLoad={false}
              />
            </div>

            {/* Benefit Search Box - Moved here after Scientific Studies */}
            <div className="mb-8 bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Explorar Evidencia por Tema</h2>
              <p className="text-sm text-gray-600 mb-4">
                ¿Te interesa explorar un tema clínico o componente específico? Escribe en español; buscamos en la literatura científica en inglés.
              </p>

              {/* Auto-suggested benefits for this supplement */}
              {(() => {
                const suggestions = getSuggestedBenefits(recommendation?.category || '');
                if (suggestions.length > 0) {
                  return (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-blue-700 mb-2">
                        🎯 Temas más investigados para {localizedSupplementName}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              // Open modal with benefit-specific studies
                              setSelectedBenefit({
                                en: suggestion.benefit,
                                es: suggestion.benefitEs,
                              });
                              setIsBenefitModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-xs font-medium text-blue-700 transition-colors"
                            title={suggestion.reason}
                          >
                            {suggestion.benefitEs}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <p className="text-xs text-gray-500 mb-3">
                💡 O escribe tu propio beneficio: &ldquo;crecimiento de cabello&rdquo;, &ldquo;piel hidratada&rdquo;, &ldquo;cansancio&rdquo;, &ldquo;memoria&rdquo;
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  // Validate input
                  if (!benefitQuery.trim()) {
                    return;
                  }

                  // Normalize benefit query from Spanish to English
                  const normalized = normalizeBenefit(benefitQuery);

                  console.log('[Benefit Form Submit] Normalizing benefit:', {
                    original: benefitQuery,
                    normalized: normalized.normalized,
                    confidence: normalized.confidence,
                    category: normalized.category,
                  });

                  // Use normalized English term if confidence is high enough
                  const finalBenefit = normalized.confidence >= 0.7
                    ? normalized.normalized
                    : benefitQuery;

                  // Open modal with benefit-specific studies (same as pre-loaded buttons)
                  setSelectedBenefit({
                    en: finalBenefit,
                    es: benefitQuery, // Keep original Spanish text for display
                  });
                  setIsBenefitModalOpen(true);

                  // Clear input after opening modal
                  setBenefitQuery('');
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  value={benefitQuery}
                  onChange={(e) => setBenefitQuery(e.target.value)}
                  placeholder="Busca beneficios específicos: memoria, cansancio, piel, cabello, sueño..."
                  title="Escribe cualquier beneficio en español. Buscamos en la literatura científica en inglés."
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                  type="submit"
                  title="Buscar estudios científicos sobre este beneficio"
                  className="bg-blue-600 text-white font-semibold px-6 py-3 min-h-[44px] rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </button>
              </form>
            </div>

            <div className="mb-8">
              <ProductRecommendationsGrid
                products={buildAffiliateAwareProducts(recommendation, query, language)}
                onBuyClick={handleBuyClick}
              />
            </div>
            <div className="mb-8">
              <ShareReferralCard
                recommendationId={recommendation.recommendation_id}
                mode={isCannabisResearchContext(recommendation, query) ? 'research' : 'recommendation'}
              />
            </div>
          </>
        )}
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={async () => {
          if (!user) {
            return; // AuthModal will handle sign-in
          }

          try {
            const response = await fetch('/api/portal/subscription/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId: 'pro',
                user_id: user.id,
                email: user.email,
              }),
            });

            const data = await response.json();
            if (data.success && data.checkout_url) {
              window.location.href = data.checkout_url;
            } else {
              alert(`Error: ${data.error || 'Failed to create subscription'}`);
            }
          } catch (error: unknown) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
      />

      {/* Variant Selector Modal */}
      {variantDetection && (
        <VariantSelectorModal
          isOpen={showVariantSelector}
          supplementName={variantDetection.baseSupplementName}
          variantDetection={variantDetection}
          onSelectVariant={handleSelectVariant}
          onSelectGeneric={handleSelectGeneric}
          _isLoading={false}
        />
      )}

      {/* Benefit Studies Modal */}
      {selectedBenefit && (
        <BenefitStudiesModal
          isOpen={isBenefitModalOpen}
          onClose={() => {
            setIsBenefitModalOpen(false);
            setSelectedBenefit(null);
          }}
          supplementName={researchSupplementName}
          displaySupplementName={localizedSupplementName}
          benefitQuery={selectedBenefit.en}
          benefitQueryEs={selectedBenefit.es}
          recommendation={recommendation}
        />
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
