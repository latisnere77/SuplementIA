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
  recommendation?: any; // Pass existing recommendation data instead of fetching new
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
  recommendation: passedRecommendation,
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

    // Process benefit-specific studies when modal opens
    const processBenefitStudies = () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[Benefit Modal] Processing studies:', {
          supplement: supplementName,
          benefit: benefitQuery,
          benefitEs: benefitQueryEs,
          hasRecommendation: !!passedRecommendation,
        });

        // Use passed recommendation data (already loaded in parent)
        if (!passedRecommendation) {
          throw new Error('No hay datos de recomendación disponibles');
        }

        // Try to get data from multiple sources
        const recommendation = passedRecommendation;
        const evidenceSummary = recommendation.evidence_summary || {};

        // CORRECT PATH: Data is in supplement.worksFor, NOT supplement.structured_benefits.worksFor
        const supplement = recommendation.supplement || {};

        let worksFor = supplement.worksFor || [];
        let doesntWorkFor = supplement.doesntWorkFor || [];
        let limitedEvidence = supplement.limitedEvidence || [];

        // Source 2: If structured_benefits is empty, try to extract from raw studies
        if (worksFor.length === 0 && doesntWorkFor.length === 0 && limitedEvidence.length === 0) {
          const metadata = (recommendation as any)._enrichment_metadata || {};
          const studies = metadata.studies || {};
          const positiveStudies = studies.ranked?.positive || studies.all || [];
          const negativeStudies = studies.ranked?.negative || [];

          // Convert raw studies to benefit format
          if (positiveStudies.length > 0) {
            worksFor = positiveStudies.slice(0, 5).map((study: any, idx: number) => ({
              benefit: study.title || `Estudio ${idx + 1}`,
              evidence_level: 'Moderada' as const,
              grade: 'B' as const,
              studies_found: 1,
              total_participants: study.participants || 0,
              summary: study.abstract || study.conclusion || 'Ver estudio completo para más detalles',
            }));
          }

          if (negativeStudies.length > 0) {
            doesntWorkFor = negativeStudies.slice(0, 3).map((study: any, idx: number) => ({
              benefit: study.title || `Estudio ${idx + 1}`,
              evidence_level: 'Limitada' as const,
              grade: 'D' as const,
              studies_found: 1,
              total_participants: study.participants || 0,
              summary: study.abstract || study.conclusion || 'Ver estudio completo para más detalles',
            }));
          }
        }

        // Apply benefit filter if we have data
        if (worksFor.length > 0 || doesntWorkFor.length > 0) {
          // Apply intelligent filtering
          // filterByBenefit expects structured_benefits, so we need to create that structure
          const tempRecommendation = {
            ...recommendation,
            supplement: {
              ...supplement,
              structured_benefits: {
                worksFor: worksFor.map((item: any) => ({
                  benefit: item.condition || item.use || item.benefit || '',
                  evidence_level: item.evidenceLevel || 'Moderada',
                  grade: item.grade || 'C',
                  studies_found: item.studyCount || 0,
                  total_participants: 0,
                  summary: item.description || item.notes || '',
                })),
                doesntWorkFor: doesntWorkFor.map((item: any) => ({
                  benefit: item.condition || item.use || item.benefit || '',
                  evidence_level: item.evidenceLevel || 'Limitada',
                  grade: item.grade || 'D',
                  studies_found: item.studyCount || 0,
                  total_participants: 0,
                  summary: item.description || item.notes || '',
                })),
                limitedEvidence: limitedEvidence.map((item: any) => ({
                  benefit: item.condition || item.use || item.benefit || '',
                  evidence_level: 'Limitada',
                  grade: item.grade || 'C',
                  studies_found: item.studyCount || 0,
                  total_participants: 0,
                  summary: item.description || item.notes || '',
                })),
              },
            },
          };

          const filtered = filterByBenefit(tempRecommendation, benefitQuery);
          const filteredBenefits = filtered.supplement?.structured_benefits || {};

          // Convert back to BenefitEvidence format
          worksFor = (filteredBenefits.worksFor || []).map((item: any) => ({
            benefit: item.benefit,
            evidence_level: item.evidence_level,
            grade: item.grade,
            studies_found: item.studies_found,
            total_participants: item.total_participants,
            summary: item.summary,
          }));

          doesntWorkFor = (filteredBenefits.doesntWorkFor || []).map((item: any) => ({
            benefit: item.benefit,
            evidence_level: item.evidence_level,
            grade: item.grade,
            studies_found: item.studies_found,
            total_participants: item.total_participants,
            summary: item.summary,
          }));

          limitedEvidence = (filteredBenefits.limitedEvidence || []).map((item: any) => ({
            benefit: item.benefit,
            evidence_level: item.evidence_level,
            grade: item.grade,
            studies_found: item.studies_found,
            total_participants: item.total_participants,
            summary: item.summary,
          }));

          // Filter by relevance score
          const relevantWorksFor = worksFor.filter((item: any) => (item._relevanceScore || 0) > 0);
          const relevantDoesntWorkFor = doesntWorkFor.filter((item: any) => (item._relevanceScore || 0) > 0);
          const relevantLimitedEvidence = limitedEvidence.filter((item: any) => (item._relevanceScore || 0) > 0);

          const hasRelevantData = relevantWorksFor.length > 0 ||
                                  relevantDoesntWorkFor.length > 0 ||
                                  relevantLimitedEvidence.length > 0;

          worksFor = hasRelevantData ? relevantWorksFor : worksFor.slice(0, 3);
          doesntWorkFor = hasRelevantData ? relevantDoesntWorkFor : doesntWorkFor.slice(0, 3);
          limitedEvidence = hasRelevantData ? relevantLimitedEvidence : limitedEvidence.slice(0, 3);
        }

        setData({
          worksFor,
          doesntWorkFor,
          limitedEvidence,
          totalStudies: evidenceSummary.totalStudies || 0,
          totalParticipants: evidenceSummary.totalParticipants || 0,
        });
      } catch (err: any) {
        console.error('[Benefit Modal] Error:', err);
        setError(err.message || 'Error al cargar los estudios');
      } finally {
        setLoading(false);
      }
    };

    processBenefitStudies();
  }, [isOpen, supplementName, benefitQuery, benefitQueryEs, passedRecommendation]);

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

              {/* No data found - Show debug info */}
              {data.worksFor.length === 0 &&
                data.doesntWorkFor.length === 0 &&
                data.limitedEvidence.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">
                      No se encontraron beneficios estructurados
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Hay {data.totalStudies} estudios disponibles, pero están en formato raw (sin estructurar).
                    </p>

                    {/* DEBUG: Show what data we have */}
                    <details className="text-left bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                      <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                        🔍 Debug: Ver estructura de datos
                      </summary>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-96 whitespace-pre-wrap">
                        {JSON.stringify({
                          hasRecommendation: !!passedRecommendation,
                          hasSupplement: !!(passedRecommendation?.supplement),
                          hasWorksFor: !!(passedRecommendation?.supplement?.worksFor),
                          worksForLength: passedRecommendation?.supplement?.worksFor?.length || 0,
                          doesntWorkForLength: passedRecommendation?.supplement?.doesntWorkFor?.length || 0,
                          limitedEvidenceLength: passedRecommendation?.supplement?.limitedEvidence?.length || 0,
                          hasMetadata: !!(passedRecommendation as any)?._enrichment_metadata,
                          hasStudies: !!(passedRecommendation as any)?._enrichment_metadata?.studies,
                          supplementKeys: passedRecommendation?.supplement
                            ? Object.keys(passedRecommendation.supplement).slice(0, 10)
                            : [],
                        }, null, 2)}
                      </pre>
                    </details>

                    <p className="text-sm text-gray-500">
                      Por favor toma un screenshot de la sección Debug arriba y compártela con el desarrollador.
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
