/**
 * Synergy types for supplement combinations
 */

export type SynergyDirection = 'positive' | 'negative';

export interface SynergyEvidence {
  studyCount: number;
  pubmedIds: string[];
  source: string;
}

export interface Synergy {
  supplement: string;
  type: string;
  mechanism: string;
  effect: string;
  score: number;
  tier: number;
  categories: string[];
  direction: SynergyDirection;
  evidence?: SynergyEvidence;
}

export interface SynergiesData {
  synergies: Synergy[];
  source: 'external_db' | 'claude_fallback';
}

export interface SynergiesSectionProps {
  synergies: Synergy[];
  supplementName: string;
  isFallback?: boolean;
}
