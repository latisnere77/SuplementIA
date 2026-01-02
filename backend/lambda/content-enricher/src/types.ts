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
  ranking?: any; // NEW: Intelligent ranking from studies-fetcher
  contentType?: 'standard' | 'examine-style'; // NEW: Content format type
  benefitQuery?: string; // NEW: Optional benefit-specific query (e.g., "hair growth") - for now just accepted, future: focused analysis
  jobId?: string; // NEW: Job ID for async enrichment with DynamoDB job store
  maxStudies?: number; // NEW: Limit number of studies to fetch
  rctOnly?: boolean; // NEW: Only fetch RCT studies
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
  sourcePMIDs?: string[]; // PMIDs referenced for dosage recommendations
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
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
}

export interface ContentBlock {
  type: 'text';
  text: string;
}

/**
 * Bedrock Converse API Response types
 */
export interface ConverseResponse {
  output: {
    message: {
      role: 'assistant';
      content: ConverseContentBlock[];
    };
  };
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'content_filtered';
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metrics?: {
    latencyMs: number;
  };
}

export interface ConverseContentBlock {
  text?: string;
  toolUse?: {
    toolUseId: string;
    name: string;
    input: any; // Tool-specific input (EnrichedContent in our case)
  };
}

export interface EnrichmentResponse {
  success: boolean;
  data?: EnrichedContent | ExamineStyleContent; // Support both formats
  metadata?: {
    supplementId: string;
    generatedAt: string;
    bedrockDuration?: number;
    tokensUsed?: number;
    cached?: boolean;
    hasRealData?: boolean;
    studiesUsed?: number;
    requestId?: string;
    correlationId?: string;
    contentType?: 'standard' | 'examine-style'; // NEW: Track content type
  };
  error?: string;
  message?: string;
}

/**
 * Examine.com-style content structure
 */
export interface ExamineStyleContent {
  overview: {
    whatIsIt: string;
    functions: string[];
    sources: string[];
  };
  benefitsByCondition: BenefitByCondition[];
  dosage: ExamineDosage;
  safety: ExamineSafety;
  mechanisms: ExamineMechanism[];
}

export interface BenefitByCondition {
  condition: string;
  effect: 'Small' | 'Moderate' | 'Large' | 'No effect';
  quantitativeData: string;
  evidence: string;
  context?: string;
  studyTypes: string[];
}

export interface ExamineDosage {
  effectiveDose: string;
  commonDose: string;
  timing: string;
  forms: Array<{
    name: string;
    bioavailability?: string;
    notes?: string;
  }>;
  notes?: string;
}

export interface ExamineSafety {
  sideEffects: {
    common: string[];
    rare: string[];
    severity: string;
  };
  interactions: {
    medications: Array<{
      medication: string;
      severity: 'Mild' | 'Moderate' | 'Severe';
      description: string;
    }>;
  };
  contraindications: string[];
  pregnancyLactation?: string;
}

export interface ExamineMechanism {
  name: string;
  description: string;
  evidenceLevel: 'strong' | 'moderate' | 'weak';
}
