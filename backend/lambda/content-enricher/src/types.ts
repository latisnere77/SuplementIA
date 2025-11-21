/**
 * Type definitions for Content Enricher
 */

/**
 * PubMed Study from studies-fetcher Lambda
 */
export interface PubMedStudy {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  journal?: string;
  studyType?: 'randomized controlled trial' | 'meta-analysis' | 'systematic review' | 'clinical trial' | 'review';
  participants?: number;
  doi?: string;
  pubmedUrl: string;
}

export interface EnrichmentRequest {
  supplementId: string;
  category?: string;
  forceRefresh?: boolean;
  studies?: PubMedStudy[]; // Real PubMed studies from studies-fetcher
}

export interface EnrichedContent {
  whatIsIt: string;
  primaryUses: string[];
  mechanisms: Mechanism[];
  worksFor: WorksForItem[];
  doesntWorkFor: WorksForItem[];
  limitedEvidence?: WorksForItem[];
  dosage: Dosage;
  safety: Safety;
  keyStudies?: KeyStudy[];
}

export interface Mechanism {
  name: string;
  description: string;
  evidenceLevel: 'strong' | 'moderate' | 'weak' | 'preliminary';
  studyCount: number;
}

export interface WorksForItem {
  condition: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D';
  effectSize?: string;
  studyCount?: number;
  metaAnalysis?: boolean;
  notes?: string;
}

export interface Dosage {
  standard: string;
  timing: string;
  duration: string;
  forms?: DosageForm[];
  stacksWith?: string[];
}

export interface DosageForm {
  form: string;
  description: string;
  recommended: boolean;
}

export interface Safety {
  overallRating: 'Generally Safe' | 'Caution Required' | 'Insufficient Data';
  sideEffects?: SideEffect[];
  contraindications?: string[];
  interactions?: Interaction[];
}

export interface SideEffect {
  effect: string;
  frequency: 'Common' | 'Occasional' | 'Rare';
  severity: 'Mild' | 'Moderate' | 'Severe';
  notes?: string;
}

export interface Interaction {
  medication: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  description: string;
}

export interface KeyStudy {
  pmid: string;
  title: string;
  authors?: string[];
  year: number;
  journal?: string;
  studyType?: string;
  participants?: number;
  duration?: string;
  findings: string[];
}

export interface BedrockRequest {
  anthropic_version: string;
  max_tokens: number;
  temperature: number;
  messages: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface BedrockResponse {
  content: ContentBlock[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

export interface EnrichmentResponse {
  success: boolean;
  data?: EnrichedContent;
  metadata?: {
    supplementId: string;
    generatedAt: string;
    bedrockDuration?: number;
    tokensUsed?: number;
    cached?: boolean;
    hasRealData?: boolean;
    studiesUsed?: number;
  };
  error?: string;
  message?: string;
}
