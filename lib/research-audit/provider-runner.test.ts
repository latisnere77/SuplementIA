import { loadResearchAuditProviderConfig } from './config';
import { runProviderFixtureAudit, runProviderPacketAudit, verifyProviderAuditResultPmids } from './provider-runner';
import type { ProviderAuditResult, ResearchAuditProviderAdapter } from './provider';

const packetInput = {
  id: 'retry-event',
  packetResult: {
    valid: true,
    packet: {
      packetId: 'rap_retry_event',
      queryFingerprint: 'abc123',
      redactedQuery: 'centella asiatica',
      normalizedQuery: 'Centella asiatica',
      statusCounts: { insufficient_data: 2 },
      fallbackCounts: {},
      deterministicPubMedProfile: undefined,
    },
    rejectionReasons: [],
  },
};

function validResult(overrides: Partial<ProviderAuditResult> = {}): ProviderAuditResult {
  const costEstimateUsd = overrides.costEstimateUsd ?? 0.001;
  return {
    packetId: 'rap_retry_event',
    provider: 'kimi',
    model: 'kimi-k2.6',
    valid: true,
    finding: {
      findingId: 'raf_retry_event_abc123',
      createdAt: '2026-05-28T00:00:00.000Z',
      provider: 'kimi',
      model: 'kimi-k2.6',
      taskType: 'alias_gap',
      severity: 'medium',
      supplementName: 'Centella asiatica',
      originalQueries: ['centella asiatica'],
      problemDetected: 'The provider found an alias gap.',
      evidenceBoundary: 'human_clinical_required',
      suggestedAliases: ['gotu kola'],
      candidatePmids: [],
      validatedPmids: [],
      pmidVerificationStatus: 'not_checked',
      proposedClassification: 'needs_human_review',
      clinicalRisk: 'low',
      recommendedAction: 'Review this offline audit finding in the asynchronous audit queue.',
      blockedFromProduction: true,
      requiresHumanReview: true,
      confidence: 0.7,
      redactionApplied: true,
      costEstimateUsd,
      tokenEstimate: { input: 500, output: 250 },
    },
    rejectedFinding: undefined,
    rejectionReasons: [],
    costEstimateUsd,
    tokenEstimate: { input: 500, output: 250 },
    externalCalls: 1,
    ...overrides,
  };
}

function parseFailureResult(costEstimateUsd = 0.001): ProviderAuditResult {
  return {
    packetId: 'rap_retry_event',
    provider: 'kimi',
    model: 'kimi-k2.6',
    valid: false,
    rejectionReasons: ['provider response did not include parseable audit JSON'],
    rejectedFinding: { message: 'provider response could not be parsed' },
    costEstimateUsd,
    tokenEstimate: { input: 500, output: 250 },
    externalCalls: 1,
  };
}

