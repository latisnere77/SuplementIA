/**
 * Portal Results Page
 * Displays evidence analysis, personalization, and product recommendations
 */

'use client';

// This is a client component that requires search params
// No need for dynamic export - client components are dynamic by default

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EvidenceAnalysisPanel from '@/components/portal/EvidenceAnalysisPanel';
import PersonalizationExplanation from '@/components/portal/PersonalizationExplanation';
import ProductRecommendationsGrid from '@/components/portal/ProductRecommendationsGrid';
import PaywallModal from '@/components/portal/PaywallModal';
import ShareReferralCard from '@/components/portal/ShareReferralCard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAuth } from '@/lib/auth/useAuth';

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

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (recommendationId) {
        // Fetch existing recommendation
        try {
          console.log(`🔍 Fetching recommendation: ${recommendationId}`);
          const response = await fetch(`/api/portal/recommendation/${recommendationId}`);
          const data = await response.json();
          
          if (!response.ok) {
            const errorMessage = data.message || data.error || `Failed to load recommendation: ${response.status}`;
            console.error('❌ Failed to load recommendation:', errorMessage);
            setError(errorMessage);
            setIsLoading(false);
            return;
          }
          
          if (data.success && data.recommendation) {
            console.log('✅ Recommendation loaded:', {
              id: data.recommendation.recommendation_id,
              category: data.recommendation.category,
            });
            setRecommendation(data.recommendation);
          } else {
            const errorMessage = data.error || data.message || 'Failed to load recommendation';
            console.error('❌ Invalid response:', errorMessage);
            setError(errorMessage);
          }
        } catch (err: any) {
          console.error('❌ Fetch error:', err);
          setError(err.message || 'Failed to load recommendation');
        } finally {
          setIsLoading(false);
        }
      } else if (query) {
        // Generate new recommendation from search query
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
            
            // Update URL immediately with recommendation ID
            if (typeof window !== 'undefined') {
              const newUrl = `/portal/results?id=${data.recommendation_id}`;
              const currentUrl = window.location.pathname + window.location.search;
              if (currentUrl !== newUrl) {
                router.push(newUrl);
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
            
            setRecommendation(data.recommendation);
            // Update URL with recommendation ID
            if (data.recommendation.recommendation_id && typeof window !== 'undefined') {
              const newUrl = `/portal/results?id=${data.recommendation.recommendation_id}`;
              const currentUrl = window.location.pathname + window.location.search;
              if (currentUrl !== newUrl) {
                router.push(newUrl);
              }
            }
          } else {
            const errorMessage = data.error || data.message || 'Failed to generate recommendation';
            console.error('❌ Invalid API response:', errorMessage);
            setError(errorMessage);
          }
        } catch (err: any) {
          console.error('Fetch error:', err);
          setError(err.message || 'An unexpected error occurred');
        } finally {
          setIsLoading(false);
        }
      } else {
        setError('No search query or recommendation ID provided');
        setIsLoading(false);
      }
    };

    fetchRecommendation();
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

  // Extract adjustments from ingredients
  const adjustments = recommendation.ingredients
    .filter((ing) => ing.adjustedDose && ing.adjustmentReason)
    .map((ing) => ({
      ingredient: ing.name,
      adjustment: ing.adjustedDose!,
      reason: ing.adjustmentReason!,
    }));

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
          <p className="text-gray-600">
            {t('results.based.on')} {recommendation.evidence_summary.totalStudies.toLocaleString()} {t('results.studies')}{' '}
            {recommendation.evidence_summary.totalParticipants.toLocaleString()} {t('results.participants')}
          </p>
        </div>

        {/* Evidence Analysis */}
        <div className="mb-8">
          <EvidenceAnalysisPanel evidenceSummary={recommendation.evidence_summary} />
        </div>

        {/* Personalization */}
        <div className="mb-8">
          <PersonalizationExplanation
            factors={recommendation.personalization_factors}
            adjustments={adjustments}
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

