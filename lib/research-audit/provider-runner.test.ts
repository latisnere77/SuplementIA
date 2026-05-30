import { loadResearchAuditProviderConfig } from './config';
import { runProviderFixtureAudit, verifyProviderAuditResultPmids } from './provider-runner';
import type { ProviderAuditResult } from './provider';

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
});
