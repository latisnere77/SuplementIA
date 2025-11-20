/**
 * Type definitions for Cache Service
 */

export interface CacheItem {
  PK: string;
  SK: string;
  data: EnrichedContent;
  ttl: number;
  lastUpdated: string;
  version: string;
}

export interface EnrichedContent {
  whatIsIt?: string;
  primaryUses?: string[];
  mechanisms?: Mechanism[];
  worksFor?: WorksForItem[];
  doesntWorkFor?: WorksForItem[];
  dosage?: Dosage;
  safety?: Safety;
  keyStudies?: KeyStudy[];
  [key: string]: any; // Allow additional properties
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
  overallRating: string;
  sideEffects?: SideEffect[];
  contraindications?: string[];
  interactions?: Interaction[];
}

export interface SideEffect {
  effect: string;
  frequency: string;
  severity: string;
  notes?: string;
}

export interface Interaction {
  medication: string;
  severity: string;
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

export interface CacheResponse {
  success: boolean;
  data?: EnrichedContent;
  metadata?: {
    lastUpdated?: string;
    version?: string;
    isStale?: boolean;
  };
  error?: string;
  message?: string;
}

export interface LambdaEvent {
  httpMethod: string;
  pathParameters?: {
    supplementId?: string;
  };
  body?: string;
}

export interface LambdaResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}
