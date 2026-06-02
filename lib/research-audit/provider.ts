import type { CostEstimate, TokenEstimate } from './cost-estimator';
import type { ResearchAuditPacket } from './packets';
import type { ResearchAuditFinding } from './schema';

export interface PmidArticleSummary {
  pmid: string;
  title?: string;
  journal?: string;
  year?: string;
  matchedTerms: string[];
}

export interface ProviderBudget {
  estimatedCost: CostEstimate;
  tokenEstimate: TokenEstimate;
  withinBudget: boolean;
  rejectionReason?: string;
}

export interface ProviderAuditResult {
  packetId: string;
  provider: ResearchAuditFinding['provider'];
  model: ResearchAuditFinding['model'];
  valid: boolean;
  finding?: ResearchAuditFinding;
  rejectedFinding?: unknown;
  articleSummaries?: PmidArticleSummary[];
  matchedPmids?: string[];
  pmidEntityMatchStatus?: 'not_checked' | 'all_matched' | 'partially_matched' | 'none_matched';
  rejectionReasons: string[];
  costEstimateUsd: number;
  tokenEstimate: TokenEstimate;
  externalCalls: number;
  skippedReason?: string;
}

export interface ResearchAuditProviderAdapter {
  provider: ResearchAuditFinding['provider'];
  model: ResearchAuditFinding['model'];
  evaluatePacket(packet: ResearchAuditPacket): Promise<ProviderAuditResult>;
}
