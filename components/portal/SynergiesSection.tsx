'use client';

import React, { useState } from 'react';
import { Synergy } from '@/types/synergies';

interface SynergiesSectionProps {
  synergies: Synergy[];
  supplementName: string;
  isFallback?: boolean;
}

export function SynergiesSection({ synergies, supplementName: _supplementName, isFallback = false }: SynergiesSectionProps) {
  const [showAll, setShowAll] = useState(false);

  // DEBUG: Log synergies component render
  console.log('🔗 [SynergiesSection] Rendering with:', {
    hasSynergies: !!synergies,
    synergiesCount: synergies?.length || 0,
    isFallback,
    synergies: synergies?.slice(0, 2) // Log first 2 for debugging
  });

  if (!synergies || synergies.length === 0) {
    console.log('🔗 [SynergiesSection] NOT rendering - no synergies data');
    return null;
  }

  console.log('🔗 [SynergiesSection] RENDERING synergies section');

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
          Sinergias con Otros Suplementos
          {isFallback && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-normal">
              Sugerido por IA
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-500">
          {synergies.length} combinaciones
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Positive Synergies */}
        {displayedPositive.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Combina bien con ({positiveSynergies.length})
            </h4>
            <div className="space-y-3">
              {displayedPositive.map((synergy, idx) => (
                <SynergyCard key={`pos-${idx}`} synergy={synergy} />
              ))}
            </div>
          </div>
        )}

        {/* Negative Synergies */}
        {displayedNegative.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs">!</span>
              Evitar combinar con ({negativeSynergies.length})
            </h4>
            <div className="space-y-3">
              {displayedNegative.map((synergy, idx) => (
                <SynergyCard key={`neg-${idx}`} synergy={synergy} isNegative />
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
            {showAll ? 'Ver menos' : `Ver todas las ${synergies.length} sinergias`}
          </button>
        </div>
      )}
    </div>
  );
}

interface SynergyCardProps {
  synergy: Synergy;
  isNegative?: boolean;
}

function SynergyCard({ synergy, isNegative = false }: SynergyCardProps) {
  const bgColor = isNegative ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100';
  const textColor = isNegative ? 'text-red-800' : 'text-green-800';

  return (
    <div className={`${bgColor} border rounded-lg p-3 transition-all hover:shadow-sm`}>
      <div className="flex justify-between items-start gap-2">
        <span className={`font-medium ${textColor} text-sm`}>{synergy.supplement}</span>
        <div className="flex items-center gap-1.5">
          <TierBadge tier={synergy.tier} />
          {synergy.evidence && synergy.evidence.studyCount > 0 && (
            <EvidenceBadge studyCount={synergy.evidence.studyCount} />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{synergy.mechanism}</p>
      <div className="flex items-center justify-between mt-2">
        <StrengthMeter score={synergy.score} />
        <SynergyTypeBadge type={synergy.type} />
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const colors = {
    1: 'bg-purple-100 text-purple-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-gray-100 text-gray-600',
  };
  const labels = {
    1: 'Top',
    2: 'Buena',
    3: 'Base',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[tier as keyof typeof colors] || colors[3]}`}>
      {labels[tier as keyof typeof labels] || 'Base'}
    </span>
  );
}

function EvidenceBadge({ studyCount }: { studyCount: number }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
      {studyCount} estudios
    </span>
  );
}

function SynergyTypeBadge({ type }: { type: string }) {
  // Map internal types to human-readable labels
  const typeLabels: Record<string, string> = {
    energy_stack: 'Energia',
    mental_energy: 'Cognitivo',
    clean_energy: 'Energia Limpia',
    sustained_energy: 'Energia Sostenida',
    deep_relaxation: 'Relajacion',
    calm_recovery: 'Recuperacion',
    cardio_performance: 'Cardiovascular',
    metabolic_optimization: 'Metabolismo',
    general_synergy: 'General',
  };

  const label = typeLabels[type] || type.replace(/_/g, ' ');

  return (
    <span className="text-[10px] text-gray-500 capitalize">
      {label}
    </span>
  );
}

function StrengthMeter({ score }: { score: number }) {
  // Convert 0-100 score to 1-5 bars
  const bars = Math.round((score / 100) * 5);

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 mr-1">{score}</span>
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
