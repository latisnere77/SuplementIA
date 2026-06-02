import { estimateAuditCost, estimateAuditTokens } from './cost-estimator';
import type { ResearchAuditProviderConfig } from './config';
import type { ResearchAuditPacket } from './packets';
import { buildResearchAuditSystemPrompt, buildResearchAuditUserPrompt } from './provider-prompt';
import { sanitizeProviderError } from './provider-error-sanitizer';
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
    content?: unknown;
    reasoning_content?: unknown;
  };
  text?: unknown;
}

interface KimiChatResponse {
  choices?: KimiChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

function temperatureForModel(model: ResearchAuditFinding['model']): number {
  if (model === 'kimi-k2.6' || model === 'kimi-k2.5') return 0.6;
  return 0;
}

function thinkingForModel(model: ResearchAuditFinding['model']): { type: 'disabled' } | undefined {
  if (model === 'kimi-k2.6' || model === 'kimi-k2.5') return { type: 'disabled' };
  return undefined;
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

    let responseBody = '';
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
          response_format: researchAuditFindingResponseFormat,
          thinking: thinkingForModel(this.config.model),
          temperature: temperatureForModel(this.config.model),
          max_completion_tokens: this.config.maxOutputTokensPerEvent,
        }),
        signal: controller.signal,
      });

      responseBody = await response.text();
      if (!response.ok) {
        const sanitizedError = sanitizeProviderError(responseBody, response.status);
        return {
          ...baseResult,
          valid: false,
          rejectionReasons: [`provider returned HTTP ${response.status}`],
          rejectedFinding: sanitizedError,
          externalCalls: 1,
        };
      }

      return this.parseProviderResponse(packet, responseBody, baseResult);
    } catch (error) {
      if (isAbortError(error)) {
        return {
          ...baseResult,
          valid: false,
          rejectionReasons: ['provider request timed out'],
          rejectedFinding: { message: 'provider request timed out' },
          externalCalls: 1,
        };
      }

      return {
        ...baseResult,
        valid: false,
        rejectionReasons: ['provider request failed'],
        rejectedFinding: { message: 'provider request failed' },
        externalCalls: 1,
      };
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
      const rawContent = findKimiAuditJsonContent(parsed);
      if (!rawContent) {
        return {
          ...baseResult,
          valid: false,
          rejectionReasons: ['provider response did not include parseable audit JSON'],
          rejectedFinding: sanitizeProviderError(body),
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
      const sanitizedError = sanitizeProviderError(body);
      return {
        ...baseResult,
        valid: false,
        rejectionReasons: [error instanceof Error ? error.message : 'failed to parse provider response'],
        rejectedFinding: sanitizedError,
        externalCalls: 1,
      };
    }
  }
}

const researchAuditFindingResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'ResearchAuditFinding',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'findingId',
        'createdAt',
        'provider',
        'model',
        'taskType',
        'severity',
        'supplementName',
        'originalQueries',
        'problemDetected',
        'evidenceBoundary',
        'suggestedAliases',
        'candidatePmids',
        'validatedPmids',
        'pmidVerificationStatus',
        'proposedClassification',
        'clinicalRisk',
        'recommendedAction',
        'blockedFromProduction',
        'requiresHumanReview',
        'confidence',
        'redactionApplied',
        'costEstimateUsd',
        'tokenEstimate',
        'notesForReviewer',
      ],
      properties: {
        findingId: { type: 'string', pattern: '^raf_[a-z0-9_-]{8,80}$' },
        createdAt: { type: 'string' },
        provider: { type: 'string', enum: ['kimi', 'openai', 'google', 'anthropic'] },
        model: {
          type: 'string',
          enum: [
            'kimi-k2.6',
            'kimi-k2.5',
            'gpt-5.4-nano',
            'gpt-5.4-mini',
            'gemini-flash-lite',
            'claude-haiku-4.5',
          ],
        },
        taskType: {
          type: 'string',
          enum: [
            'alias_gap',
            'recall_gap',
            'clinical_claim_risk',
            'pipeline_failure',
            'seo_opportunity',
          ],
        },
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        supplementName: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[^\\n\\r<>]{1,120}$' },
        originalQueries: {
          type: 'array',
          minItems: 1,
          maxItems: 10,
          items: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[^\\n\\r<>]{1,120}$' },
        },
        problemDetected: { type: 'string', minLength: 1, maxLength: 1000 },
        evidenceBoundary: {
          type: 'string',
          enum: [
            'human_clinical_required',
            'preclinical_only',
            'editorial_only',
            'operational_only',
          ],
        },
        suggestedAliases: {
          type: 'array',
          maxItems: 12,
          items: { type: 'string', minLength: 1, maxLength: 120, pattern: '^[^\\n\\r<>]{1,120}$' },
        },
        candidatePmids: {
          type: 'array',
          maxItems: 20,
          items: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' },
        },
        validatedPmids: {
          type: 'array',
          maxItems: 20,
          items: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' },
        },
        pmidVerificationStatus: {
          type: 'string',
          enum: [
            'not_checked',
            'all_valid',
            'partially_valid',
            'none_valid',
            'entity_mismatch',
            'verification_failed',
          ],
        },
        proposedClassification: {
          type: 'string',
          enum: [
            'needs_human_review',
            'likely_insufficient_data',
            'possible_recall_gap',
            'operational_bug',
          ],
        },
        clinicalRisk: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
        recommendedAction: { type: 'string', minLength: 1, maxLength: 1200 },
        blockedFromProduction: { type: 'boolean', enum: [true] },
        requiresHumanReview: { type: 'boolean', enum: [true] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        redactionApplied: { type: 'boolean', enum: [true] },
        costEstimateUsd: { type: 'number', minimum: 0, maximum: 1 },
        tokenEstimate: {
          type: 'object',
          additionalProperties: false,
          required: ['input', 'output'],
          properties: {
            input: { type: 'integer', minimum: 0, maximum: 8000 },
            output: { type: 'integer', minimum: 0, maximum: 1500 },
          },
        },
        notesForReviewer: { type: 'string', maxLength: 1200 },
      },
    },
  },
} as const;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function findKimiAuditJsonContent(response: KimiChatResponse): string | undefined {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  for (const choice of choices) {
    const candidates = [
      choice.message?.content,
      choice.message?.reasoning_content,
      choice.text,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const jsonText = extractJsonObjectText(candidate);
      if (jsonText) return jsonText;
    }
  }

  return undefined;
}

function extractJsonObjectText(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  if (isJsonObjectString(trimmed)) return trimmed;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;

  const possibleJson = trimmed.slice(start, end + 1);
  if (isJsonObjectString(possibleJson)) return possibleJson;

  return undefined;
}

function isJsonObjectString(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as unknown;
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
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
    findingId: buildFindingId(packet),
    provider: baseResult.provider,
    model: baseResult.model,
    originalQueries: [packet.redactedQuery],
    candidatePmids: normalizeCandidatePmids(rawFinding.candidatePmids),
    validatedPmids: [],
    pmidVerificationStatus: 'not_checked',
    blockedFromProduction: true,
    requiresHumanReview: true,
    redactionApplied: true,
    costEstimateUsd: baseResult.costEstimateUsd,
    tokenEstimate: baseResult.tokenEstimate,
  };
}

function buildFindingId(packet: ResearchAuditPacket): ResearchAuditFinding['findingId'] {
  const rawSeed = `${packet.packetId}_${packet.queryFingerprint}`;
  const normalizedSeed = rawSeed
    .toLowerCase()
    .replace(/^rap_/, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const paddedSeed = `${normalizedSeed}_finding`.replace(/^_+/, '') || 'finding1';
  const safeSeed = normalizedSeed.length >= 8 ? normalizedSeed : paddedSeed.padEnd(8, '0');

  return `raf_${safeSeed.slice(0, 80)}`;
}

function normalizeCandidatePmids(candidatePmids: unknown): string[] {
  if (!Array.isArray(candidatePmids)) return [];
  const normalized = new Set<string>();
  for (const candidate of candidatePmids) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (/^[1-9][0-9]{0,9}$/.test(trimmed)) normalized.add(trimmed);
  }

  return [...normalized].slice(0, 20);
}
