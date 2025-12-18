/**
 * Evidence Analysis Panel (REDISEÑO)
 * Enfocado en lo que importa al usuario:
 * - Para qué sirve (descripción clara)
 * - Calificación visual (A-F con colores)
 * - Para qué funciona vs NO funciona
 * - Badges de calidad de evidencia
 */

'use client';

import { useState } from 'react';
import { Shield, Beaker, Users, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import SupplementGrade, { SupplementGradeBadge } from './SupplementGrade';
import type { GradeType } from '@/types/supplement-grade';
import WorksForSection, { type WorksForItem } from './WorksForSection';
import IntelligentRankingSection from './IntelligentRankingSection';
import { BenefitEvidenceCard } from './BenefitEvidenceCard';

interface EvidenceBadge {
  type: 'rct' | 'meta' | 'longterm' | 'safe';
  label: string;
  present: boolean;
}

interface Ingredient {
  name: string;
  grade: GradeType;
  studyCount: number;
  rctCount: number;
  description?: string;
  badges?: EvidenceBadge[];
}

interface EvidenceSummaryNew {
  // Calificación general
  overallGrade: GradeType;

  // Descripción clara (lo que importa)
  whatIsItFor: string;
  summary?: string; // Rich data summary

  // NEW: Evidence by Benefit
  evidenceByBenefit?: Array<{
    benefit: string;
    evidenceLevel: 'Fuerte' | 'Moderada' | 'Limitada' | 'Insuficiente';
    studiesFound: number;
    totalParticipants: number;
    summary: string;
  }>;

  // Funciona vs No funciona
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence?: WorksForItem[];

  // Ingredientes con calificaciones
  ingredients: Ingredient[];

  // Badges de calidad (opcional)
  qualityBadges?: {
    hasRCTs: boolean;
    hasMetaAnalysis: boolean;
    longTermStudies: boolean;
    safetyEstablished: boolean;
  };

  // NEW: Structured rich data from Bedrock
  dosage?: {
    effectiveDose: string;
    commonDose: string;
    timing: string;
    notes?: string;
  };

  sideEffects?: {
    common: string[];
    rare: string[];
    severity: 'Generally mild' | 'Moderate' | 'Severe' | 'None reported';
    notes?: string;
  };

  interactions?: {
    medications: Array<{
      medication: string;
      severity: 'Mild' | 'Moderate' | 'Severe';
      description: string;
    }>;
    supplements: string[];
    foods?: string;
  };

  contraindications?: string[];

  mechanisms?: Array<{
    name: string;
    description: string;
    evidenceLevel: 'strong' | 'moderate' | 'weak';
  }>;

  // NEW: Intelligent ranking from studies-fetcher
  studies?: {
    ranked?: {
      positive: any[];
      negative: any[];
      metadata: {
        consensus: 'strong_positive' | 'moderate_positive' | 'neutral' | 'moderate_negative' | 'strong_negative';
        confidenceScore: number;
        totalPositive: number;
        totalNegative: number;
        totalNeutral: number;
      };
    };
    all?: any[];
    total?: number;
  };
}

interface EvidenceAnalysisPanelNewProps {
  evidenceSummary: EvidenceSummaryNew;
  supplementName?: string;
  onViewStudies?: (ingredientName: string) => void;
}

const QUALITY_BADGES = [
  {
    key: 'hasRCTs' as const,
    icon: Beaker,
    label: 'Probado Clínicamente',
    description: 'Respaldado por estudios clínicos controlados (RCTs)',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    key: 'hasMetaAnalysis' as const,
    icon: Users,
    label: 'Múltiples Estudios',
    description: 'Confirmado por revisiones de múltiples investigaciones',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    key: 'longTermStudies' as const,
    icon: Calendar,
    label: 'Efectos a Largo Plazo',
    description: 'Estudiado durante 5+ años de investigación',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    key: 'safetyEstablished' as const,
    icon: Shield,
    label: 'Bien Tolerado',
    description: 'Perfil de seguridad favorable sin efectos adversos graves',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
];

/**
 * Panel de análisis de evidencia rediseñado
 * Enfocado en UX visual y claridad
 */
export default function EvidenceAnalysisPanelNew({
  evidenceSummary,
  supplementName,
  onViewStudies,
}: EvidenceAnalysisPanelNewProps) {
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* HERO: Calificación + Para qué sirve */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
        <div className="space-y-6">
          {/* Título */}
          {supplementName && (
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {supplementName}
            </h1>
          )}

          {/* Calificación Principal */}
          <SupplementGrade
            grade={evidenceSummary.overallGrade}
            supplementName={supplementName}
            size="lg"
          />

          {/* Para qué sirve (LO MÁS IMPORTANTE) */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              ¿Para qué sirve?
            </h3>
            <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
              {evidenceSummary.whatIsItFor}
            </p>
          </div>

          {/* Quality Badges */}
          {evidenceSummary.qualityBadges && (
            <div className="flex flex-wrap gap-3">
              {QUALITY_BADGES.map((badge) => {
                const Icon = badge.icon;
                const isPresent = evidenceSummary.qualityBadges![badge.key];

                if (!isPresent) return null;

                return (
                  <div
                    key={badge.key}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-lg
                      border-2 font-semibold text-sm
                      ${badge.bgColor} ${badge.color} border-current
                    `}
                    title={badge.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{badge.label} ✓</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* NEW: Evidence by Benefit Section */}
      {evidenceSummary.evidenceByBenefit && evidenceSummary.evidenceByBenefit.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Evidencia por Beneficio</h2>
          {evidenceSummary.evidenceByBenefit.map((benefit, index) => (
            <BenefitEvidenceCard key={index} {...benefit} />
          ))}
        </div>
      ) : (
        // Fallback to old WorksForSection if new data structure is not present
        <WorksForSection
          worksFor={evidenceSummary.worksFor}
          doesntWorkFor={evidenceSummary.doesntWorkFor}
          limitedEvidence={evidenceSummary.limitedEvidence}
        />
      )}

      {/* Dosage Information */}
      {evidenceSummary.dosage && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Dosificación Recomendada
          </h2>
          <div className="space-y-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Dosis Efectiva
              </h4>
              <p className="text-lg text-blue-800">
                {evidenceSummary.dosage.effectiveDose}
              </p>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2">
                Dosis Común
              </h4>
              <p className="text-lg text-green-800">
                {evidenceSummary.dosage.commonDose}
              </p>
            </div>

            {evidenceSummary.dosage.timing && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  Momento de Toma
                </h4>
                <p className="text-lg text-purple-800">
                  {evidenceSummary.dosage.timing}
                </p>
              </div>
            )}

            {evidenceSummary.dosage.notes && (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Nota:</strong> {evidenceSummary.dosage.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Effects */}
      {evidenceSummary.sideEffects && (evidenceSummary.sideEffects.common?.length > 0 || evidenceSummary.sideEffects.rare?.length > 0) && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Efectos Secundarios Posibles
          </h2>

          {evidenceSummary.sideEffects.common?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Comunes:</h3>
              <ul className="space-y-3">
                {evidenceSummary.sideEffects.common.map((effect, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-gray-700 text-base break-words">{effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evidenceSummary.sideEffects.rare?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Raros:</h3>
              <ul className="space-y-3">
                {evidenceSummary.sideEffects.rare.map((effect, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-gray-700 text-base break-words">{effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700">
              <strong>Severidad:</strong> {evidenceSummary.sideEffects.severity}
            </p>
            {evidenceSummary.sideEffects.notes && (
              <p className="mt-2 text-sm text-gray-600 italic">
                {evidenceSummary.sideEffects.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Drug Interactions */}
      {evidenceSummary.interactions && (evidenceSummary.interactions.medications?.length > 0 || evidenceSummary.interactions.supplements?.length > 0) && (
        <div className="bg-white rounded-xl border-2 border-red-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Interacciones con Medicamentos
          </h2>

          {evidenceSummary.interactions.medications?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Medicamentos:</h3>
              <div className="space-y-4">
                {evidenceSummary.interactions.medications.map((interaction, index) => (
                  <div key={index} className={`border-2 rounded-lg p-4 ${interaction.severity === 'Severe' ? 'border-red-300 bg-red-50' :
                    interaction.severity === 'Moderate' ? 'border-orange-300 bg-orange-50' :
                      'border-yellow-300 bg-yellow-50'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{interaction.medication}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${interaction.severity === 'Severe' ? 'bg-red-200 text-red-800' :
                        interaction.severity === 'Moderate' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                        {interaction.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 break-words">{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evidenceSummary.interactions.supplements?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Suplementos:</h3>
              <ul className="space-y-2">
                {evidenceSummary.interactions.supplements.map((supplement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span className="text-gray-700 text-base">{supplement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evidenceSummary.interactions.foods && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Alimentos:</h3>
              <p className="text-gray-700">{evidenceSummary.interactions.foods}</p>
            </div>
          )}

          <p className="mt-4 text-sm text-red-700 font-medium">
            ⚠️ Consulta con tu médico si estás tomando alguno de estos medicamentos.
          </p>
        </div>
      )}

      {/* Contraindications */}
      {evidenceSummary.contraindications && evidenceSummary.contraindications.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-red-300 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Contraindicaciones
          </h2>
          <ul className="space-y-3">
            {evidenceSummary.contraindications.map((contraindication, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></span>
                <span className="text-gray-700 text-base">{contraindication}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-red-700 font-medium">
            ⚠️ No uses este suplemento en estas condiciones sin supervisión médica.
          </p>
        </div>
      )}

      {/* Mechanisms */}
      {evidenceSummary.mechanisms && evidenceSummary.mechanisms.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Mecanismos de Acción
          </h2>
          <div className="space-y-4">
            {evidenceSummary.mechanisms.map((mechanism, index) => (
              <div key={index} className={`border-2 rounded-lg p-4 ${mechanism.evidenceLevel === 'strong' ? 'border-green-300 bg-green-50' :
                mechanism.evidenceLevel === 'moderate' ? 'border-blue-300 bg-blue-50' :
                  'border-gray-300 bg-gray-50'
                }`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{mechanism.name}</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${mechanism.evidenceLevel === 'strong' ? 'bg-green-200 text-green-800' :
                    mechanism.evidenceLevel === 'moderate' ? 'bg-blue-200 text-blue-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                    {mechanism.evidenceLevel}
                  </span>
                </div>
                <p className="text-sm text-gray-700 break-words">{mechanism.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredientes (Opcional - colapsable) */}
      {evidenceSummary.ingredients?.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Ingredientes Clave
          </h2>

          <div className="space-y-4">
            {evidenceSummary.ingredients.map((ingredient) => (
              <div
                key={ingredient.name}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {ingredient.name}
                      </h4>
                      <SupplementGradeBadge grade={ingredient.grade} size="md" />
                    </div>

                    {ingredient.description && (
                      <p className="text-sm text-gray-600 mb-2 break-words">
                        {ingredient.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{ingredient.studyCount} estudio{ingredient.studyCount !== 1 ? 's' : ''}</span>
                      {ingredient.rctCount > 0 && (
                        <span className="text-green-600 font-medium">
                          {ingredient.rctCount} RCTs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle button removed as it only showed external link */}
                </div>

                {/* Expanded content removed */}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTELLIGENT RANKING SECTION */}
      {evidenceSummary.studies?.ranked && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Análisis Inteligente de Evidencia
          </h2>
          <IntelligentRankingSection
            ranked={evidenceSummary.studies.ranked}
            supplementName={supplementName || 'este suplemento'}
            allStudies={evidenceSummary.studies.all || []}
          />
        </div>
      )}
    </div>
  );
}
