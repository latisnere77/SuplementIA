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
  displaySupplementName?: string;
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

function mapItems(items: any[], defaultLevel: BenefitEvidence['evidence_level'], defaultGrade: BenefitEvidence['grade']): BenefitEvidence[] {
  return items.map((item: any) => ({
    benefit: item.condition || item.benefit || '',
    evidence_level: item.evidenceLevel || item.evidence_level || defaultLevel,
    grade: item.evidenceGrade || item.grade || defaultGrade,
    studies_found: item.studyCount || item.studies_found || 0,
    total_participants: item.totalParticipants || item.total_participants || 0,
    summary: item.notes || item.summary || item.description || '',
  }));
}

function recommendationToBenefitData(recommendation: any, benefitQuery?: string): BenefitData | null {
  if (!recommendation) return null;

  const filtered = benefitQuery ? filterByBenefit(recommendation, benefitQuery) : recommendation;
  const supplement = filtered?.supplement || {};
  const data = filtered?.data || {};
  const evidenceSummary = filtered?.evidence_summary || {};

  const rawWorksFor = data.worksFor || supplement.worksFor || [];
  const rawDoesntWorkFor = data.doesntWorkFor || supplement.doesntWorkFor || [];
  const rawLimitedEvidence = data.limitedEvidence || supplement.limitedEvidence || [];

  return {
    worksFor: mapItems(rawWorksFor, 'Moderada', 'B'),
    doesntWorkFor: mapItems(rawDoesntWorkFor, 'Limitada', 'D'),
    limitedEvidence: mapItems(rawLimitedEvidence, 'Limitada', 'C'),
    totalStudies: data.totalStudies || evidenceSummary.totalStudies || 0,
    totalParticipants: evidenceSummary.totalParticipants || 0,
  };
}

function getControlledBenefitError(status?: number): string {
  if (status === 503) {
    return 'La consulta por tema está temporalmente limitada. Mostramos la evidencia disponible en la ficha principal cuando es posible.';
  }

  return 'No pudimos cargar evidencia adicional por tema en este momento. Revisa la ficha principal o intenta de nuevo más tarde.';
}

export default function BenefitStudiesModal({
  isOpen,
  onClose,
  supplementName,
  displaySupplementName,
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

    // Fetch benefit-specific studies from backend
    const fetchBenefitStudies = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[Benefit Modal] Fetching benefit-specific studies:', {
          supplement: supplementName,
          benefit: benefitQuery,
          benefitEs: benefitQueryEs,
        });

        // Make API call with benefitQuery to get filtered results
        const response = await fetch('/api/portal/enrich-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplementName: supplementName,
            benefitQuery: benefitQuery, // This is the key - backend will filter studies
            maxStudies: 30, // Request more results to catch older studies
            category: supplementName,
          }),
        });

        const apiData = await response.json();

        if (!response.ok) {
          throw new Error(getControlledBenefitError(response.status));
        }

        if (!apiData.success) {
          throw new Error(getControlledBenefitError());
        }

        setData(recommendationToBenefitData(apiData, undefined));
      } catch (err: any) {
        console.error('[Benefit Modal] Error:', err);
        const fallbackData = recommendationToBenefitData(passedRecommendation, benefitQuery);
        if (fallbackData) {
          setData(fallbackData);
        }
        setError(err.message || getControlledBenefitError());
      } finally {
        setLoading(false);
      }
    };

    fetchBenefitStudies();
  }, [isOpen, supplementName, benefitQuery, benefitQueryEs, passedRecommendation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {displaySupplementName || supplementName} para {benefitQueryEs}
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
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Consulta por tema limitada</p>
                <p className="text-sm text-amber-800">{error}</p>
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

              {/* No data found - Show helpful message */}
              {data.worksFor.length === 0 &&
                data.doesntWorkFor.length === 0 &&
                data.limitedEvidence.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-gray-900 font-bold text-lg mb-2">
                      No encontramos estudios específicos de {supplementName} para {benefitQueryEs}
                    </p>
                    <p className="text-gray-600 mb-4">
                      Nuestra base de datos tiene {data.totalStudies} estudios sobre {displaySupplementName || supplementName},
                      pero ninguno enfocado específicamente en {benefitQueryEs.toLowerCase()}.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left max-w-lg mx-auto">
                      <p className="text-sm text-blue-900 font-medium mb-2">💡 ¿Qué puedes hacer?</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Cierra este popup y revisa todos los beneficios disponibles de {displaySupplementName || supplementName}</li>
                        <li>• Busca otros suplementos que SÍ tengan estudios para {benefitQueryEs.toLowerCase()}</li>
                        <li>• Consulta fuentes científicas globales directamente</li>
                      </ul>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      Nota: Aunque {supplementName} puede tener beneficios para {benefitQueryEs.toLowerCase()}
                      (es un uso popular), nuestra base de datos aún no incluye estudios científicos específicos sobre esta combinación.
                    </p>

                    <p className="text-sm text-gray-500">
                      Esta vista no debe interpretarse como recomendación de uso. Es una herramienta para explorar cómo está organizada la evidencia disponible.
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

  // Quality indicator (traffic light)
  const getQualityIndicator = () => {
    const studyCount = item.studies_found || 0;
    const participants = item.total_participants || 0;

    // High quality: Grade A-B, many studies, many participants
    if ((grade === 'A' || grade === 'B') && studyCount >= 10 && participants >= 500) {
      return { color: 'bg-green-500', label: 'Alta Calidad', emoji: '🟢' };
    }
    // Medium quality: Grade B-C, moderate studies
    if ((grade === 'B' || grade === 'C') && studyCount >= 3) {
      return { color: 'bg-yellow-500', label: 'Calidad Moderada', emoji: '🟡' };
    }
    // Low quality: Grade D-F or few studies
    return { color: 'bg-orange-500', label: 'Evidencia Limitada', emoji: '🟠' };
  };

  const quality = getQualityIndicator();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{item.benefit}</h4>
          {/* Quality indicator */}
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${quality.color}`} />
            <span className="text-xs font-medium text-gray-600">{quality.label}</span>
          </div>
        </div>
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
