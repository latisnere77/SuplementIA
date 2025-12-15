/**
 * Evidence Analysis Panel
 * Shows study stats, ingredient grades, and scientific links
 * Academic credibility aesthetic
 */

'use client';

import { useState } from 'react';
import { BookOpen, Users, TrendingUp, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IngredientBadges } from './IngredientBadges';

interface EvidenceSummary {
  totalStudies: number;
  totalParticipants: number;
  efficacyPercentage: number;
  researchSpanYears: number;
  ingredients: Array<{
    name: string;
    grade: 'A' | 'B' | 'C';
    studyCount: number;
    rctCount: number;
    evidenceGrade?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    evidenceConfidence?: number;
    synergy_score?: number;
    synergy_partner_count?: number;
    ml_boost?: number;
    clinical_evidence_strength?: number;
  }>;
}

interface EvidenceAnalysisPanelProps {
  evidenceSummary: EvidenceSummary;
  onViewStudies?: (ingredientName: string) => void;
}

const GRADE_COLORS = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const GRADE_LABELS = {
  A: 'Strong Evidence (RCTs)',
  B: 'Moderate Evidence',
  C: 'Emerging Evidence',
};

export default function EvidenceAnalysisPanel({
  evidenceSummary,
  onViewStudies,
}: EvidenceAnalysisPanelProps) {
  const t = useTranslations();
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('results.evidence.summary')}</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">{t('evidence.studies')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{evidenceSummary.totalStudies.toLocaleString()}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">{t('evidence.participants')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {evidenceSummary.totalParticipants.toLocaleString()}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">{t('evidence.efficacy')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{evidenceSummary.efficacyPercentage}%</div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">{t('evidence.research.span')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{evidenceSummary.researchSpanYears} {t('evidence.years')}</div>
        </div>
      </div>

      {/* Ingredient Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('results.ingredient.grades')}</h3>
        {evidenceSummary.ingredients.map((ingredient) => (
          <div
            key={ingredient.name}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h4 className="text-lg font-semibold text-gray-900">{ingredient.name}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${GRADE_COLORS[ingredient.grade]}`}
                  >
                    {t('evidence.grade')} {ingredient.grade}
                  </span>
                  {/* Badges with real data */}
                  <IngredientBadges
                    ingredient={{
                      evidenceGrade: ingredient.evidenceGrade || ingredient.grade,
                      evidenceConfidence: ingredient.evidenceConfidence,
                      synergy_score: ingredient.synergy_score,
                      synergy_partner_count: ingredient.synergy_partner_count,
                      ml_boost: ingredient.ml_boost,
                      clinical_evidence_strength: ingredient.clinical_evidence_strength,
                      studyCount: ingredient.studyCount,
                      rctCount: ingredient.rctCount,
                    }}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-2">{t(`evidence.grade.${ingredient.grade.toLowerCase()}` as any)}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{ingredient.studyCount} {t('evidence.studies').toLowerCase()}</span>
                  {ingredient.rctCount > 0 && (
                    <span className="text-green-600 font-medium">{ingredient.rctCount} {t('evidence.rcts')}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setExpandedIngredient(
                    expandedIngredient === ingredient.name ? null : ingredient.name
                  );
                  if (onViewStudies) {
                    onViewStudies(ingredient.name);
                  }
                }}
                className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {expandedIngredient === ingredient.name ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>

            {expandedIngredient === ingredient.name && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  {t('evidence.view.studies')} {ingredient.studyCount} {t('evidence.studies').toLowerCase()} {t('common.for')} {ingredient.name}
                </p>
                {/* External link removed to protect source data */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

