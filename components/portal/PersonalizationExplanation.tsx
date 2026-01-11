/**
 * Personalization Explanation Component
 * 4 gradient cards showing adjustments made (Location/Altitude, Climate, Demographics, Budget)
 */

'use client';

import { MapPin, Cloud, Users, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PersonalizationFactors {
  altitude?: number;
  climate?: string;
  gender?: string;
  age?: number;
  location?: string;
}

interface PersonalizationExplanationProps {
  factors: PersonalizationFactors;
  adjustments?: Array<{
    ingredient: string;
    adjustment: string;
    reason: string;
  }>;
}

const FACTOR_CARDS = [
  {
    id: 'location',
    icon: MapPin,
    title: 'Location & Altitude',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'climate',
    icon: Cloud,
    title: 'Climate',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: 'demographics',
    icon: Users,
    title: 'Demographics',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'budget',
    icon: DollarSign,
    title: 'Budget Options',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
];

export default function PersonalizationExplanation({
  factors,
  adjustments = [],
}: PersonalizationExplanationProps) {
  const t = useTranslations();
  const getLocationDescription = () => {
    if (factors.altitude && factors.altitude > 2000) {
      return t('personalization.altitude.desc', { altitude: factors.altitude.toString() });
    }
    return t('personalization.altitude.standard');
  };

  const getClimateDescription = () => {
    if (factors.climate === 'tropical') {
      return t('personalization.climate.tropical');
    }
    return t('personalization.climate.temperate');
  };

  const getDemographicsDescription = () => {
    if (factors.gender && factors.age) {
      return t('personalization.demographics.desc', { gender: factors.gender, age: factors.age.toString() });
    }
    return t('personalization.demographics.standard');
  };

  const getBudgetDescription = () => {
    return t('personalization.budget.desc');
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">{t('results.personalization')}</h2>
      <p className="text-gray-600 mb-6">
        {t('results.personalization.desc')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {FACTOR_CARDS.map((card) => {
          const Icon = card.icon;
          let description = '';
          let impact = '';

          switch (card.id) {
            case 'location':
              description = getLocationDescription();
              impact = factors.altitude
                ? `Altitude: ${factors.altitude}m | Location: ${factors.location || 'N/A'}`
                : `Location: ${factors.location || 'N/A'}`;
              break;
            case 'climate':
              description = getClimateDescription();
              impact = `Climate: ${factors.climate || 'temperate'}`;
              break;
            case 'demographics':
              description = getDemographicsDescription();
              impact = `${factors.gender || 'N/A'} | Age: ${factors.age || 'N/A'}`;
              break;
            case 'budget':
              description = getBudgetDescription();
              impact = 'Multiple price points available';
              break;
          }

          return (
            <div
              key={card.id}
              className={`${card.bgColor} border-2 ${card.borderColor} rounded-xl p-6 hover:shadow-lg transition-shadow`}
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${card.color} mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`personalization.${card.id}` as any)}</h3>
              <p className="text-sm text-gray-700 mb-3">{description}</p>
              <div className="text-xs font-medium text-gray-600 bg-white/50 rounded px-2 py-1 inline-block">
                {impact}
              </div>
            </div>
          );
        })}
      </div>

      {/* Specific Adjustments */}
      {adjustments.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('personalization.adjustments')}</h3>
          <div className="space-y-3">
            {adjustments.map((adj, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{adj.ingredient}</p>
                    <p className="text-sm text-gray-600 mt-1">{adj.adjustment}</p>
                    <p className="text-xs text-gray-500 mt-1 italic">{adj.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

