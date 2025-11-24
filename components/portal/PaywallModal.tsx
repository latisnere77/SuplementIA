/**
 * Paywall Modal Component
 * Stripe subscription CTA for Pro features
 * Conversion-optimized
 */

'use client';

import { X, Check, Zap, Lock, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import AuthModal from './AuthModal';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => Promise<void> | void;
}

const PRO_BENEFITS = [
  {
    icon: Zap,
    title: 'Unlimited Recommendations',
    description: 'Get personalized recommendations for any health goal',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Comparisons',
    description: 'Compare products side-by-side with detailed analysis',
  },
  {
    icon: Lock,
    title: 'Full Study Access',
    description: 'Access all study details and PubMed links',
  },
  {
    icon: Check,
    title: 'Result Tracking',
    description: 'Track your progress with week 4 & 8 check-ins',
  },
];

export default function PaywallModal({ isOpen, onClose, onSubscribe }: PaywallModalProps) {
  const { user } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSubscribing(true);
    try {
      await onSubscribe();
    } catch (error) {
      console.error('Subscribe error:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">Unlock Pro Features</h2>
          <p className="text-blue-100">Get personalized, evidence-based recommendations</p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Price */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <div className="text-5xl font-bold text-gray-900">$9.99</div>
              <div className="text-gray-600">per month</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            {PRO_BENEFITS.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                    <p className="text-sm text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubscribing ? 'Processing...' : 'Subscribe Pro - $9.99/month'}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Cancel anytime • No commitment • Secure payment via Stripe
            </p>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  );
}

