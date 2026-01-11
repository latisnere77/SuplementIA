/**
 * Subscription Plans Page
 * Shows all available subscription plans
 */

'use client';

import SubscriptionPlans from '@/components/portal/SubscriptionPlans';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function SubscriptionPage() {
  const { t: _t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Select the plan that best fits your health optimization needs
          </p>
        </div>

        <SubscriptionPlans />
      </div>
    </div>
  );
}

