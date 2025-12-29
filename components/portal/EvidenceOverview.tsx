/**
 * Evidence Overview Component
 * Displays objective research data instead of arbitrary letter grades
 *
 * Shows:
 * - Consensus: "X of Y studies show benefit"
 * - Research status: "N studies since XXXX | Most studied for: A, B"
 */

'use client';

import { Scale, BookOpen } from 'lucide-react';

interface EvidenceOverviewProps {
  // Study consensus data
  totalPositive: number;
  totalNegative: number;
  totalNeutral: number;

  // Research status
  totalStudies: number;
  researchSpanYears?: number;

  // Top conditions/uses studied
  topConditions: string[];

  // Optional: supplement name for display
  supplementName?: string;
}

/**
 * Calculate the total studies that show results (positive or negative)
 */
function getTotalWithResults(positive: number, negative: number, neutral: number): number {
  return positive + negative + neutral;
}

/**
 * Get the earliest year based on research span
 */
function getEarliestYear(researchSpanYears?: number): number {
  const currentYear = new Date().getFullYear();
  return researchSpanYears ? currentYear - researchSpanYears : currentYear - 5;
}

/**
 * Get color scheme based on consensus ratio
 */
function getConsensusStyle(positive: number, total: number): {
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
} {
  if (total === 0) {
    return {
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      textColor: 'text-gray-700',
      iconColor: 'text-gray-500',
    };
  }

  const ratio = positive / total;

  if (ratio >= 0.7) {
    return {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    };
  } else if (ratio >= 0.5) {
    return {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    };
  } else if (ratio >= 0.3) {
    return {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    };
  } else {
    return {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
    };
  }
}

/**
 * Evidence Overview - Objective research summary
 */
export default function EvidenceOverview({
  totalPositive,
  totalNegative,
  totalNeutral,
  totalStudies,
  researchSpanYears,
  topConditions,
  supplementName,
}: EvidenceOverviewProps) {
  const totalWithResults = getTotalWithResults(totalPositive, totalNegative, totalNeutral);
  const earliestYear = getEarliestYear(researchSpanYears);
  const consensusStyle = getConsensusStyle(totalPositive, totalWithResults);

  // Use totalStudies if we have it, otherwise use the sum of ranked studies
  const displayTotalStudies = totalStudies > 0 ? totalStudies : totalWithResults;

  return (
    <div className="space-y-3">
      {/* Line 1: Consensus */}
      <div
        className={`
          inline-flex items-center gap-3 rounded-lg border-2 px-4 py-3
          ${consensusStyle.bgColor} ${consensusStyle.borderColor}
        `}
      >
        <Scale className={`h-5 w-5 ${consensusStyle.iconColor}`} />
        <span className={`font-semibold ${consensusStyle.textColor}`}>
          {totalWithResults > 0 ? (
            <>
              {totalPositive} de {totalWithResults} estudios muestran beneficio
            </>
          ) : (
            <>Sin estudios con resultados clasificados</>
          )}
        </span>
      </div>

      {/* Line 2: Research Status + Top Conditions */}
      <div className="flex items-center gap-2 text-gray-600">
        <BookOpen className="h-4 w-4 text-gray-500" />
        <span className="text-sm">
          {displayTotalStudies > 0 ? (
            <>
              <strong>{displayTotalStudies}</strong> estudios desde {earliestYear}
            </>
          ) : (
            <>Investigación limitada</>
          )}
          {topConditions.length > 0 && (
            <>
              {' | '}
              <span className="text-gray-700">
                Más estudiado para: <strong>{topConditions.slice(0, 3).join(', ')}</strong>
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version for use in lists
 */
export function EvidenceOverviewCompact({
  totalPositive,
  totalNegative,
  totalNeutral,
  totalStudies,
}: Pick<EvidenceOverviewProps, 'totalPositive' | 'totalNegative' | 'totalNeutral' | 'totalStudies'>) {
  const totalWithResults = getTotalWithResults(totalPositive, totalNegative, totalNeutral);
  const displayTotalStudies = totalStudies > 0 ? totalStudies : totalWithResults;

  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-600">
      <Scale className="h-4 w-4" />
      {totalWithResults > 0 ? (
        <span>{totalPositive}/{totalWithResults} positivos</span>
      ) : (
        <span>{displayTotalStudies} estudios</span>
      )}
    </span>
  );
}
