/**
 * Ranking Analysis Panel Component
 * Displays intelligent analysis of studies with ranked results
 * Shows top positive and negative studies with confidence scores
 */

import React from 'react';

interface RankedStudy {
  pmid: string;
  title: string;
  authors?: string;
  year?: number;
  journal?: string;
  score?: number;
}

interface RankingMetadata {
  confidenceScore?: number;
  consensus?: string;
  analysisDate?: string;
}

interface RankingData {
  positive?: RankedStudy[];
  negative?: RankedStudy[];
  mixed?: RankedStudy[];
  metadata?: RankingMetadata;
}

interface RankingAnalysisPanelProps {
  ranking?: RankingData;
  supplementName: string;
}

const RankingAnalysisPanel: React.FC<RankingAnalysisPanelProps> = ({
  ranking,
  supplementName,
}) => {
  if (!ranking) {
    return null;
  }

  const confidenceScore = ranking.metadata?.confidenceScore || 0;
  const consensus = ranking.metadata?.consensus || 'Inconclusive';
  const positiveStudies = ranking.positive || [];
  const negativeStudies = ranking.negative || [];

  // Determine color based on confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  // Determine badge color based on confidence
  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-orange-50 text-orange-700 border-orange-200';
  };

  return (
    <div className="mb-8 bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-gray-200 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🔬</span>
              Análisis Inteligente de Evidencia
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ranking de estudios científicos basado en análisis automatizado
            </p>
          </div>
          <div className={`text-right ${getConfidenceColor(confidenceScore)}`}>
            <div className="text-3xl font-bold">{confidenceScore}%</div>
            <div className="text-xs font-semibold mt-1">Confianza</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Confidence Score Badge */}
        <div className={`inline-block px-4 py-2 rounded-full border mb-6 font-semibold text-sm ${getConfidenceBadgeColor(confidenceScore)}`}>
          📊 Consenso: {consensus}
        </div>

        {/* Grid Layout for Positive and Negative */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Positive Studies */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <h3 className="text-lg font-semibold text-green-700">
                Estudios Positivos
              </h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {positiveStudies.length}
              </span>
            </div>
            <div className="space-y-3">
              {positiveStudies.length > 0 ? (
                positiveStudies.slice(0, 5).map((study, idx) => (
                  <div
                    key={study.pmid || idx}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex gap-2">
                      <div className="font-bold text-green-700 text-sm flex-shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {study.title}
                        </p>
                        <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                          {study.year && <span>{study.year}</span>}
                          {study.journal && <span>•</span>}
                          {study.journal && (
                            <span className="italic">{study.journal}</span>
                          )}
                        </div>
                        {study.score !== undefined && (
                          <div className="text-xs font-semibold text-green-700 mt-2">
                            Score: {(study.score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No se encontraron estudios positivos
                </p>
              )}
            </div>
          </div>

          {/* Negative Studies */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">❌</span>
              <h3 className="text-lg font-semibold text-red-700">
                Estudios Negativos
              </h3>
              <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {negativeStudies.length}
              </span>
            </div>
            <div className="space-y-3">
              {negativeStudies.length > 0 ? (
                negativeStudies.slice(0, 5).map((study, idx) => (
                  <div
                    key={study.pmid || idx}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="flex gap-2">
                      <div className="font-bold text-red-700 text-sm flex-shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {study.title}
                        </p>
                        <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                          {study.year && <span>{study.year}</span>}
                          {study.journal && <span>•</span>}
                          {study.journal && (
                            <span className="italic">{study.journal}</span>
                          )}
                        </div>
                        {study.score !== undefined && (
                          <div className="text-xs font-semibold text-red-700 mt-2">
                            Score: {(study.score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No se encontraron estudios negativos
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>📈 Interpretación:</strong> Este análisis inteligente de {supplementName.toLowerCase()} se basa en{' '}
            <strong>{positiveStudies.length + negativeStudies.length}</strong> estudios científicos clasificados automáticamente. La puntuación de confianza refleja el nivel de acuerdo entre estudios.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RankingAnalysisPanel;
