/**
 * Portal Results Page
 * Displays evidence analysis, personalization, and product recommendations
 * Force redeploy: 2025-12-14T08:00:00Z
 */

'use client';

// This is a client component that requires search params
// No need for dynamic export - client components are dynamic by default

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EvidenceAnalysisPanelNew from '@/components/portal/EvidenceAnalysisPanelNew';
import ProductRecommendationsGrid from '@/components/portal/ProductRecommendationsGrid';
import PaywallModal from '@/components/portal/PaywallModal';
import ShareReferralCard from '@/components/portal/ShareReferralCard';
import ScientificStudiesPanel from '@/components/portal/ScientificStudiesPanel';
import IntelligentLoadingSpinner from '@/components/portal/IntelligentLoadingSpinner';

import LegalDisclaimer from '@/components/portal/LegalDisclaimer';
import { StreamingResults } from '@/components/portal/StreamingResults';
import ExamineStyleView from '@/components/portal/ExamineStyleView';
import { ViewToggle, type ViewMode } from '@/components/portal/ViewToggle';
import { ErrorState } from '@/components/portal/ErrorState';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/lib/auth/useAuth';
import { searchAnalytics } from '@/lib/portal/search-analytics';
import { traceSearch } from '@/lib/portal/xray-client';
import { normalizeQuery } from '@/lib/portal/query-normalization';
import { searchSupplement } from '@/lib/portal/supplement-search';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { normalizeBenefit } from '@/lib/portal/benefit-normalization';
import { getTopSuggestedBenefit, getSuggestedBenefits } from '@/lib/portal/supplement-benefit-suggestions';
import { filterByBenefit } from '@/lib/portal/benefit-study-filter';
import BenefitStudiesModal from '@/components/portal/BenefitStudiesModal';
import { getLocalizedSupplementName } from '@/lib/i18n/supplement-names';
import type { GradeType } from '@/types/supplement-grade';
import type { PubMedQueryResult, SupplementEvidence } from '@/lib/services/pubmed-search';
import ConditionResultsDisplay from '@/components/portal/ConditionResultsDisplay';

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
function transformRecommendationToEvidence(recommendation: Recommendation): any {
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

  // ✅ USE STRUCTURED DATA - No string parsing needed!
  const worksFor = Array.isArray(supplement.worksFor) ? supplement.worksFor.map((item: any) => ({
    condition: item.condition || item.use || item.benefit || '',
    grade: item.evidenceGrade || item.grade || 'C',
    description: item.notes || item.effectSize || item.magnitude || '',
    studyCount: item.studyCount || 0,
    metaAnalysis: item.metaAnalysis || false,
  })) : [];

  const doesntWorkFor = Array.isArray(supplement.doesntWorkFor) ? supplement.doesntWorkFor.map((item: any) => ({
    condition: item.condition || item.use || '',
    grade: item.evidenceGrade || item.grade || 'D',
    description: item.notes || item.effectSize || '',
    studyCount: item.studyCount || 0,
  })) : [];

  const limitedEvidence = Array.isArray(supplement.limitedEvidence) ? supplement.limitedEvidence.map((item: any) => {
    // CONSISTENCY FIX: Force items in limitedEvidence to have grade C or lower
    // Items with grade A/B should be in worksFor, not limitedEvidence
    // This prevents showing "Evidencia Limitada" with "Grado A" which is contradictory
    //
    // TODO(backend): Backend should properly categorize items by evidence strength:
    // - Grade A/B → worksFor
    // - Grade C → limitedEvidence or worksFor (depending on confidence)
    // - Grade D/E/F → doesntWorkFor or limitedEvidence
    const rawGrade = item.evidenceGrade || item.grade || 'C';
    const adjustedGrade = (rawGrade === 'A' || rawGrade === 'B') ? 'C' : rawGrade;

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

  // Determine overall grade: Prioritize top-level overallGrade, then first ingredient
  const overallGrade = recommendation.supplement?.overallGrade ||
    (recommendation as any).evidence_summary?.overallGrade ||
    (ingredients.length > 0 ? ingredients[0].grade : 'C');

  // Transform dosage
  const transformedDosage = typeof supplement.dosage === 'object' && supplement.dosage !== null ? {
    effectiveDose: supplement.dosage.effectiveDose || supplement.dosage.optimalDose || 'No especificado',
    commonDose: supplement.dosage.standard || supplement.dosage.optimalDose || 'Consultar con profesional',
    timing: supplement.dosage.timing || 'Según indicaciones',
    notes: supplement.dosage.notes || '',
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
  const studies = (evidenceSummary as any).studies || metadata.studies || {
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

  const result = {
    overallGrade,
    whatIsItFor: supplement.description || `Suplemento: ${recommendation.category}`,
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
  };

  // DEBUG: Log final result summary
  console.log('[transformRecommendationToEvidence] Output summary:', {
    overallGrade: result.overallGrade,
    worksForCount: result.worksFor.length,
    hasDosage: !!result.dosage,
    ingredientsCount: result.ingredients.length,
  });

  return result;
}

/**
 * Transform recommendation data to Examine.com style format
 * Focuses on quantitative data and precise measurements
 */
function transformToExamineFormat(recommendation: Recommendation): any {
  const supplement = (recommendation as any).supplement || {};

  return {
    overview: {
      whatIsIt: supplement.description || supplement.whatIsIt || `Suplemento: ${recommendation.category}`,
      functions: supplement.primaryUses || supplement.functions || [],
      sources: supplement.sources || [],
    },
    benefitsByCondition: (supplement.worksFor || []).map((item: any) => ({
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
        common: (supplement.sideEffects || [])
          .filter((e: any) => typeof e === 'string' || e.frequency === 'Common')
          .map((e: any) => typeof e === 'string' ? e : e.effect),
        rare: (supplement.sideEffects || [])
          .filter((e: any) => typeof e === 'object' && e.frequency === 'Rare')
          .map((e: any) => e.effect),
        severity: supplement.safety?.overallRating || 'Generally mild',
      },
      interactions: {
        medications: (supplement.interactions || []).map((i: any) => ({
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
  supplement?: {
    name: string;
    description: string;
    overallGrade?: GradeType;
    worksFor?: any[];
    doesntWorkFor?: any[];
    limitedEvidence?: any[];
    sideEffects?: any[];
    dosage?: any;
    contraindications?: string[];
    mechanisms?: any[];
  };
  evidence_summary: {
    totalStudies: number;
    totalParticipants: number;
    efficacyPercentage: number;
    researchSpanYears: number;
    overallGrade?: GradeType;
    qualityBadges?: any;
    ingredients: Array<{
      name: string;
      grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
      studyCount: number;
      rctCount: number;
    }>;
  };
  ingredients: Array<{
    name: string;
    grade: 'A' | 'B' | 'C';
    adjustedDose?: string;
    adjustmentReason?: string;
  }>;
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

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [transformedEvidence, setTransformedEvidence] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [examineContent, setExamineContent] = useState<any>(null);
  const [benefitQuery, setBenefitQuery] = useState('');
  const [submittedBenefitQuery, setSubmittedBenefitQuery] = useState('');

  // Modal state for benefit-specific studies popup
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<{ en: string; es: string } | null>(null);

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
    const query = searchParams.get('q');
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

  const query = searchParams.get('q');
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
    const transformed = transformRecommendationToEvidence(recommendation);

    // Log section availability
    const supplement = (recommendation as any).supplement || {};
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

    // Log missing sections
    if (!transformed.worksFor || transformed.worksFor.length === 0) {
      console.warn('[Recommendation Sections] ⚠️ Missing worksFor section for:', recommendation.category);
    }
    if (!transformed.dosage) {
      console.warn('[Recommendation Sections] ⚠️ Missing dosage section for:', recommendation.category);
    }
    if (!transformed.sideEffects || transformed.sideEffects.length === 0) {
      console.warn('[Recommendation Sections] ⚠️ Missing sideEffects section for:', recommendation.category);
    }

    setTransformedEvidence(transformed);

    // Also transform to Examine format
    const examineFormatted = transformToExamineFormat(recommendation);
    setExamineContent(examineFormatted);
  }, [recommendation]);

  useEffect(() => {
    let isMounted = true;

    // Handle different scenarios
    if (jobId && !query) {
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
              setIsLoading(false);
              return;
            }
          }

          // Cache miss or expired - redirect to new search
          console.log('[Cache Retrieval] Cache miss for shared link - redirecting to homepage');
          setError('Esta recomendación ya no está disponible. Por favor, genera una nueva búsqueda.');
          setIsLoading(false);
          setTimeout(() => router.push('/portal'), 2000);
        } catch (error) {
          console.error('[Cache Retrieval] Error:', error);
          setError('Error al cargar la recomendación. Por favor, genera una nueva búsqueda.');
          setIsLoading(false);
        }
      }
    } else if (query) {
      // Generate new recommendation from search query
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

          // If not a category, treat as ingredient search
          // Ingredients are typically: single words, compound words, or scientific names
          const isIngredientSearch = !matchedCategory;

          // The quiz endpoint handles all normalization and enrichment.
          // We send the raw user query directly to it.
          const searchTerm = normalizedQuery;
          const category = searchTerm;

          // Generate Job ID for complete traceability
          const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`🔖 Job ID: ${jobId} - Query: "${normalizedQuery}" → "${category}"`);

          // Use quiz endpoint for all searches (ingredients and categories)
          // The quiz endpoint already handles enrichment with proper timeout handling
          // Adding timestamp to force fresh fetch and avoid caching old B12 results
          const response = await fetch(`/api/portal/quiz?t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Job-ID': jobId,
            },
            body: JSON.stringify({
              category,
              age: 35, // Default - in production, get from user profile
              gender: 'male', // Default
              location: 'CDMX', // Default
              jobId, // Include in body for backend logging
              benefitQuery: submittedBenefitQuery, // Pass the benefit query
            }),
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
                message: errorData.message || `No encontramos estudios científicos publicados sobre "${normalizedQuery}".`,
                searchedFor: normalizedQuery,
                suggestions: [],
                metadata: {
                  normalizedQuery: searchTerm,
                  requestId: errorData.requestId,
                  timestamp: new Date().toISOString(),
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

          if (data.searchType === 'condition') {
            console.log('[Data Fetch] ✅ Received CONDITION result:', data);
            setConditionResult(data);
            setRecommendation(null); // Clear other state
            setSearchType('condition');
          } else if (data.success && data.recommendation) {
            // LEGACY SYNC PATTERN or ingredient search
            console.log('[Data Fetch] ✅ Received INGREDIENT result:', data.recommendation);
            setRecommendation(data.recommendation);
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
              data.recommendation.recommendation_id = jobId; // Use existing jobId instead of generating rec_*
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
              const finalRecommendation = submittedBenefitQuery
                ? filterByBenefit(data.recommendation, submittedBenefitQuery)
                : data.recommendation;

              setRecommendation(finalRecommendation);
              console.log('[State Update] Setting isLoading to false');
              setIsLoading(false); // Stop loading spinner
            }

            // CACHE: Save to localStorage for later retrieval
            // Only cache recommendations with real data (validated)
            // Use jobId for cache key to match job-store
            const cacheJobId = data.jobId || data.recommendation.recommendation_id || jobId;
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
  }, [query, jobId, router, submittedBenefitQuery]);

  const handleBuyClick = (product: { tier?: string; isAnkonere?: boolean; directLink?: string; affiliateLink?: string }) => {
    if (isFreeUser && product.tier !== 'budget') {
      setShowPaywall(true);
    } else {
      const link = product.isAnkonere ? product.directLink : product.affiliateLink;
      if (link) {
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
      <LegalDisclaimer />

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            {t('results.back')}
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t('results.title')} {localizedSupplementName}
          </h1>
          {(() => {
            // Extract study data with fallbacks
            const totalStudies = recommendation?.evidence_summary?.totalStudies || 0;
            const totalParticipants = recommendation?.evidence_summary?.totalParticipants || 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metadata = (recommendation as any)?._enrichment_metadata || {};
            const studiesUsed = metadata.studiesUsed || 0;

            // Log study data availability
            console.log('[Study Data Display]', {
              totalStudies,
              totalParticipants,
              studiesUsed,
              hasEvidenceSummary: !!recommendation?.evidence_summary,
              category: recommendation?.category,
            });

            // Check if we have real study data
            const hasRealStudyData = totalStudies > 0 || studiesUsed > 0;

            if (!hasRealStudyData) {
              console.log('[Study Data Display] ⚠️ No real study data found for:', recommendation?.category);
            }

            // Display study data if available
            if (hasRealStudyData) {
              const studyLabel = t('results.studies');
              const participantsLabel = t('results.participants');
              const andText = t('portal.search.analyzing').toLowerCase().includes('analizando') ? 'y' : 'and';

              return (
                <p className="text-gray-600" data-testid="study-data-summary">
                  {t('results.based.on')} {totalStudies.toLocaleString()} {studyLabel}
                  {totalParticipants > 0 && (
                    <> {andText} {totalParticipants.toLocaleString()} {participantsLabel}</>
                  )}
                </p>
              );
            } else {
              return (
                <p className="text-yellow-700 font-medium" data-testid="no-study-data-warning">
                  ⚠️ Esta información no está respaldada por estudios científicos verificados
                </p>
              );
            }
          })()}
        </div>

        {/* Benefit Search Box */}
        <div className="mb-8 bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Buscar por Beneficio Específico</h2>
          <p className="text-sm text-gray-600 mb-4">
            ¿Te interesa saber si este suplemento sirve para algo en particular? Escribe en español, buscamos en la literatura científica en inglés.
          </p>

          {/* Auto-suggested benefits for this supplement */}
          {(() => {
            const suggestions = getSuggestedBenefits(recommendation?.category || '');
            if (suggestions.length > 0) {
              return (
                <div className="mb-4">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    🎯 Beneficios más investigados para {localizedSupplementName}:
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
            💡 O escribe tu propio beneficio: "crecimiento de cabello", "piel hidratada", "cansancio", "memoria"
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
              placeholder="ej: crecimiento de cabello, piel hidratada..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              Buscar
            </button>
          </form>
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
                    No se encontraron estudios científicos para "{localizedSupplementName}"
                  </h3>
                  <p className="text-yellow-800 text-sm mb-2">
                    No encontramos estudios científicos publicados sobre este suplemento. La información mostrada es de carácter general y no está respaldada por evidencia científica específica.
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
                    <ViewToggle mode={viewMode} onChange={setViewMode} />
                    {viewMode === 'standard' ? (
                      <EvidenceAnalysisPanelNew
                        evidenceSummary={transformedEvidence}
                        supplementName={localizedSupplementName}
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
            <div className="mb-8">
              <ScientificStudiesPanel
                supplementName={localizedSupplementName}
                maxStudies={5}
                filters={{ rctOnly: false, yearFrom: 2010 }}
                autoLoad={false}
              />
            </div>
            <div className="mb-8">
              <ProductRecommendationsGrid products={recommendation.products} onBuyClick={handleBuyClick} />
            </div>
            <div className="mb-8">
              <ShareReferralCard recommendationId={recommendation.recommendation_id} />
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

      {/* Benefit Studies Modal */}
      {selectedBenefit && (
        <BenefitStudiesModal
          isOpen={isBenefitModalOpen}
          onClose={() => {
            setIsBenefitModalOpen(false);
            setSelectedBenefit(null);
          }}
          supplementName={localizedSupplementName}
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

