'use client';

import React, { useState } from 'react';
import { Synergy } from '@/types/synergies';
import { sanitizeResearchBriefText } from '@/lib/portal/research-brief-presentation';

interface SynergiesSectionProps {
  synergies: Synergy[];
  supplementName: string;
  isFallback?: boolean;
  language?: 'en' | 'es';
}

function getLabels(language: 'en' | 'es') {
  return language === 'en'
    ? {
      title: 'Exploratory Supplement Combinations',
      fallback: 'AI suggested',
      count: 'combinations',
      positive: 'Combinations to research',
      negative: 'Avoid or review with a clinician',
      showLess: 'Show less',
      showAll: (count: number) => `Show all ${count} combinations`,
      tierTop: 'Top',
      tierGood: 'Good',
      tierBaseline: 'Baseline',
      tierExploratory: 'Exploratory',
      evidence: (count: number) => `${count} studies`,
    }
    : {
      title: 'Combinaciones exploratorias con otros suplementos',
      fallback: 'Sugerido por IA',
      count: 'combinaciones',
      positive: 'Combinaciones a investigar',
      negative: 'Evitar o revisar con profesional',
      showLess: 'Ver menos',
      showAll: (count: number) => `Ver todas las ${count} combinaciones`,
      tierTop: 'Principal',
      tierGood: 'Buena',
      tierBaseline: 'Básica',
      tierExploratory: 'Exploratoria',
      evidence: (count: number) => `${count} estudios`,
    };
}

function cleanSynergyLabel(value: unknown, language: 'en' | 'es'): string {
  const cleaned = sanitizeResearchBriefText(value, language);
  if (!cleaned) return language === 'en' ? 'Exploratory combination' : 'Combinación exploratoria';

  const normalized = cleaned.toLowerCase();
  if (
    normalized === 'complementary supplement combination' ||
    normalized === 'general' ||
    normalized === 'general synergy'
  ) {
    return language === 'en' ? 'Exploratory combination' : 'Combinación exploratoria';
  }

  return cleaned.replace(/_/g, ' ');
}

export function SynergiesSection({
  synergies,
  supplementName: _supplementName,
  isFallback = false,
  language = 'es',
}: SynergiesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const labels = getLabels(language);

  if (!synergies || synergies.length === 0) {
    return null;
  }

  const positiveSynergies = synergies.filter(s => s.direction === 'positive');
  const negativeSynergies = synergies.filter(s => s.direction === 'negative');

  // Limit displayed synergies unless showAll
  const displayedPositive = showAll ? positiveSynergies : positiveSynergies.slice(0, 6);
  const displayedNegative = showAll ? negativeSynergies : negativeSynergies.slice(0, 3);
  const hasMore = positiveSynergies.length > 6 || negativeSynergies.length > 3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-xl">🔗</span>
          {labels.title}
          {isFallback && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-normal">
              {labels.fallback}
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-500">
          {synergies.length} {labels.count}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Positive Synergies */}
        {displayedPositive.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              {labels.positive} ({positiveSynergies.length})
            </h4>
            <div className="space-y-3">
              {displayedPositive.map((synergy, idx) => (
                <SynergyCard key={`pos-${idx}`} synergy={synergy} labels={labels} language={language} />
              ))}
            </div>
          </div>
        )}

        {/* Negative Synergies */}
        {displayedNegative.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs">!</span>
              {labels.negative} ({negativeSynergies.length})
            </h4>
            <div className="space-y-3">
              {displayedNegative.map((synergy, idx) => (
                <SynergyCard key={`neg-${idx}`} synergy={synergy} isNegative labels={labels} language={language} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show more button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAll ? labels.showLess : labels.showAll(synergies.length)}
          </button>
        </div>
      )}
    </div>
  );
}

interface SynergyCardProps {
  synergy: Synergy;
  isNegative?: boolean;
  labels: ReturnType<typeof getLabels>;
  language: 'en' | 'es';
}

function SynergyCard({ synergy, isNegative = false, labels, language }: SynergyCardProps) {
  const bgColor = isNegative ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100';
  const textColor = isNegative ? 'text-red-800' : 'text-green-800';
  const supplementLabel = cleanSynergyLabel(synergy.supplement, language);
  const mechanismLabel = cleanSynergyLabel(synergy.mechanism, language);

  return (
    <div className={`${bgColor} border rounded-lg p-3 transition-all hover:shadow-sm`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`font-medium ${textColor} text-sm`}>{supplementLabel}</span>
        <div className="flex items-center gap-1.5">
          <TierBadge tier={synergy.tier} labels={labels} />
          {synergy.evidence && synergy.evidence.studyCount > 0 && (
            <EvidenceBadge studyCount={synergy.evidence.studyCount} labels={labels} />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{mechanismLabel}</p>
      <div className="flex items-center justify-between mt-2">
        <StrengthMeter score={synergy.score} />
        <SynergyTypeBadge type={synergy.type} labels={labels} language={language} />
      </div>
    </div>
  );
}

function TierBadge({ tier, labels }: { tier: number; labels: ReturnType<typeof getLabels> }) {
  const colors = {
    1: 'bg-purple-100 text-purple-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-gray-100 text-gray-600',
  };
  const tierLabels = {
    1: labels.tierTop,
    2: labels.tierGood,
    3: labels.tierBaseline,
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[tier as keyof typeof colors] || colors[3]}`}>
      {tierLabels[tier as keyof typeof tierLabels] || labels.tierExploratory}
    </span>
  );
}

function EvidenceBadge({ studyCount, labels }: { studyCount: number; labels: ReturnType<typeof getLabels> }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
      {labels.evidence(studyCount)}
    </span>
  );
}

function SynergyTypeBadge({
  type,
  labels,
  language,
}: {
  type: string;
  labels: ReturnType<typeof getLabels>;
  language: 'en' | 'es';
}) {
  // Map internal types to human-readable labels
  const typeLabels: Record<string, string> = language === 'en'
    ? {
      energy_stack: 'Energy',
      mental_energy: 'Cognitive',
      clean_energy: 'Clean energy',
      sustained_energy: 'Sustained energy',
      deep_relaxation: 'Relaxation',
      calm_recovery: 'Recovery',
      cardio_performance: 'Cardiovascular',
      metabolic_optimization: 'Metabolism',
      general_synergy: labels.tierExploratory,
    }
    : {
      energy_stack: 'Energía',
      mental_energy: 'Cognitivo',
      clean_energy: 'Energía limpia',
      sustained_energy: 'Energía sostenida',
      deep_relaxation: 'Relajación',
      calm_recovery: 'Recuperación',
      cardio_performance: 'Cardiovascular',
      metabolic_optimization: 'Metabolismo',
      general_synergy: labels.tierExploratory,
    };

  const label = typeLabels[type] || cleanSynergyLabel(type, language);

  return (
    <span className="text-[10px] text-gray-500">
      {label}
    </span>
  );
}

function StrengthMeter({ score }: { score: number }) {
  // Convert 0-100 score to 1-5 bars
  const bars = Math.round((score / 100) * 5);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-sm ${i <= bars ? 'bg-blue-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default SynergiesSection;
