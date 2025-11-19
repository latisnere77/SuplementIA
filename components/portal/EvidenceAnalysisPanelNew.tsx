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
import SupplementGrade, { SupplementGradeBadge, type GradeType } from './SupplementGrade';
import WorksForSection, { type WorksForItem } from './WorksForSection';

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
    label: 'RCTs',
    description: 'Estudios randomizados controlados',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    key: 'hasMetaAnalysis' as const,
    icon: Users,
    label: 'Meta-Análisis',
    description: 'Revisiones sistemáticas',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    key: 'longTermStudies' as const,
    icon: Calendar,
    label: 'Largo Plazo',
    description: 'Estudios de largo plazo',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    key: 'safetyEstablished' as const,
    icon: Shield,
    label: 'Seguro',
    description: 'Perfil de seguridad establecido',
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
            <p className="text-xl text-gray-700 leading-relaxed">
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

      {/* Funciona vs No Funciona */}
      <WorksForSection
        worksFor={evidenceSummary.worksFor}
        doesntWorkFor={evidenceSummary.doesntWorkFor}
        limitedEvidence={evidenceSummary.limitedEvidence}
      />

      {/* Ingredientes (Opcional - colapsable) */}
      {evidenceSummary.ingredients.length > 0 && (
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
                      <p className="text-sm text-gray-600 mb-2">
                        {ingredient.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{ingredient.studyCount} estudios</span>
                      {ingredient.rctCount > 0 && (
                        <span className="text-green-600 font-medium">
                          {ingredient.rctCount} RCTs
                        </span>
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
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(ingredient.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Ver estudios en PubMed
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
