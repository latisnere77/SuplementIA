/**
 * Check-In Form Component
 * Week 4 & 8 engagement surveys
 * Captures efficacy, satisfaction, side effects
 */

'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface CheckInFormProps {
  recommendationId: string;
  weekNumber: 4 | 8;
  onSubmit: (data: {
    rating: number;
    notes: string;
    efficacy_score?: number;
    satisfaction?: number;
    side_effects?: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function CheckInForm({
  recommendationId,
  weekNumber,
  onSubmit,
  isLoading = false,
}: CheckInFormProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [efficacyScore, setEfficacyScore] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [sideEffects, setSideEffects] = useState<string[]>([]);

  // Side effects will be translated in the component
  const sideEffectOptions = [
    'checkin.side.effects.none',
    'checkin.side.effects.mild.nausea',
    'checkin.side.effects.headache',
    'checkin.side.effects.dizziness',
    'checkin.side.effects.digestive',
    'checkin.side.effects.other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please provide a rating');
      return;
    }

    await onSubmit({
      rating,
      notes,
      efficacy_score: efficacyScore || undefined,
      satisfaction: satisfaction || undefined,
      side_effects: sideEffects.length > 0 ? sideEffects : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('checkin.title', { week: weekNumber.toString() })}</h2>
      <p className="text-gray-600 mb-6">
        {t('checkin.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('checkin.rating')} <span className="text-red-500">{t('checkin.rating.required')}</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-2 rounded-lg transition-colors ${
                  star <= rating
                    ? 'text-yellow-400 bg-yellow-50'
                    : 'text-gray-300 hover:text-yellow-300'
                }`}
              >
                <Star className="h-8 w-8 fill-current" />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-gray-600">
                {rating === 5
                  ? t('checkin.rating.excellent')
                  : rating === 4
                    ? t('checkin.rating.good')
                    : rating === 3
                      ? t('checkin.rating.okay')
                      : rating === 2
                        ? t('checkin.rating.poor')
                        : t('checkin.rating.very.poor')}
              </span>
            )}
          </div>
        </div>

        {/* Efficacy Score (Week 8 only) */}
        {weekNumber === 8 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('checkin.efficacy')}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={efficacyScore || 5}
              onChange={(e) => setEfficacyScore(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{t('checkin.efficacy.not')}</span>
              <span className="font-medium">{efficacyScore || 5}/10</span>
              <span>{t('checkin.efficacy.very')}</span>
            </div>
          </div>
        )}

        {/* Satisfaction (Week 8 only) */}
        {weekNumber === 8 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('checkin.satisfaction')}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={satisfaction || 5}
              onChange={(e) => setSatisfaction(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{t('checkin.satisfaction.not')}</span>
              <span className="font-medium">{satisfaction || 5}/10</span>
              <span>{t('checkin.satisfaction.very')}</span>
            </div>
          </div>
        )}

        {/* Side Effects */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('checkin.side.effects')}</label>
          <div className="flex flex-wrap gap-2">
            {sideEffectOptions.map((effect) => (
              <button
                key={effect}
                type="button"
                onClick={() => {
                  if (effect === 'checkin.side.effects.none') {
                    setSideEffects([]);
                  } else {
                    setSideEffects((prev) =>
                      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
                    );
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sideEffects.includes(effect) || (effect === 'checkin.side.effects.none' && sideEffects.length === 0)
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300'
                }`}
              >
                {t(effect as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('checkin.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('checkin.notes.placeholder')}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || rating === 0}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              {t('checkin.submitting')}
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              {t('checkin.submit')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

