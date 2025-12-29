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
import { Shield, Beaker, Users, Calendar, ExternalLink, ChevronDown, ChevronUp, Brain, ShoppingCart, CheckCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import SupplementGrade, { SupplementGradeBadge } from './SupplementGrade';
import EvidenceOverview from './EvidenceOverview';
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
    target?: string;
  }>;

  // NEW: Buying guidance - what to look for when purchasing
  buyingGuidance?: {
    preferredForm: string;
    keyCompounds: Array<{
      name: string;
      source: string;
      lookFor: string;
    }>;
    avoidFlags: string[];
    qualityIndicators: string[];
    notes?: string;
  };

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

  // Research span in years
  researchSpanYears?: number;
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

          {/* Evidence Overview - Objective research data */}
          <EvidenceOverview
            totalStudies={evidenceSummary.studies?.total || 0}
            topConditions={
              // Get top conditions from worksFor
              evidenceSummary.worksFor?.slice(0, 3).map((w) => w.condition) || []
            }
            supplementName={supplementName}
          />

          {/* ¿Qué es? - Descripción del ingrediente */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              ¿Qué es?
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
            Dosificación según Estudios Clínicos
          </h2>
          <div className="space-y-4">
            {/* Only show effective dose if it has actual content */}
            {evidenceSummary.dosage.effectiveDose && !evidenceSummary.dosage.effectiveDose.toLowerCase().includes('no disponible') && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  Dosis Efectiva (mínima documentada)
                </h4>
                <p className="text-lg text-blue-800">
                  {evidenceSummary.dosage.effectiveDose}
                </p>
              </div>
            )}

            {/* Only show common dose if it has actual content */}
            {evidenceSummary.dosage.commonDose && !evidenceSummary.dosage.commonDose.toLowerCase().includes('no disponible') && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-2">
                  Rango de Dosis en Estudios
                </h4>
                <p className="text-lg text-green-800">
                  {evidenceSummary.dosage.commonDose}
                </p>
              </div>
            )}

            {/* Only show timing if it has useful info (not vague phrases) */}
            {evidenceSummary.dosage.timing &&
             !evidenceSummary.dosage.timing.toLowerCase().includes('según indicaciones') &&
             !evidenceSummary.dosage.timing.toLowerCase().includes('sin preferencia') && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  Momento de Toma
                </h4>
                <p className="text-lg text-purple-800">
                  {evidenceSummary.dosage.timing}
                </p>
              </div>
            )}

            {/* Only show notes if they have useful content (not placeholders) */}
            {evidenceSummary.dosage.notes &&
             !evidenceSummary.dosage.notes.toLowerCase().includes('seguir indicaciones') &&
             evidenceSummary.dosage.notes.length > 20 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>📋 Consideraciones:</strong> {evidenceSummary.dosage.notes}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 mt-4">
              * Dosis basadas en estudios clínicos publicados. Consulta con un profesional de salud antes de suplementar.
            </p>
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

      {/* Qué Buscar al Comprar - Buying Guidance */}
      {evidenceSummary.buyingGuidance && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="w-7 h-7 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Qué Buscar al Comprar
            </h2>
          </div>

          <div className="space-y-6">
            {/* Preferred Form */}
            {evidenceSummary.buyingGuidance.preferredForm && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Forma Preferida
                </h4>
                <p className="text-purple-800">{evidenceSummary.buyingGuidance.preferredForm}</p>
              </div>
            )}

            {/* Key Compounds */}
            {evidenceSummary.buyingGuidance.keyCompounds?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                  Compuestos Activos a Buscar
                </h4>
                <div className="grid gap-3">
                  {evidenceSummary.buyingGuidance.keyCompounds.map((compound, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="font-medium text-blue-900">{compound.name}</div>
                      {compound.source && (
                        <div className="text-sm text-blue-700">Fuente: {compound.source}</div>
                      )}
                      {compound.lookFor && (
                        <div className="text-sm text-blue-800 mt-1">
                          <span className="font-medium">Buscar:</span> {compound.lookFor}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Indicators */}
            {evidenceSummary.buyingGuidance.qualityIndicators?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Indicadores de Calidad
                </h4>
                <ul className="space-y-2">
                  {evidenceSummary.buyingGuidance.qualityIndicators.map((indicator, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-green-800 bg-green-50 p-2 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avoid Flags */}
            {evidenceSummary.buyingGuidance.avoidFlags?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Señales de Alerta (Evitar)
                </h4>
                <ul className="space-y-2">
                  {evidenceSummary.buyingGuidance.avoidFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {evidenceSummary.buyingGuidance.notes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                <span className="font-medium">Nota:</span> {evidenceSummary.buyingGuidance.notes}
              </div>
            )}
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
