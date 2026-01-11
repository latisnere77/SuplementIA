/**
 * Subscription Plans Component
 * Displays available subscription plans with pricing
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Gift } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { useTranslations } from 'next-intl';
import AuthModal from './AuthModal';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    recommendationsPerDay: number;
    accessToPremiumProducts: boolean;
    advancedComparisons: boolean;
    fullStudyAccess: boolean;
  };
}

export default function SubscriptionPlans() {
  const t = useTranslations();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [_selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/portal/subscription/plans');
        const data = await response.json();
        if (data.success) {
          setPlans(data.plans);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setSelectedPlan(planId);
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch('/api/portal/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          user_id: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId === 'free') return null;
    if (planId.includes('premium')) return Crown;
    if (planId.includes('annual')) return Gift;
    return Zap;
  };

  const getPlanColor = (planId: string) => {
    if (planId === 'free') return 'from-gray-500 to-gray-600';
    if (planId.includes('premium')) return 'from-purple-500 to-purple-600';
    if (planId.includes('annual')) return 'from-green-500 to-green-600';
    return 'from-blue-500 to-blue-600';
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.id);
          const color = getPlanColor(plan.id);
          const isPopular = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 ${isPopular ? 'border-blue-400 shadow-lg ring-2 ring-blue-200' : 'border-gray-200'
                } bg-white p-6 hover:shadow-xl transition-all`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                {Icon && (
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${color} mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600">/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
                </div>
                {plan.interval === 'year' && (
                  <p className="text-sm text-green-600 font-medium">Save 17%</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${plan.id === 'free'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : `bg-gradient-to-r ${color} text-white hover:opacity-90`
                  }`}
              >
                {plan.id === 'free' ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setSelectedPlan(null);
        }}
        initialMode="signin"
      />
    </>
  );
}

