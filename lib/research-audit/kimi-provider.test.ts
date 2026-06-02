import { loadResearchAuditProviderConfig } from './config';
import { KimiResearchAuditProvider } from './kimi-provider';
import type { ResearchAuditPacket } from './packets';

const packet: ResearchAuditPacket = {
  packetId: 'rap_test_packet',
  queryFingerprint: 'abc123',
  redactedQuery: 'garcinia cambogia',
  normalizedQuery: 'Garcinia cambogia',
  statusCounts: { insufficient_data: 3 },
  fallbackCounts: {},
  deterministicPubMedProfile: {
    totalCount: 12,
    categories: {
      human_clinical: 2,
      review: 1,
      preclinical: 4,
      phytochemical: 1,
      other: 4,
    },
  },
};

const seoPacket: ResearchAuditPacket = {
  packetId: 'rap_event_bacopa_gsc',
  auditKind: 'seo_aggregate',
  queryFingerprint: 'seo123',
  redactedQuery: 'bacopa monnieri',
  normalizedQuery: 'Bacopa monnieri',
  statusCounts: { impressions: 42, clicks: 0 },
  fallbackCounts: {},
  deterministicPubMedProfile: {
    totalCount: 0,
    categories: {
      human_clinical: 0,
      review: 0,
      preclinical: 0,
      phytochemical: 0,
      other: 0,
    },
  },
  seoAggregate: {
    source: 'search_console',
    pagePath: '/es/portal/supplement/bacopa-monnieri',
    country: 'MX',
    impressions: 42,
    clicks: 0,
    ctr: 0,
    averagePosition: 58.3,
  },
};

function validProviderBody() {
  return JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            findingId: 'raf_provider_test_001',
            createdAt: '2026-05-28T00:00:00.000Z',
            provider: 'kimi',
            model: 'kimi-k2.6',
            taskType: 'recall_gap',
            severity: 'medium',
            supplementName: 'Garcinia cambogia',
            originalQueries: ['raw value that must be replaced'],
            problemDetected: 'The audit packet may indicate an evidence recall gap.',
            evidenceBoundary: 'human_clinical_required',
            suggestedAliases: ['hydroxycitric acid'],
            candidatePmids: ['3544968'],
            validatedPmids: ['3544968'],
            pmidVerificationStatus: 'all_valid',
            proposedClassification: 'possible_recall_gap',
            clinicalRisk: 'low',
            recommendedAction: 'Review this recall gap candidate in the asynchronous audit queue.',
            blockedFromProduction: true,
            requiresHumanReview: true,
            confidence: 0.7,
            redactionApplied: true,
            costEstimateUsd: 0.001,
            tokenEstimate: { input: 2000, output: 500 },
          }),
        },
      },
    ],
  });
}

function validFindingContent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    findingId: 'raf_provider_test_001',
    createdAt: '2026-05-28T00:00:00.000Z',
    provider: 'kimi',
    model: 'kimi-k2.6',
    taskType: 'recall_gap',
    severity: 'medium',
    supplementName: 'Garcinia cambogia',
    originalQueries: ['raw value that must be replaced'],
    problemDetected: 'The audit packet may indicate an evidence recall gap.',
    evidenceBoundary: 'human_clinical_required',
    suggestedAliases: ['hydroxycitric acid'],
    candidatePmids: ['3544968'],
    validatedPmids: ['3544968'],
    pmidVerificationStatus: 'all_valid',
    proposedClassification: 'possible_recall_gap',
    clinicalRisk: 'low',
    recommendedAction: 'Review this recall gap candidate in the asynchronous audit queue.',
    blockedFromProduction: true,
    requiresHumanReview: true,
    confidence: 0.7,
    redactionApplied: true,
    costEstimateUsd: 0.001,
    tokenEstimate: { input: 2000, output: 500 },
    ...overrides,
  });
}

