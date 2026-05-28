import { estimateAuditCost, estimateAuditTokens } from './cost-estimator';
import type { ResearchAuditProviderConfig } from './config';
import type { ResearchAuditPacket } from './packets';
import { buildResearchAuditSystemPrompt, buildResearchAuditUserPrompt } from './provider-prompt';
import type { ProviderAuditResult, ResearchAuditProviderAdapter } from './provider';
import {
  validateResearchAuditFinding,
  type ResearchAuditFinding,
} from './schema';

type FetchLike = (
  input: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

interface KimiChatChoice {
  message?: {
    content?: string;
  };
}

interface KimiChatResponse {
  choices?: KimiChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class KimiResearchAuditProvider implements ResearchAuditProviderAdapter {
  provider = 'kimi' as const;

  model: ResearchAuditFinding['model'];

  private readonly fetchFn?: FetchLike;

  constructor(
    private readonly config: ResearchAuditProviderConfig,
    fetchFn?: FetchLike
  ) {
    this.model = config.model;
    this.fetchFn = fetchFn;
  }

  async evaluatePacket(packet: ResearchAuditPacket): Promise<ProviderAuditResult> {
    const promptPayload = {
      system: buildResearchAuditSystemPrompt(),
      user: buildResearchAuditUserPrompt(packet),
    };
    const tokenEstimate = estimateAuditTokens(promptPayload);
    const cappedTokenEstimate = {
      input: Math.min(tokenEstimate.input, this.config.maxInputTokensPerEvent),
      output: Math.min(tokenEstimate.output, this.config.maxOutputTokensPerEvent),
    };
    const cost = estimateAuditCost({
      model: this.config.model,
      inputTokens: cappedTokenEstimate.input,
      outputTokens: cappedTokenEstimate.output,
    });

    const baseResult = {
      packetId: packet.packetId,
      provider: this.provider,
      model: this.config.model,
      costEstimateUsd: Number(cost.totalCostUsd.toFixed(6)),
      tokenEstimate: cappedTokenEstimate,
    };

    if (!this.config.enabled) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['AUDIT_AGENT_ENABLED is not true'],
        externalCalls: 0,
        skippedReason: 'disabled',
      };
    }

    if (!this.config.dryRun) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['AUDIT_AGENT_DRY_RUN must remain true for provider pilot'],
        externalCalls: 0,
        skippedReason: 'dry_run_required',
      };
    }

    if (!this.config.apiKey) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['MOONSHOT_API_KEY or KIMI_API_KEY is required when audit agent is enabled'],
        externalCalls: 0,
        skippedReason: 'missing_api_key',
      };
    }

    if (cost.totalCostUsd > this.config.maxSpendUsdPerRun) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['estimated provider cost exceeds run budget'],
        externalCalls: 0,
        skippedReason: 'budget_skipped',
      };
    }

    const fetchFn = this.fetchFn ?? globalThis.fetch;
    if (!fetchFn) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['fetch is not available in this runtime'],
        externalCalls: 0,
        skippedReason: 'fetch_unavailable',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await fetchFn(this.config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: promptPayload.system },
            { role: 'user', content: promptPayload.user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_completion_tokens: this.config.maxOutputTokensPerEvent,
        }),
        signal: controller.signal,
      });

      const body = await response.text();
      if (!response.ok) {
        return {
          ...baseResult,
          valid: false,
          rejectionReasons: [`provider returned HTTP ${response.status}`],
          rejectedFinding: body.slice(0, 1000),
          externalCalls: 1,
        };
      }

      return this.parseProviderResponse(packet, body, baseResult);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseProviderResponse(
    packet: ResearchAuditPacket,
    body: string,
    baseResult: Pick<
      ProviderAuditResult,
      'packetId' | 'provider' | 'model' | 'costEstimateUsd' | 'tokenEstimate'
    >
  ): ProviderAuditResult {
    try {
      const parsed = JSON.parse(body) as KimiChatResponse;
      const rawContent = parsed.choices?.[0]?.message?.content;
      if (!rawContent) {
        return {
          ...baseResult,
          valid: false,
          rejectionReasons: ['provider response did not include message content'],
          rejectedFinding: parsed,
          externalCalls: 1,
        };
      }

      const rawFinding = JSON.parse(rawContent) as Partial<ResearchAuditFinding>;
      const guardedFinding = enforceReportOnlyFindingGuards(rawFinding, packet, baseResult);
      const validation = validateResearchAuditFinding(guardedFinding);

      return {
        ...baseResult,
        valid: validation.valid,
        finding: validation.finding,
        rejectedFinding: validation.valid ? undefined : guardedFinding,
        rejectionReasons: validation.rejectionReasons,
        externalCalls: 1,
      };
    } catch (error) {
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: [error instanceof Error ? error.message : 'failed to parse provider response'],
        rejectedFinding: body.slice(0, 1000),
        externalCalls: 1,
      };
    }
  }
}

function enforceReportOnlyFindingGuards(
  rawFinding: Partial<ResearchAuditFinding>,
  packet: ResearchAuditPacket,
  baseResult: Pick<
    ProviderAuditResult,
    'provider' | 'model' | 'costEstimateUsd' | 'tokenEstimate'
  >
): Partial<ResearchAuditFinding> {
  return {
    ...rawFinding,
    provider: baseResult.provider,
    model: baseResult.model,
    originalQueries: [packet.redactedQuery],
    validatedPmids: [],
    pmidVerificationStatus: 'not_checked',
    blockedFromProduction: true,
    requiresHumanReview: true,
    redactionApplied: true,
    costEstimateUsd: baseResult.costEstimateUsd,
    tokenEstimate: baseResult.tokenEstimate,
  };
}
