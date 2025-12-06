/**
 * Benefit Studies Modal
 *
 * Shows a focused view of studies for a specific benefit.
 * Displays results organized by evidence grade (A-F) and
 * what works vs what doesn't work.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { filterByBenefit } from '@/lib/portal/benefit-study-filter';

interface BenefitStudiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplementName: string;
  benefitQuery: string;
  benefitQueryEs: string; // Spanish display name
}

interface BenefitEvidence {
  benefit: string;
  evidence_level: 'Fuerte' | 'Moderada' | 'Limitada' | 'Insuficiente';
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  studies_found: number;
  total_participants: number;
  summary: string;
}

interface BenefitData {
  worksFor: BenefitEvidence[];
  doesntWorkFor: BenefitEvidence[];
  limitedEvidence: BenefitEvidence[];
  totalStudies: number;
  totalParticipants: number;
}

const GRADE_COLORS = {
  'A': 'bg-green-100 text-green-800 border-green-300',
  'B': 'bg-green-50 text-green-700 border-green-200',
  'C': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'D': 'bg-orange-50 text-orange-700 border-orange-200',
  'E': 'bg-red-50 text-red-700 border-red-200',
  'F': 'bg-gray-50 text-gray-700 border-gray-200',
};

const EVIDENCE_LABELS = {
  'Fuerte': 'Evidencia Fuerte',
  'Moderada': 'Evidencia Moderada',
  'Limitada': 'Evidencia Limitada',
  'Insuficiente': 'Evidencia Insuficiente',
};

export default function BenefitStudiesModal({
  isOpen,
  onClose,
  supplementName,
  benefitQuery,
  benefitQueryEs,
}: BenefitStudiesModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BenefitData | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setData(null);
      setError(null);
      return;
    }

    // Fetch benefit-specific studies when modal opens
    const fetchBenefitStudies = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[Benefit Modal] Fetching studies:', {
          supplement: supplementName,
          benefit: benefitQuery,
          benefitEs: benefitQueryEs,
        });

        const response = await fetch('/api/portal/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: supplementName,
            benefitQuery, // Pass benefit query to backend
            age: 35,
            gender: 'male',
            location: 'CDMX',
            jobId: `benefit_modal_${Date.now()}`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudieron cargar los estudios`);
        }

        const result = await response.json();

        if (!result.success || !result.recommendation) {
          throw new Error('No se encontraron estudios para este beneficio');
        }

        // DEBUG: Log raw data structure
        console.log('[Benefit Modal] Raw recommendation structure:', {
          hasRecommendation: !!result.recommendation,
          hasSupplement: !!(result.recommendation?.supplement),
          hasStructuredBenefits: !!(result.recommendation?.supplement?.structured_benefits),
          hasEvidenceSummary: !!result.recommendation?.evidence_summary,
          supplementKeys: result.recommendation?.supplement ? Object.keys(result.recommendation.supplement) : [],
          evidenceSummaryKeys: result.recommendation?.evidence_summary ? Object.keys(result.recommendation.evidence_summary) : [],
        });

        console.log('[Benefit Modal] Structured benefits:', result.recommendation?.supplement?.structured_benefits);

        // Apply intelligent benefit filter with synonyms and scoring
        const filteredRecommendation = filterByBenefit(result.recommendation, benefitQuery);

        // Extract filtered data
        const supplement = filteredRecommendation.supplement || {};
        const structuredBenefits = supplement.structured_benefits || {};
        const evidenceSummary = filteredRecommendation.evidence_summary || {};

        console.log('[Benefit Modal] After filter - structuredBenefits:', {
          hasWorksFor: !!structuredBenefits.worksFor,
          worksForLength: structuredBenefits.worksFor?.length || 0,
          hasDoesntWorkFor: !!structuredBenefits.doesntWorkFor,
          doesntWorkForLength: structuredBenefits.doesntWorkFor?.length || 0,
        });

        // Get filtered benefits (already sorted by relevance score)
        const worksFor = structuredBenefits.worksFor || [];
        const doesntWorkFor = structuredBenefits.doesntWorkFor || [];
        const limitedEvidence = structuredBenefits.limitedEvidence || [];

        // Filter to show only items with relevance score > 0 (if any exist)
        const relevantWorksFor = worksFor.filter((item: any) => (item._relevanceScore || 0) > 0);
        const relevantDoesntWorkFor = doesntWorkFor.filter((item: any) => (item._relevanceScore || 0) > 0);
        const relevantLimitedEvidence = limitedEvidence.filter((item: any) => (item._relevanceScore || 0) > 0);

        // If we found relevant items, use only those. Otherwise show top 3 of each category
        const hasRelevantData = relevantWorksFor.length > 0 ||
                                relevantDoesntWorkFor.length > 0 ||
                                relevantLimitedEvidence.length > 0;

        setData({
          worksFor: hasRelevantData ? relevantWorksFor : worksFor.slice(0, 3),
          doesntWorkFor: hasRelevantData ? relevantDoesntWorkFor : doesntWorkFor.slice(0, 3),
          limitedEvidence: hasRelevantData ? relevantLimitedEvidence : limitedEvidence.slice(0, 3),
          totalStudies: evidenceSummary.totalStudies || 0,
          totalParticipants: evidenceSummary.totalParticipants || 0,
        });

        console.log('[Benefit Modal] Data loaded:', {
          worksFor: hasRelevantData ? relevantWorksFor.length : worksFor.slice(0, 3).length,
          doesntWorkFor: hasRelevantData ? relevantDoesntWorkFor.length : doesntWorkFor.slice(0, 3).length,
          limitedEvidence: hasRelevantData ? relevantLimitedEvidence.length : limitedEvidence.slice(0, 3).length,
          hasRelevantData,
        });
      } catch (err: any) {
        console.error('[Benefit Modal] Error:', err);
        setError(err.message || 'Error al cargar los estudios');
      } finally {
        setLoading(false);
      }
    };

    fetchBenefitStudies();
  }, [isOpen, supplementName, benefitQuery, benefitQueryEs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {supplementName} para {benefitQueryEs}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Estudios científicos específicos sobre este beneficio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">Buscando estudios científicos...</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              {/* Summary */}
              {data.totalStudies > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    Basado en <strong>{data.totalStudies.toLocaleString()}</strong> estudios científicos
                    {data.totalParticipants > 0 && (
                      <> con <strong>{data.totalParticipants.toLocaleString()}</strong> participantes</>
                    )}
                  </p>
                </div>
              )}

              {/* Works For (Positive Evidence) */}
              {data.worksFor.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      ✅ Efectos Positivos
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {data.worksFor.map((item, idx) => (
                      <BenefitCard key={idx} item={item} type="positive" />
                    ))}
                  </div>
                </div>
              )}

              {/* Doesn't Work For (Negative Evidence) */}
              {data.doesntWorkFor.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      ❌ Sin Efectos / Efectos Negativos
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {data.doesntWorkFor.map((item, idx) => (
                      <BenefitCard key={idx} item={item} type="negative" />
                    ))}
                  </div>
                </div>
              )}

              {/* Limited Evidence */}
              {data.limitedEvidence.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      ⚠️ Evidencia Limitada
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {data.limitedEvidence.map((item, idx) => (
                      <BenefitCard key={idx} item={item} type="limited" />
                    ))}
                  </div>
                </div>
              )}

              {/* No data found */}
              {data.worksFor.length === 0 &&
                data.doesntWorkFor.length === 0 &&
                data.limitedEvidence.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">
                      No se encontraron estudios para este suplemento
                    </p>
                    <p className="text-sm text-gray-500">
                      Esto puede significar que aún no hay suficientes estudios científicos publicados
                      sobre {supplementName.toLowerCase()} y {benefitQueryEs.toLowerCase()}.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Benefit Card Component
function BenefitCard({
  item,
  type,
}: {
  item: BenefitEvidence;
  type: 'positive' | 'negative' | 'limited';
}) {
  const grade = item.grade || 'F';
  const gradeColor = GRADE_COLORS[grade];
  const evidenceLabel = EVIDENCE_LABELS[item.evidence_level] || item.evidence_level;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-900 flex-1">{item.benefit}</h4>
        <span
          className={`px-3 py-1 rounded-full text-sm font-bold border ${gradeColor}`}
        >
          Grado {grade}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{item.summary}</p>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">{evidenceLabel}</span>
        </div>
        {item.studies_found > 0 && (
          <div className="flex items-center gap-1">
            <span>📊 {item.studies_found} estudios</span>
          </div>
        )}
        {item.total_participants > 0 && (
          <div className="flex items-center gap-1">
            <span>👥 {item.total_participants.toLocaleString()} participantes</span>
          </div>
        )}
      </div>
    </div>
  );
}
