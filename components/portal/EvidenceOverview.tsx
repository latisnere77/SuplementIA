/**
 * Evidence Overview Component
 * Displays objective research data instead of arbitrary letter grades
 *
 * Shows:
 * - Total studies count
 * - Top conditions/uses studied
 */

'use client';

import { BookOpen } from 'lucide-react';

interface EvidenceOverviewProps {
  // Research status
  totalStudies: number;
  labelOverride?: string;
  countOverride?: number;
  countLabelOverride?: string;

  // Top conditions/uses studied
  topConditions: string[];

  // Optional: supplement name for display
  supplementName?: string;
  language?: 'en' | 'es';
}

/**
 * Evidence Overview - Objective research summary
 */
export default function EvidenceOverview({
  totalStudies,
  labelOverride,
  countOverride,
  countLabelOverride,
  topConditions,
  language = 'es',
}: EvidenceOverviewProps) {
  const labels = language === 'en'
    ? {
      studies: 'scientific studies',
      limited: 'Limited research',
      mostStudied: 'Most studied for:',
      researchBrief: 'Research brief',
    }
    : {
      studies: 'estudios científicos',
      limited: 'Investigación limitada',
      mostStudied: 'Más estudiado para:',
      researchBrief: 'Ficha investigativa',
    };
  const shouldShowOverrideCount = typeof countOverride === 'number' && countOverride > 0;
  const overviewText = shouldShowOverrideCount
    ? `${countOverride.toLocaleString()} ${countLabelOverride || labels.studies}`
    : labelOverride || (totalStudies > 0 ? `${totalStudies.toLocaleString()} ${labels.studies}` : labels.limited);

  return (
    <div className="space-y-2">
      {/* Line 1: Total Studies */}
      <div className="inline-flex items-center gap-3 rounded-lg border-2 px-4 py-3 bg-blue-50 border-blue-300">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-blue-800">
          {overviewText}
        </span>
      </div>

      {/* Line 2: Top Conditions */}
      {topConditions.length > 0 && (
        <div className="text-sm text-gray-600">
          <span className="text-gray-700">
            {labels.mostStudied} <strong>{topConditions.slice(0, 3).join(', ')}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in lists
 */
export function EvidenceOverviewCompact({
  totalStudies,
  language = 'es',
}: Pick<EvidenceOverviewProps, 'totalStudies' | 'language'>) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-600">
      <BookOpen className="h-4 w-4" />
      <span>{totalStudies.toLocaleString()} {language === 'en' ? 'studies' : 'estudios'}</span>
    </span>
  );
}
