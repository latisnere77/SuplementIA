import type { CostEstimate, TokenEstimate } from './cost-estimator';
import type { ResearchAuditPacket } from './packets';
import type { ResearchAuditFinding } from './schema';

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

