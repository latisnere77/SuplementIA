/**
 * Portal Results Page
 * Displays evidence analysis, personalization, and product recommendations
 */

'use client';

// This is a client component that requires search params
// No need for dynamic export - client components are dynamic by default

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EvidenceAnalysisPanelNew from '@/components/portal/EvidenceAnalysisPanelNew';
import ProductRecommendationsGrid from '@/components/portal/ProductRecommendationsGrid';
import PaywallModal from '@/components/portal/PaywallModal';
import ShareReferralCard from '@/components/portal/ShareReferralCard';
import ScientificStudiesPanel from '@/components/portal/ScientificStudiesPanel';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/lib/auth/useAuth';
import { suggestSupplementCorrection } from '@/lib/portal/supplement-suggestions';

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
    hasBenefits: Array.isArray(supplement.benefits),
    benefitsCount: supplement.benefits?.length || 0,
    hasDosage: !!supplement.dosage,
    dosageType: typeof supplement.dosage,
    ingredientsCount: evidenceSummary.ingredients?.length || 0,
  });

  // Defensive: Ensure arrays exist
  const benefits = Array.isArray(supplement.benefits) ? supplement.benefits : [];
  const sideEffects = Array.isArray(supplement.side_effects) ? supplement.side_effects : [];
  const ingredients = Array.isArray(evidenceSummary.ingredients) ? evidenceSummary.ingredients : [];

  // Parse benefits array to worksFor format
  const worksFor = benefits.map((benefit: string) => {
    // Parse format: "Condition (Evidencia: A, magnitude)"
    const match = benefit.match(/^(.+?)\s*\(Evidencia:\s*([A-F])[,\s]+(.+?)\)$/);
    if (match) {
      return {
        condition: match[1].trim(),
        grade: match[2] as any,
        description: match[3].trim(),
      };
    }
    // Fallback if format doesn't match
    console.warn('[transformRecommendationToEvidence] Failed to parse benefit:', benefit);
    return {
      condition: benefit,
      grade: 'C' as any,
      description: '',
    };
  });

  // DEBUG: Log parsed worksFor
  console.log('[transformRecommendationToEvidence] Parsed worksFor:', {
    count: worksFor.length,
    items: worksFor.map((w: { condition: string; grade: string }) => ({ condition: w.condition, grade: w.grade })),
  });

  // Parse side_effects to doesntWorkFor/limitedEvidence
  const limitedEvidence = sideEffects.map((effect: string) => ({
    condition: effect,
    grade: 'C' as any,
    description: 'Posible efecto secundario',
  }));

  // Determine overall grade from ingredients
  const overallGrade = ingredients.length > 0
    ? ingredients[0].grade
    : ('C' as any);

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

  const result = {
    overallGrade,
    whatIsItFor: supplement.description || `Suplemento: ${recommendation.category}`,
    worksFor,
    doesntWorkFor: [], // We don't have explicit "doesn't work for" data yet
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
      hasMetaAnalysis: evidenceSummary.totalStudies > 50,
      longTermStudies: evidenceSummary.researchSpanYears >= 5,
      safetyEstablished: true,
    },
    // Use transformed dosage
    dosage: transformedDosage,
    sideEffects: Array.isArray(supplement.side_effects) ? supplement.side_effects : [],
    interactions: Array.isArray(supplement.interactions) ? supplement.interactions : [],
    contraindications: Array.isArray(supplement.warnings) ? supplement.warnings : [],
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
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [transformedEvidence, setTransformedEvidence] = useState<any>(null);

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

  const isFreeUser = !subscription || subscription.plan_id === 'free';

  const query = searchParams.get('q');
  const recommendationId = searchParams.get('id');

  // Transform evidence data when recommendation changes (CLIENT-SIDE, instant)
  useEffect(() => {
    if (!recommendation) {
      setTransformedEvidence(null);
      return;
    }

    // Check if this is mock/generated data with no real studies
    const metadata = (recommendation as any)._enrichment_metadata || {};
    const hasRealData = metadata.hasRealData && metadata.studiesUsed > 0;
    const totalStudies = recommendation.evidence_summary?.totalStudies || 0;

    // If no real data, show warning
    if (!hasRealData || totalStudies === 0) {
      console.warn('⚠️ No real data found for:', recommendation.category);
      console.warn('Metadata:', metadata);
      // Still transform, but user should see warning
    }

    // Simple client-side transformation (no API calls needed)
    const transformed = transformRecommendationToEvidence(recommendation);
    setTransformedEvidence(transformed);
  }, [recommendation]);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchRecommendation = async (retryCount = 0): Promise<boolean> => {
      if (!recommendationId) return false;

      // FIRST: Check localStorage cache
      if (typeof window !== 'undefined' && retryCount === 0) {
        try {
          const cacheKey = `recommendation_${recommendationId}`;
          const cachedData = localStorage.getItem(cacheKey);

          if (cachedData) {
            const { recommendation, timestamp, ttl } = JSON.parse(cachedData);
            const age = Date.now() - timestamp;

            // Check if cache has inconsistent data (fake studies)
            const metadata = (recommendation as any)?._enrichment_metadata || {};
            const totalStudies = recommendation?.evidence_summary?.totalStudies || 0;
            const studiesUsed = metadata.studiesUsed || 0;

            // If totalStudies > 0 but studiesUsed = 0, this is fake/generated data from old cache
            const hasFakeData = totalStudies > 0 && studiesUsed === 0;

            if (hasFakeData) {
              console.log('⚠️  Cache has fake/generated data (totalStudies:', totalStudies, 'studiesUsed:', studiesUsed, '), invalidating cache');
              localStorage.removeItem(cacheKey);
            } else if (age < ttl) {
              // Cache is still valid and has consistent data
              console.log('✅ Found recommendation in localStorage cache (age:', Math.floor(age / 1000 / 60), 'minutes)');
              if (isMounted) {
                setRecommendation(recommendation);
                setIsLoading(false);
              }
              return true; // Success - used cache
            } else {
              console.log('⚠️  Cache expired, removing:', cacheKey);
              localStorage.removeItem(cacheKey);
            }
          }
        } catch (cacheError) {
          console.warn('Failed to read from cache:', cacheError);
        }
      }

      // Retry logic with exponential backoff
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second
      const retryDelay = Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Max 10s

      try {
        // Add timeout to frontend fetch (35s to allow for 30s backend timeout + overhead)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        console.log(`🔍 [${retryCount + 1}/${maxRetries + 1}] Fetching recommendation: ${recommendationId}`);
        const response = await fetch(`/api/portal/recommendation/${recommendationId}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load recommendation' }));
          console.error('❌ Invalid response:', {
            status: response.status,
            error: errorData,
            attempt: retryCount + 1,
          });
          
          // Retry on 503 errors (service unavailable)
          if (response.status === 503 && retryCount < maxRetries) {
            console.log(`🔄 Retrying after ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchRecommendation(retryCount + 1);
          }

          // Handle 410 Gone - recommendation endpoint no longer available (new system)
          if (response.status === 410) {
            console.log('⚠️  410 Gone - recommendation was already delivered in quiz response');
            console.log('⚠️  Redirecting to homepage to generate new recommendation');
            if (isMounted) {
              setError('Esta recomendación ya no está disponible. Por favor, genera una nueva búsqueda.');
              setIsLoading(false);
              // Redirect to homepage after 2 seconds
              setTimeout(() => {
                router.push('/portal');
              }, 2000);
            }
            return false;
          }

          // Better error messages for specific cases
          let errorMessage = errorData.error || errorData.message || `Failed to load recommendation (${response.status})`;
          if (response.status === 503 && errorData.isTimeout) {
            errorMessage = 'El servicio está tardando más de lo esperado. Por favor, intenta de nuevo en un momento.';
          } else if (response.status === 503) {
            errorMessage = 'El servicio no está disponible temporalmente. Por favor, intenta de nuevo en un momento.';
          } else if (response.status === 404) {
            errorMessage = 'Recomendación no encontrada. Por favor, genera una nueva recomendación.';
          }
          
          if (isMounted) {
            setError(errorMessage);
            setIsLoading(false);
          }
          return false;
        }
        
        const data = await response.json();
        
        console.log('📊 API Response:', {
          success: data.success,
          hasRecommendation: !!data.recommendation,
          status: data.status,
          keys: Object.keys(data),
        });
        
        // Handle recommendation data - check multiple possible formats
        if (data.recommendation) {
          if (isMounted) {
            setRecommendation(data.recommendation);
            setIsLoading(false);
          }
          return true; // Success
        }
        
        // Handle processing status - start polling
        if (data.success && data.status === 'processing') {
          console.log('🔄 Recommendation is processing, starting polling...');
          if (isMounted) {
            setIsLoading(true); // Keep loading state
            setError(null); // Clear any previous errors

            // Start polling every 3 seconds
            if (!pollingInterval) {
              pollingInterval = setInterval(async () => {
                if (isMounted) {
                  const polled = await fetchRecommendation(0);
                  if (polled && pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                  }
                }
              }, 3000); // Poll every 3 seconds
            }
          }
          return false; // Still processing
        }
        
        // Handle errors
        if (!data.success) {
          console.error('❌ API returned error:', data);
          if (isMounted) {
            setError(data.error || data.message || 'Failed to load recommendation');
            setIsLoading(false);
          }
          return false;
        }
        
        // Fallback: if we got here, something unexpected happened
        console.error('❌ Invalid response format:', data);
        if (isMounted) {
          setError(data.error || data.message || 'Invalid response format from server');
          setIsLoading(false);
        }
        return false;
      } catch (err: any) {
        console.error('❌ Failed to load recommendation:', err);

        // Retry on network errors (but not on abort/timeout)
        if (err.name !== 'AbortError' && err.name !== 'TimeoutError' && retryCount < maxRetries) {
          console.log(`🔄 Retrying after ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchRecommendation(retryCount + 1);
        }

        // Better error messages for specific error types
        let errorMessage = 'Failed to load recommendation';
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intenta de nuevo.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
        }
        return false;
      }
    };

    // Handle different scenarios
    if (recommendationId) {
      // Initial fetch for existing recommendation
      fetchRecommendation(0);
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
          
          // For ingredient searches, pass the query directly (backend will handle it)
          // For category searches, use the mapped category
          const category = matchedCategory || normalizedQuery;

          const response = await fetch('/api/portal/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category,
              age: 35, // Default - in production, get from user profile
              gender: 'male', // Default
              location: 'CDMX', // Default
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            let errorMessage = `Backend error: ${response.status}`;
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            setError(errorMessage);
            setIsLoading(false);
            return;
          }

          const data = await response.json();
          console.log('✅ API Response received:', {
            success: data.success,
            status: response.status,
            hasRecommendation: !!data.recommendation,
            hasRecommendationId: !!data.recommendation_id,
            demo: data.demo,
          });
          
          // ASYNC PATTERN: Backend returned 202 with recommendation_id - start polling
          if (response.status === 202 && data.recommendation_id) {
            console.log('🔄 Starting async polling for recommendation:', data.recommendation_id);

            // Update URL immediately with recommendation ID (without navigation)
            if (typeof window !== 'undefined') {
              const newUrl = `/portal/results?id=${data.recommendation_id}`;
              const currentUrl = window.location.pathname + window.location.search;
              if (currentUrl !== newUrl) {
                console.log('📝 Updating URL for polling:', newUrl);
                window.history.replaceState({}, '', newUrl);
                // DO NOT call router.push() - it causes unnecessary page reload
              }
            }
            
            // Start polling for status
            const pollInterval = parseInt(data.pollInterval || '3') * 1000; // Convert to ms
            const maxPollTime = 180000; // 3 minutes max
            const startTime = Date.now();
            
            const pollStatus = async () => {
              try {
                const statusResponse = await fetch(`/api/portal/status/${data.recommendation_id}`);
                const statusData = await statusResponse.json();
                
                console.log('📊 Polling status:', {
                  status: statusData.status,
                  progress: statusData.progress,
                  message: statusData.progressMessage,
                });
                
                if (statusData.status === 'completed' && statusData.recommendation) {
                  console.log('✅ Recommendation completed:', {
                    id: statusData.recommendation.recommendation_id,
                    category: statusData.recommendation.category,
                  });
                  setRecommendation(statusData.recommendation);
                  setIsLoading(false);
                  return; // Stop polling
                } else if (statusData.status === 'failed') {
                  console.error('❌ Recommendation failed:', statusData.error);
                  setError(statusData.error || 'Failed to generate recommendation');
                  setIsLoading(false);
                  return; // Stop polling
                } else if (statusData.status === 'processing') {
                  // Continue polling if we haven't exceeded max time
                  if (Date.now() - startTime < maxPollTime) {
                    setTimeout(pollStatus, pollInterval);
                  } else {
                    console.error('❌ Polling timeout');
                    setError('La recomendación está tardando más de lo esperado. Por favor, intenta de nuevo.');
                    setIsLoading(false);
                  }
                }
              } catch (pollError: any) {
                console.error('❌ Polling error:', pollError);
                // Continue polling on error (might be transient)
                if (Date.now() - startTime < maxPollTime) {
                  setTimeout(pollStatus, pollInterval);
                } else {
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
            // Validate recommendation structure
            if (!data.recommendation.recommendation_id) {
              data.recommendation.recommendation_id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            if (!data.recommendation.quiz_id) {
              data.recommendation.quiz_id = data.quiz_id || `quiz_${Date.now()}`;
            }
            
            console.log('✅ Recommendation received:', {
              id: data.recommendation.recommendation_id,
              category: data.recommendation.category,
              ingredientsCount: data.recommendation.ingredients?.length || 0,
            });

            if (isMounted) {
              setRecommendation(data.recommendation);
              setIsLoading(false); // Stop loading spinner
            }

            // CACHE: Save to localStorage for later retrieval
            if (data.recommendation.recommendation_id && typeof window !== 'undefined') {
              try {
                const cacheKey = `recommendation_${data.recommendation.recommendation_id}`;
                const cacheData = {
                  recommendation: data.recommendation,
                  timestamp: Date.now(),
                  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
                };
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                console.log('💾 Saved recommendation to localStorage:', data.recommendation.recommendation_id);
              } catch (cacheError) {
                console.warn('Failed to cache recommendation:', cacheError);
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
              setError(errorMessage);
              setIsLoading(false);
            }
          }
        } catch (err: any) {
          console.error('Fetch error:', err);
          if (isMounted) {
            setError(err.message || 'An unexpected error occurred');
            setIsLoading(false);
          }
        }
      };

      generateRecommendation();
    } else {
      if (isMounted) {
        setError('No search query or recommendation ID provided');
        setIsLoading(false);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }, [query, recommendationId, router]);

  const handleBuyClick = (product: any) => {
    if (isFreeUser && product.tier !== 'budget') {
      setShowPaywall(true);
    } else {
      const link = product.isAnkonere ? product.directLink : product.affiliateLink;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Show loading state (only while fetching, not while transforming)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium mb-2">{t('common.loading')}</p>
          <p className="text-gray-500 text-sm">
            Analizando evidencia científica y generando recomendaciones personalizadas...
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Esto puede tomar 60-120 segundos
          </p>
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('common.error')}</h2>
          <p className="text-gray-600 mb-6">{error || 'Recommendation not found'}</p>
          <button
            onClick={() => router.push('/portal')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            {t('results.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            {t('results.title')} {recommendation.category}
          </h1>
          {recommendation.evidence_summary.totalStudies > 0 ? (
            <p className="text-gray-600">
              {t('results.based.on')} {recommendation.evidence_summary.totalStudies.toLocaleString()} {t('results.studies')}{' '}
              {recommendation.evidence_summary.totalParticipants.toLocaleString()} {t('results.participants')}
            </p>
          ) : (
            <p className="text-yellow-700 font-medium">
              ⚠️ Esta información no está respaldada por estudios científicos verificados
            </p>
          )}
        </div>

        {/* Warning banner if no real data - Check BOTH totalStudies and _enrichment_metadata */}
        {(recommendation.evidence_summary.totalStudies === 0 ||
          (recommendation as any)._enrichment_metadata?.studiesUsed === 0) && (() => {
          const suggestion = suggestSupplementCorrection(recommendation.category);
          return (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    No se encontraron estudios científicos para "{recommendation.category}"
                  </h3>
                  <p className="text-yellow-800 text-sm mb-2">
                    No encontramos estudios científicos publicados sobre este suplemento. La información mostrada es de carácter general y no está respaldada por evidencia científica específica.
                  </p>
                  {suggestion && (
                    <div className="mt-3 p-3 bg-white border border-yellow-300 rounded-lg">
                      <p className="text-yellow-900 text-sm mb-2">
                        <strong>¿Buscabas esto?</strong>
                      </p>
                      <button
                        onClick={() => router.push(`/portal/results?q=${encodeURIComponent(suggestion.suggestion)}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <span>{suggestion.suggestion}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Evidence Analysis - NUEVO DISEÑO VISUAL */}
        <div className="mb-8">
          {transformedEvidence ? (
            <EvidenceAnalysisPanelNew
              evidenceSummary={transformedEvidence}
              supplementName={recommendation.category}
            />
          ) : (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-gray-500 text-sm mt-4">Procesando evidencia científica...</p>
            </div>
          )}
        </div>

        {/* Scientific Studies from PubMed */}
        <div className="mb-8">
          <ScientificStudiesPanel
            supplementName={recommendation.category}
            maxStudies={5}
            filters={{
              rctOnly: false,
              yearFrom: 2010,
            }}
            autoLoad={false}
          />
        </div>

        {/* Product Recommendations */}
        <div className="mb-8">
          <ProductRecommendationsGrid products={recommendation.products} onBuyClick={handleBuyClick} />
        </div>

        {/* Share & Referral */}
        <div className="mb-8">
          <ShareReferralCard recommendationId={recommendation.recommendation_id} />
        </div>
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
          } catch (error: any) {
            alert(`Error: ${error.message}`);
          }
        }}
      />
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

