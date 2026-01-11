/**
 * Intelligent Ranking Section
 * Displays positive and negative studies with sentiment analysis
 */

'use client';

import { ExternalLink, ThumbsUp, ThumbsDown, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Study {
  pmid: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year: number;
  journal?: string;
  studyType?: string;
  participants?: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
  sentimentReason?: string;
}

interface RankingMetadata {
  consensus: 'strong_positive' | 'moderate_positive' | 'neutral' | 'moderate_negative' | 'strong_negative';
  confidenceScore: number;
  totalPositive: number;
  totalNegative: number;
  totalNeutral: number;
}

interface RankedData {
  positive: Study[];
  negative: Study[];
  metadata: RankingMetadata;
}

interface IntelligentRankingSectionProps {
  ranked: RankedData;
  supplementName: string;
  allStudies?: any[];
}

const CONSENSUS_CONFIG = {
  strong_positive: {
    label: 'Evidencia Fuertemente Positiva',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🟢',
    description: 'La mayoría de estudios muestran beneficios significativos',
  },
  moderate_positive: {
    label: 'Evidencia Moderadamente Positiva',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '🔵',
    description: 'Varios estudios muestran beneficios, algunos con resultados mixtos',
  },
  neutral: {
    label: 'Evidencia Neutral',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '⚪',
    description: 'Estudios muestran resultados mixtos o no concluyentes',
  },
  moderate_negative: {
    label: 'Evidencia Moderadamente Negativa',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '🟠',
    description: 'Varios estudios no muestran beneficios significativos',
  },
  strong_negative: {
    label: 'Evidencia Fuertemente Negativa',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '🔴',
    description: 'La mayoría de estudios no muestran beneficios',
  },
};

function StudyCard({ study, sentiment }: { study: Study; sentiment: 'positive' | 'negative' | 'neutral' }) {
  const sentimentConfig = sentiment === 'positive'
    ? { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    : sentiment === 'negative'
      ? { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      : { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };

  const Icon = sentimentConfig.icon;

  return (
    <Card className={`${sentimentConfig.bg} ${sentimentConfig.border} border-2 hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${sentimentConfig.color} flex-shrink-0 mt-1`} />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-gray-900 leading-tight">
              {study.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {study.year && (
                <Badge variant="outline" className="text-xs">
                  {study.year}
                </Badge>
              )}
              {study.studyType && (
                <Badge variant="outline" className="text-xs">
                  {study.studyType}
                </Badge>
              )}
              {study.participants && (
                <Badge variant="outline" className="text-xs">
                  {study.participants} participantes
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {study.sentimentReason && (
          <p className="text-xs text-gray-600 mb-3 italic">
            {study.sentimentReason}
          </p>
        )}
        {study.journal && (
          <p className="text-xs text-gray-500 mb-2">
            📄 {study.journal}
          </p>
        )}
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          Ver Fuente Original
          <ExternalLink className="w-3 h-3" />
        </a>
      </CardContent>
    </Card>
  );
}

export default function IntelligentRankingSection({ ranked, supplementName, allStudies = [] }: IntelligentRankingSectionProps) {
  const consensusConfig = CONSENSUS_CONFIG[ranked.metadata.consensus];

  // Calculate distinct neutral studies (those not in positive or negative lists)
  const positiveIds = new Set(ranked.positive.map(s => s.pmid));
  const negativeIds = new Set(ranked.negative.map(s => s.pmid));

  const neutralStudies = allStudies.filter(s =>
    !positiveIds.has(s.pmid) && !negativeIds.has(s.pmid)
  ).map(s => ({
    ...s,
    // Add default neutral sentiment if missing or failed
    sentiment: 'neutral' as const,
    sentimentReason: s.sentimentReason || s.sentimentReasoning || 'Análisis no concluyente o fallido'
  }));

  return (
    <div className="space-y-6">
      {/* Consensus Banner */}
      <Card className={`${consensusConfig.color} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{consensusConfig.icon}</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {consensusConfig.label}
              </h3>
              <p className="text-sm mb-3">
                {consensusConfig.description}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">Confianza: {ranked.metadata.confidenceScore}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span>{ranked.metadata.totalPositive} estudios positivos</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span>{ranked.metadata.totalNegative} estudios negativos</span>
                </div>
                {ranked.metadata.totalNeutral > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <span>{ranked.metadata.totalNeutral} estudios neutrales</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Studies Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Positive Studies */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Evidencia Positiva ({ranked.positive.length})
            </h3>
          </div>
          <div className="space-y-3">
            {ranked.positive.map((study) => (
              <StudyCard key={study.pmid} study={study} sentiment="positive" />
            ))}
          </div>
        </div>

        {/* Negative Studies */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Evidencia Negativa ({ranked.negative.length})
            </h3>
          </div>
          <div className="space-y-3">
            {ranked.negative.map((study) => (
              <StudyCard key={study.pmid} study={study} sentiment="negative" />
            ))}
          </div>
        </div>
      </div>

      {/* Neutral Studies Section */}
      {neutralStudies.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Evidencia Neutral / No Clasificada ({neutralStudies.length})
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {neutralStudies.slice(0, Math.ceil(neutralStudies.length / 2)).map((study) => (
                <StudyCard key={study.pmid} study={study} sentiment="neutral" />
              ))}
            </div>
            <div className="space-y-3">
              {neutralStudies.slice(Math.ceil(neutralStudies.length / 2)).map((study) => (
                <StudyCard key={study.pmid} study={study} sentiment="neutral" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Análisis Inteligente con IA</p>
              <p>
                Este análisis fue generado usando inteligencia artificial (Claude) para clasificar
                automáticamente los estudios según sus resultados. El consenso se calcula basándose
                en la proporción de estudios positivos vs negativos y la calidad de la evidencia.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
