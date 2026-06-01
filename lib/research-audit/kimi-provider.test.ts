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

  it('uses the fixed Kimi K2.6 temperature required by Moonshot', async () => {
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
    expect(requestBody.temperature).toBe(1);
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

  it('sanitizes provider success bodies that are missing message content', async () => {
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
    expect(result.rejectionReasons).toEqual(['provider response did not include message content']);
    expect(result.rejectedFinding).toEqual({
      errorType: 'provider_empty_content',
      message: 'provider response could not be parsed',
    });
    expect(JSON.stringify(result)).not.toContain('org-sensitive');
    expect(JSON.stringify(result)).not.toContain('ak-sensitive');
  });
});
