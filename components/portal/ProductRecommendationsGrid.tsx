/**
 * Product Recommendations Grid
 * 3 product cards (Budget, Value, Premium) with BUY buttons
 * Conversion-optimized
 */

'use client';

import { ShoppingCart, ExternalLink, Star, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Product {
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
}

interface ProductRecommendationsGridProps {
  products?: Product[];
  onBuyClick?: (product: Product) => void;
  outboundSearch?: {
    url: string;
    domain: string;
    query: string;
  } | null;
  onOutboundClick?: (outbound: { url: string; domain: string; query: string }) => void;
}

const TIER_CONFIG = {
  budget: {
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    badgeKey: 'product.badges.budget',
  },
  value: {
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeKey: 'product.badges.value',
  },
  premium: {
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    badgeKey: 'product.badges.premium.ankonere',
  },
};

export default function ProductRecommendationsGrid({
  products,
  onBuyClick,
  outboundSearch,
  onOutboundClick,
}: ProductRecommendationsGridProps) {
  const t = useTranslations();
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];

  if (safeProducts.length === 0 && !outboundSearch) {
    return null;
  }

  if (safeProducts.length === 0 && outboundSearch) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{t('results.outbound.title')}</h2>
        <p className="text-sm md:text-base text-gray-600 mb-6">
          {t('results.outbound.desc')}
        </p>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('results.outbound.cardTitle')}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {t('results.outbound.cardDesc', { query: outboundSearch.query })}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {t('results.outbound.disclosure')}
              </p>
            </div>
            <button
              onClick={() => onOutboundClick?.(outboundSearch)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
            >
              {t('results.outbound.button')}
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleBuyClick = (product: Product) => {
    if (onBuyClick) {
      onBuyClick(product);
    } else {
      // Default behavior: open link
      const link = product.isAnkonere ? product.directLink : product.affiliateLink;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">{t('results.products.title')}</h2>
      <p className="text-sm md:text-base text-gray-600 mb-6">
        {t('results.products.desc')}
      </p>
      {safeProducts.some(product => product.isAffiliate || product.affiliateLink) && (
        <p className="text-xs text-gray-500 mb-6">
          {t('product.affiliate.disclosure')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {safeProducts.map((product) => {
          const config = TIER_CONFIG[product.tier];
          const isHighlighted = product.tier === 'premium' && !product.isAffiliate;
          const contains = Array.isArray(product.contains) ? product.contains : [];
          const badge = product.isAffiliate && product.tier === 'premium'
            ? t('product.premium')
            : t(config.badgeKey as any);
          const isIHerbAffiliate = product.affiliateProvider === 'iherb';

          return (
            <div
              key={product.tier}
              className={`relative rounded-xl border-2 ${isHighlighted ? 'border-purple-400 shadow-lg' : config.borderColor
                } ${config.bgColor} p-6 hover:shadow-xl transition-all ${isHighlighted ? 'ring-2 ring-purple-200' : ''
                }`}
            >
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.color} text-white`}
                >
                  {badge}
                </span>
              </div>

              {/* Tier Label */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(`product.${product.tier}` as any)}
                </h3>
                <h4 className="text-xl font-bold text-gray-900">{product.name}</h4>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {product.price > 0 ? (
                    `${product.currency} ${product.price.toLocaleString()}`
                  ) : isIHerbAffiliate ? (
                    t('product.price.iherb')
                  ) : product.isAffiliate ? (
                    t('product.price.affiliate')
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    t('product.price.consult' as any)
                  )}
                </div>
                {product.price > 0 ? (
                  <div className="text-sm text-gray-600">{t('product.per.month')}</div>
                ) : (
                  <div className="text-sm text-gray-600">{product.whereToBuy}</div>
                )}
              </div>

              {/* Contains */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('product.contains')}</p>
                <ul className="space-y-1">
                  {contains.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-6">{product.description}</p>

              {/* Where to Buy */}
              <div className="mb-4 text-xs text-gray-500">
                {t('product.available')} <span className="font-medium">{product.whereToBuy}</span>
              </div>

              {/* BUY Button */}
              <button
                onClick={() => handleBuyClick(product)}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r ${config.color} hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
              >
                <ShoppingCart className="h-5 w-5" />
                {product.isAnkonere ? t('product.buy.ankonere') : isIHerbAffiliate ? t('product.buy.iherb') : t('product.buy.affiliate')}
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* ANKONERE Badge */}
              {product.isAnkonere && (
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                    <Star className="h-3 w-3" />
                    {t('product.badges.premium.ankonere')}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
