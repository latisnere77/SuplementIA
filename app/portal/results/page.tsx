/**
 * Portal Results Page
 * Displays evidence analysis, personalization, and product recommendations
 */

'use client';

// This is a client component that requires search params
// No need for dynamic export - client components are dynamic by default

import { useEffect, useState } from 'react';
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

export default function ResultsPage() {
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
          const response = await fetch(`/api/portal/recommendation/${recommendationId}`);
          const data = await response.json();
          if (data.success) {
            setRecommendation(data.recommendation);
          } else {
            setError(data.error || 'Failed to load recommendation');
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      } else if (query) {
        // Generate new recommendation from search query
        try {
          // Map query to category (simplified - in production, use NLP)
          // Support both English and Spanish
          const categoryMap: Record<string, string> = {
            // English
            'muscle': 'muscle-gain',
            'muscle gain': 'muscle-gain',
            'build muscle': 'muscle-gain',
            'gain muscle': 'muscle-gain',
            'cognitive': 'cognitive',
            'memory': 'cognitive',
            'focus': 'cognitive',
            'brain': 'cognitive',
            'sleep': 'sleep',
            'immune': 'immune',
            'immunity': 'immune',
            'heart': 'heart',
            'cardiovascular': 'heart',
            'fat loss': 'fat-loss',
            'weight loss': 'fat-loss',
            'lose weight': 'fat-loss',
            // Spanish
            'musculo': 'muscle-gain',
            'ganar musculo': 'muscle-gain',
            'construir musculo': 'muscle-gain',
            'músculo': 'muscle-gain',
            'cognitivo': 'cognitive',
            'memoria': 'cognitive',
            'enfoque': 'cognitive',
            'cerebro': 'cognitive',
            'sueño': 'sleep',
            'dormir': 'sleep',
            'inmune': 'immune',
            'inmunidad': 'immune',
            'corazón': 'heart',
            'perder peso': 'fat-loss',
            'bajar de peso': 'fat-loss',
            'grasa': 'fat-loss',
          };

          const normalizedQuery = query.toLowerCase().trim();
          const category = categoryMap[normalizedQuery] || 'muscle-gain';

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
            console.error('API Error:', response.status, errorText);
            setError(`Error ${response.status}: ${errorText || 'Failed to generate recommendation'}`);
            setIsLoading(false);
            return;
          }

          const data = await response.json();
          console.log('API Response:', data);
          
          if (data.success && data.recommendation) {
            // Validate recommendation structure
            if (!data.recommendation.recommendation_id) {
              data.recommendation.recommendation_id = `rec_${Date.now()}`;
            }
            if (!data.recommendation.quiz_id) {
              data.recommendation.quiz_id = data.quiz_id || `quiz_${Date.now()}`;
            }
            
            setRecommendation(data.recommendation);
            // Update URL with recommendation ID (use push instead of replace to avoid navigation issues)
            if (data.recommendation.recommendation_id && typeof window !== 'undefined') {
              const newUrl = `/portal/results?id=${data.recommendation.recommendation_id}`;
              // Only update URL if it's different to avoid infinite loops
              const currentUrl = window.location.pathname + window.location.search;
              if (currentUrl !== newUrl) {
                router.push(newUrl);
              }
            }
          } else {
            setError(data.error || 'Failed to generate recommendation');
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
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

