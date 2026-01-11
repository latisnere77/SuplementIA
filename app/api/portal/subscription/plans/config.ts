/**
 * Subscription Plans Configuration
 * Moved to separate file to avoid Next.js route export restrictions
 */

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '1 recommendation per day',
      'Basic evidence summary',
      'Budget product recommendations only',
    ],
    limits: {
      recommendationsPerDay: 1,
      accessToPremiumProducts: false,
      advancedComparisons: false,
      fullStudyAccess: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    features: [
      'Unlimited recommendations',
      'Full evidence analysis',
      'All product tiers (Budget, Value, Premium)',
      'Advanced comparisons',
      'Full study access with PubMed links',
      'Result tracking (Week 4 & 8 check-ins)',
    ],
    limits: {
      recommendationsPerDay: -1, // Unlimited
      accessToPremiumProducts: true,
      advancedComparisons: true,
      fullStudyAccess: true,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    currency: 'USD',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly',
    features: [
      'Everything in Pro',
      'Priority support',
      'Early access to new features',
      'Custom health goal tracking',
      'ML-powered personalization',
      'Export recommendations to PDF',
    ],
    limits: {
      recommendationsPerDay: -1,
      accessToPremiumProducts: true,
      advancedComparisons: true,
      fullStudyAccess: true,
      prioritySupport: true,
      pdfExport: true,
    },
  },
  {
    id: 'annual_pro',
    name: 'Pro Annual',
    price: 99.99,
    currency: 'USD',
    interval: 'year',
    stripePriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
    features: [
      'Everything in Pro',
      'Save 17% (2 months free)',
    ],
    limits: {
      recommendationsPerDay: -1,
      accessToPremiumProducts: true,
      advancedComparisons: true,
      fullStudyAccess: true,
    },
  },
];

