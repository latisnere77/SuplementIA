import { auditModels, type ResearchAuditFinding } from './schema';

export type AuditModel = (typeof auditModels)[number];

interface ModelPricing {
  provider: ResearchAuditFinding['provider'];
  inputPerMillion: number;
  cachedInputPerMillion?: number;
  outputPerMillion: number;
}

export const modelPricing: Record<AuditModel, ModelPricing> = {
  'kimi-k2.6': {
    provider: 'kimi',
    inputPerMillion: 0.95,
    cachedInputPerMillion: 0.16,
    outputPerMillion: 4,
  },
  'kimi-k2.5': {
    provider: 'kimi',
    inputPerMillion: 0.6,
    cachedInputPerMillion: 0.1,
    outputPerMillion: 3,
  },
  'gpt-5.4-nano': {
    provider: 'openai',
    inputPerMillion: 0.2,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.25,
  },
  'gpt-5.4-mini': {
    provider: 'openai',
    inputPerMillion: 0.75,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 4.5,
  },
  'gemini-flash-lite': {
    provider: 'google',
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
  },
  'claude-haiku-4.5': {
    provider: 'anthropic',
    inputPerMillion: 1,
    outputPerMillion: 5,
  },
};

export interface CostEstimateInput {
  model: AuditModel;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface TokenEstimate {
  input: number;
  output: number;
}

export interface CostEstimate {
  provider: ResearchAuditFinding['provider'];
  model: AuditModel;
  inputCostUsd: number;
  cachedInputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

function tokenCost(tokens: number, pricePerMillion: number): number {
  return (tokens / 1_000_000) * pricePerMillion;
}

export function estimateAuditTokens(payload: unknown): TokenEstimate {
  const serialized = JSON.stringify(payload);
  const input = Math.ceil(serialized.length / 4);
  const output = Math.min(1500, Math.max(250, Math.ceil(input * 0.35)));

  return { input, output };
}

export function estimateAuditCost(input: CostEstimateInput): CostEstimate {
  const pricing = modelPricing[input.model];
  const cachedInputTokens = Math.max(0, input.cachedInputTokens || 0);
  const billableInputTokens = Math.max(0, input.inputTokens - cachedInputTokens);
  const cachedRate = pricing.cachedInputPerMillion ?? pricing.inputPerMillion;
  const inputCostUsd = tokenCost(billableInputTokens, pricing.inputPerMillion);
  const cachedInputCostUsd = tokenCost(cachedInputTokens, cachedRate);
  const outputCostUsd = tokenCost(Math.max(0, input.outputTokens), pricing.outputPerMillion);
  const totalCostUsd = inputCostUsd + cachedInputCostUsd + outputCostUsd;

  return {
    provider: pricing.provider,
    model: input.model,
    inputCostUsd,
    cachedInputCostUsd,
    outputCostUsd,
    totalCostUsd,
  };
}