describe('KimiResearchAuditProvider', () => {
  it('does not call the provider when disabled by default', async () => {
    const fetchFn = jest.fn();
    const provider = new KimiResearchAuditProvider(loadResearchAuditProviderConfig({}), fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.externalCalls).toBe(0);
    expect(result.skippedReason).toBe('disabled');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('keeps PMIDs unverified even when the provider claims validation', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => validProviderBody(),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.externalCalls).toBe(1);
    expect(result.valid).toBe(true);
    expect(result.finding?.originalQueries).toEqual(['garcinia cambogia']);
    expect(result.finding?.candidatePmids).toEqual(['3544968']);
    expect(result.finding?.validatedPmids).toEqual([]);
    expect(result.finding?.pmidVerificationStatus).toBe('not_checked');
  });

  it('parses Kimi K2.6 audit JSON from reasoning_content when message content is empty', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: '',
                reasoning_content: `safe reasoning wrapper ${validFindingContent()}`,
              },
            },
          ],
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
      AUDIT_AGENT_MODEL: 'kimi-k2.6',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(true);
    expect(result.finding?.supplementName).toBe('Garcinia cambogia');
    expect(result.finding?.validatedPmids).toEqual([]);
    expect(result.finding?.pmidVerificationStatus).toBe('not_checked');
  });

  it('normalizes invalid provider finding IDs before validation', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: validFindingContent({
                  findingId: 'rap_event_garcinia-insufficient-data-recall-gap',
                }),
              },
            },
          ],
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(true);
    expect(result.finding?.findingId).toBe('raf_test_packet_abc123');
  });

  it('filters invalid provider candidate PMIDs before validation', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: validFindingContent({
                  candidatePmids: ['3544968', '', ',', '0', 'abc123', '3544968', '12345678901'],
                }),
              },
            },
          ],
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(true);
    expect(result.finding?.candidatePmids).toEqual(['3544968']);
    expect(result.finding?.validatedPmids).toEqual([]);
    expect(result.finding?.pmidVerificationStatus).toBe('not_checked');
  });

  it('forces SEO aggregate findings to remain report-only SEO opportunities', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: validFindingContent({
                  taskType: 'recall_gap',
                  evidenceBoundary: 'human_clinical_required',
                  candidatePmids: ['3544968'],
                  clinicalRisk: 'high',
                  proposedClassification: 'possible_recall_gap',
                  recommendedAction: 'Review this SEO aggregate in the asynchronous audit queue.',
                }),
              },
            },
          ],
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(seoPacket);

    expect(result.valid).toBe(true);
    expect(result.finding).toMatchObject({
      taskType: 'seo_opportunity',
      evidenceBoundary: 'editorial_only',
      clinicalRisk: 'none',
      originalQueries: ['bacopa monnieri'],
      candidatePmids: [],
      validatedPmids: [],
      blockedFromProduction: true,
      requiresHumanReview: true,
    });
  });

  it('uses Kimi K2.6 structured output with non-thinking mode', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => validProviderBody(),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
      AUDIT_AGENT_MODEL: 'kimi-k2.6',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    await provider.evaluatePacket(packet);

    const requestBody = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(requestBody.response_format).toEqual(
      expect.objectContaining({
        type: 'json_schema',
        json_schema: expect.objectContaining({
          name: 'ResearchAuditFinding',
          strict: true,
        }),
      })
    );
    expect(requestBody.response_format.json_schema.schema.required).toContain('findingId');
    expect(requestBody.response_format.json_schema.schema.required).toContain('notesForReviewer');
    expect(requestBody.response_format.json_schema.schema.properties.validatedPmids.items.pattern).toBe(
      '^[1-9][0-9]{0,9}$'
    );
    expect(requestBody.thinking).toEqual({ type: 'disabled' });
    expect(requestBody.temperature).toBe(0.6);
  });

  it('skips before calling the provider when budget is exceeded', async () => {
    const fetchFn = jest.fn();
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
      AUDIT_AGENT_MAX_SPEND_USD_PER_RUN: '0',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.externalCalls).toBe(0);
    expect(result.skippedReason).toBe('budget_skipped');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('turns provider AbortError timeouts into sanitized rejected results', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new DOMException('This operation was aborted', 'AbortError'));
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.externalCalls).toBe(1);
    expect(result.rejectionReasons).toEqual(['provider request timed out']);
    expect(result.rejectedFinding).toEqual({ message: 'provider request timed out' });
    expect(JSON.stringify(result)).not.toContain('This operation was aborted');
  });

  it('sanitizes provider HTTP errors before returning report data', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          error: {
            message:
              'Your account org-15c6702e4995423188fb3ab4eca27f86 <ak-f9g643cpffni11frg8pi> is suspended due to insufficient balance',
            type: 'exceeded_current_quota_error',
          },
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.rejectionReasons).toEqual(['provider returned HTTP 429']);
    expect(result.rejectedFinding).toEqual({
      httpStatus: 429,
      errorType: 'exceeded_current_quota_error',
      message: 'provider rate limit or quota error',
    });
    expect(JSON.stringify(result)).not.toContain('org-15c');
    expect(JSON.stringify(result)).not.toContain('ak-f9g');
    expect(JSON.stringify(result)).not.toContain('balance');
  });

  it('sanitizes provider parse errors before returning report data', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not json with sk-secret-token <account-id>',
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.rejectedFinding).toEqual({
      message: 'provider response could not be parsed',
    });
    expect(JSON.stringify(result)).not.toContain('sk-secret-token');
    expect(JSON.stringify(result)).not.toContain('<account-id>');
  });

  it('sanitizes provider success bodies without parseable audit JSON', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          error: {
            message: 'debug account org-sensitive <ak-sensitive>',
            type: 'provider_empty_content',
          },
        }),
    });
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
    });
    const provider = new KimiResearchAuditProvider(config, fetchFn);

    const result = await provider.evaluatePacket(packet);

    expect(result.valid).toBe(false);
    expect(result.rejectionReasons).toEqual(['provider response did not include parseable audit JSON']);
    expect(result.rejectedFinding).toEqual({
      errorType: 'provider_empty_content',
      message: 'provider response could not be parsed',
    });
    expect(JSON.stringify(result)).not.toContain('org-sensitive');
    expect(JSON.stringify(result)).not.toContain('ak-sensitive');
  });
});
