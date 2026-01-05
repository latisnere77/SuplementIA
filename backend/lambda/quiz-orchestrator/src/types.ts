/**
 * Quiz Orchestrator Types
 */

export interface QuizRequest {
  category: string;
  age?: number;
  gender?: string;
  location?: string;
  sensitivities?: string[];
  jobId?: string; // For async enrichment tracking
  forceRefresh?: boolean; // Force fresh enrichment
}

export interface SearchHit {
  title?: string;
  abstract?: string;
  ingredients?: string | string[];
  conditions?: string | string[];
  score?: number;
  study_count?: number;
}

export interface WorksForItem {
  condition: string;
  grade: string;
  evidenceGrade: string;
  studyCount: number;
  notes: string;
  magnitude?: string;
  confidence?: number;
  quantitativeData?: string;
}

export interface DoesntWorkForItem {
  condition: string;
  grade: string;
  evidenceGrade: string;
  studyCount: number;
  notes: string;
}

export interface LimitedEvidenceItem {
  condition: string;
  grade: string;
  evidenceGrade: string;
  studyCount: number;
  notes: string;
}

export interface IngredientInfo {
  name: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  studyCount: number;
  rctCount: number;
}

export interface Mechanism {
  name: string;
  description: string;
  evidenceLevel: 'strong' | 'moderate' | 'weak';
  target?: string;
}

export interface KeyCompound {
  name: string;
  source: string;
  lookFor: string;
}

export interface BuyingGuidance {
  preferredForm: string;
  keyCompounds: KeyCompound[];
  avoidFlags: string[];
  qualityIndicators: string[];
  notes?: string;
}

export interface Supplement {
  name: string;
  description: string;
  whatIsIt?: string; // Rich description from content-enricher
  mechanisms?: Mechanism[]; // How it works
  buyingGuidance?: BuyingGuidance; // What to look for when buying
  worksFor: WorksForItem[];
  doesntWorkFor: DoesntWorkForItem[];
  limitedEvidence: LimitedEvidenceItem[];
  sideEffects: any[];
  dosage: {
    standard: string;
    effectiveDose: string;
    notes: string;
    timing?: string;
  };
  safety: {
    overallRating: string;
    pregnancyCategory: string;
  };
  overallGrade?: string;
}

export interface EvidenceSummary {
  totalStudies: number;
  totalParticipants: number;
  efficacyPercentage: number;
  researchSpanYears: number;
  ingredients: IngredientInfo[];
  overallGrade?: string;
  qualityBadges?: Record<string, any>;
  studies?: {
    ranked?: {
      positive: any[];
      negative: any[];
      metadata?: {
        confidenceScore: number;
        totalPositive: number;
        totalNegative: number;
      };
    };
    total?: number;
  };
}

export interface Recommendation {
  recommendation_id: string;
  quiz_id: string;
  category: string;
  supplement: Supplement;
  evidence_summary: EvidenceSummary;
  ingredients: any[];
  products: any[];
  personalization_factors: {
    altitude: number;
    climate: string;
    gender: string;
    age: number;
    location: string;
    sensitivities: string[];
  };
  enriched?: boolean;
  enrichmentSource?: string;
  _enrichment_metadata?: any;
  qualityBadges?: Record<string, any>;
  evidence_by_benefit?: any[];
}

export interface EnrichmentData {
  success: boolean;
  data?: {
    evidence?: any;
    supplement?: any;
    studies?: any;
    products?: any;
    evidenceByBenefit?: any[];
    synergies?: any[];
    synergiesSource?: 'external_db' | 'claude_fallback';
  };
  evidence?: any;
  supplement?: any;
  studies?: any;
  products?: any;
  metadata?: any;
  synergies?: any[];
  synergiesSource?: 'external_db' | 'claude_fallback';
}

export interface QuizResponse {
  success: boolean;
  quiz_id?: string;
  recommendation?: Recommendation;
  jobId?: string;
  source?: string;
  error?: string;
  message?: string;
  details?: string;
}