describe('runProviderFixtureAudit', () => {
  it('produces report-only skipped results while the provider is disabled', async () => {
    const { report } = await runProviderFixtureAudit(loadResearchAuditProviderConfig({}), {
      limit: 2,
      outputDir: '.research-audit-reports/test-provider-runner',
    });

    expect(report.dryRun).toBe(true);
    expect(report.reportOnly).toBe(true);
    expect(report.enabled).toBe(false);
    expect(report.externalCalls).toBe(0);
    expect(report.totalPackets).toBe(2);
    expect(report.skippedPackets).toBe(2);
    expect(report.validationFailures).toBe(0);
    expect(report.results.every((result) => result.skippedReason === 'disabled')).toBe(true);
  });

  it('does not let a provider mark PMIDs valid without deterministic PubMed verification', async () => {
    const result: ProviderAuditResult = {
      packetId: 'rap_test',
      provider: 'kimi',
      model: 'kimi-k2.6',
      valid: true,
      finding: {
        findingId: 'raf_provider_test_002',
        createdAt: '2026-05-28T00:00:00.000Z',
        provider: 'kimi',
        model: 'kimi-k2.6',
        taskType: 'recall_gap',
        severity: 'medium',
        supplementName: 'Centella asiatica',
        originalQueries: ['centella asiatica'],
        problemDetected: 'The provider suggested a PMID candidate.',
        evidenceBoundary: 'human_clinical_required',
        suggestedAliases: ['gotu kola'],
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
      },
      rejectedFinding: undefined,
      rejectionReasons: [],
      costEstimateUsd: 0.001,
      tokenEstimate: { input: 2000, output: 500 },
      externalCalls: 1,
    };
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { uids: [] } }),
    } as Response);

    const verified = await verifyProviderAuditResultPmids(result, { fetchFn });

    expect(verified.finding?.validatedPmids).toEqual([]);
    expect(verified.finding?.pmidVerificationStatus).toBe('none_valid');
    expect(verified.externalCalls).toBe(2);
  });

  it('can skip PMID verification explicitly for provider smoke tests', async () => {
    const result: ProviderAuditResult = {
      packetId: 'rap_test',
      provider: 'kimi',
      model: 'kimi-k2.6',
      valid: true,
      finding: {
        findingId: 'raf_provider_test_003',
        createdAt: '2026-05-28T00:00:00.000Z',
        provider: 'kimi',
        model: 'kimi-k2.6',
        taskType: 'recall_gap',
        severity: 'medium',
        supplementName: 'Garcinia cambogia',
        originalQueries: ['garcinia cambogia'],
        problemDetected: 'The provider suggested a PMID candidate.',
        evidenceBoundary: 'human_clinical_required',
        suggestedAliases: ['hydroxycitric acid'],
        candidatePmids: ['3544968'],
        validatedPmids: [],
        pmidVerificationStatus: 'not_checked',
        proposedClassification: 'possible_recall_gap',
        clinicalRisk: 'low',
        recommendedAction: 'Review this recall gap candidate in the asynchronous audit queue.',
        blockedFromProduction: true,
        requiresHumanReview: true,
        confidence: 0.7,
        redactionApplied: true,
        costEstimateUsd: 0.001,
        tokenEstimate: { input: 2000, output: 500 },
      },
      rejectionReasons: [],
      costEstimateUsd: 0.001,
      tokenEstimate: { input: 2000, output: 500 },
      externalCalls: 1,
    };

    const verified = await verifyProviderAuditResultPmids(result, false);

    expect(verified).toBe(result);
    expect(verified.externalCalls).toBe(1);
    expect(verified.finding?.validatedPmids).toEqual([]);
    expect(verified.finding?.pmidVerificationStatus).toBe('not_checked');
  });

  it('retries once when the provider does not return parseable audit JSON', async () => {
    const provider: ResearchAuditProviderAdapter = {
      provider: 'kimi',
      model: 'kimi-k2.6',
      evaluatePacket: jest
        .fn()
        .mockResolvedValueOnce(parseFailureResult())
        .mockResolvedValueOnce(validResult()),
    };
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
      AUDIT_AGENT_MAX_SPEND_USD_PER_RUN: '1',
    });

    const { report } = await runProviderPacketAudit(config, [packetInput], {
      outputDir: '.research-audit-reports/test-provider-runner',
      pmidVerifier: false,
      provider,
    });

    expect(provider.evaluatePacket).toHaveBeenCalledTimes(2);
    expect(report.externalCalls).toBe(2);
    expect(report.totalCostEstimateUsd).toBe(0.002);
    expect(report.validationFailures).toBe(0);
    expect(report.results[0].valid).toBe(true);
    expect(report.results[0].finding?.costEstimateUsd).toBe(0.002);
  });

  it('does not retry when the retry would exceed the run spend cap', async () => {
    const provider: ResearchAuditProviderAdapter = {
      provider: 'kimi',
      model: 'kimi-k2.6',
      evaluatePacket: jest.fn().mockResolvedValue(parseFailureResult(0.006)),
    };
    const config = loadResearchAuditProviderConfig({
      AUDIT_AGENT_ENABLED: 'true',
      MOONSHOT_API_KEY: 'test-key',
      AUDIT_AGENT_MAX_SPEND_USD_PER_RUN: '0.01',
    });

    const { report } = await runProviderPacketAudit(config, [packetInput], {
      outputDir: '.research-audit-reports/test-provider-runner',
      pmidVerifier: false,
      provider,
    });

    expect(provider.evaluatePacket).toHaveBeenCalledTimes(1);
    expect(report.externalCalls).toBe(1);
    expect(report.totalCostEstimateUsd).toBe(0.006);
    expect(report.validationFailures).toBe(1);
  });
});
