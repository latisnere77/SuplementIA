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
}

interface ProductRecommendationsGridProps {
  products: Product[];
  onBuyClick?: (product: Product) => void;
}

const TIER_CONFIG = {
  budget: {
    label: 'Budget',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    badge: 'Best Value',
  },
  value: {
    label: 'Value',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badge: 'Recommended',
  },
  premium: {
    label: 'Premium',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    badge: 'ANKONERE',
  },
};

export default function ProductRecommendationsGrid({
  products,
  onBuyClick,
}: ProductRecommendationsGridProps) {
  const t = useTranslations();
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('results.products.title')}</h2>
      <p className="text-gray-600 mb-6">
        {t('results.products.desc')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => {
          const config = TIER_CONFIG[product.tier];
          const isHighlighted = product.tier === 'premium';

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
                  {config.badge}
                </span>
              </div>

              {/* Tier Label */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  {t(`product.${product.tier}` as any)} {t('common.option')}
                </h3>
                <h4 className="text-xl font-bold text-gray-900">{product.name}</h4>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {product.price > 0 ? (
                    `${product.currency} ${product.price.toLocaleString()}`
                  ) : (
                    t('product.price.consult' as any)
                  )}
                </div>
                <div className="text-sm text-gray-600">{t('product.per.month')}</div>
              </div>

              {/* Contains */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t('product.contains')}</p>
                <ul className="space-y-1">
                  {product.contains.map((ingredient, index) => (
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
                {product.isAnkonere ? t('product.buy.ankonere') : t('product.buy.amazon')}
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* ANKONERE Badge */}
              {product.isAnkonere && (
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                    <Star className="h-3 w-3" />
                    {t('product.premium.badge')}
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

