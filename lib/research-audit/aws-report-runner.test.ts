import { loadResearchAuditProviderConfig } from './config';
import { runAwsResearchAuditReportOnly, type ResearchAuditObjectStore } from './aws-report-runner';
import type { ProviderAuditResult, ResearchAuditProviderAdapter } from './provider';

function objectStore(inputText: string): ResearchAuditObjectStore & {
  getText: jest.Mock;
  putText: jest.Mock;
} {
  return {
    getText: jest.fn().mockResolvedValue(inputText),
    putText: jest.fn().mockResolvedValue(undefined),
  };
}

function eventJson() {
  return JSON.stringify({
    events: [
      {
        id: 'seo-mx-centella-low-ctr',
        source: 'search_console',
        query: 'gotu kola beneficios',
        normalizedQuery: 'Centella asiatica',
        pagePath: '/es/portal/supplement/centella-asiatica',
        country: 'Mexico',
        clicks: 5,
        impressions: 620,
        ctr: 0.81,
        averagePosition: 11.4,
      },
    ],
  });
}

function validProviderResult(overrides: Partial<ProviderAuditResult> = {}): ProviderAuditResult {
  const costEstimateUsd = overrides.costEstimateUsd ?? 0.002;

  return {
    packetId: 'rap_event_seo-mx-centella-low-ctr',
    provider: 'kimi',
    model: 'kimi-k2.6',
    valid: true,
    finding: {
      findingId: 'raf_event_seo_mx_centella_low_ctr',
      createdAt: '2026-06-02T00:00:00.000Z',
      provider: 'kimi',
      model: 'kimi-k2.6',
      taskType: 'seo_opportunity',
      severity: 'medium',
      supplementName: 'Centella asiatica',
      originalQueries: ['gotu kola beneficios'],
      problemDetected: 'Low CTR suggests an SEO snippet mismatch.',
      evidenceBoundary: 'operational_only',
      suggestedAliases: ['gotu kola'],
      candidatePmids: [],
      validatedPmids: [],
      pmidVerificationStatus: 'not_checked',
      proposedClassification: 'needs_human_review',
      clinicalRisk: 'none',
      recommendedAction: 'Review title, meta description, headings, and internal links for this page.',
      blockedFromProduction: true,
      requiresHumanReview: true,
      confidence: 0.8,
      redactionApplied: true,
      costEstimateUsd,
      tokenEstimate: { input: 1000, output: 300 },
    },
    rejectionReasons: [],
    costEstimateUsd,
    tokenEstimate: { input: 1000, output: 300 },
    externalCalls: 1,
    ...overrides,
  };
}

function provider(result: ProviderAuditResult): ResearchAuditProviderAdapter {
  return {
    provider: 'kimi',
    model: 'kimi-k2.6',
    evaluatePacket: jest.fn().mockResolvedValue(result),
  };
}

describe('runAwsResearchAuditReportOnly', () => {
  it('reads aggregate events from S3 and writes report-only artifacts while disabled', async () => {
    const store = objectStore(eventJson());
    const getSecretValue = jest.fn();

    const result = await runAwsResearchAuditReportOnly({
      input: { bucket: 'audit-inputs', key: 'manual/events.json' },
      output: { bucket: 'audit-reports', keyPrefix: 'report-only/2026-06-02' },
      objectStore: store,
      getSecretValue,
      now: () => new Date('2026-06-02T12:00:00.000Z'),
    });

    expect(getSecretValue).not.toHaveBeenCalled();
    expect(result.report.enabled).toBe(false);
    expect(result.report.dryRun).toBe(true);
    expect(result.report.reportOnly).toBe(true);
    expect(result.report.externalCalls).toBe(0);
    expect(result.report.results[0]?.skippedReason).toBe('disabled');
    expect(store.getText).toHaveBeenCalledWith({ bucket: 'audit-inputs', key: 'manual/events.json' });
    expect(store.putText).toHaveBeenCalledTimes(3);
    expect(store.putText).toHaveBeenCalledWith(
      {
        bucket: 'audit-reports',
        key: 'report-only/2026-06-02/provider-audit-2026-06-02T12-00-00-000Z.json',
      },
      expect.stringContaining('"reportOnly": true'),
      'application/json'
    );
    expect(store.putText).toHaveBeenCalledWith(
      {
        bucket: 'audit-reports',
        key: 'report-only/2026-06-02/provider-audit-2026-06-02T12-00-00-000Z.md',
      },
      expect.stringContaining('# Research Audit Provider Dry Run'),
      'text/markdown'
    );
    expect(store.putText).toHaveBeenCalledWith(
      {
        bucket: 'audit-reports',
        key: 'report-only/2026-06-02/summary-2026-06-02T12-00-00-000Z.json',
      },
      expect.stringContaining('"totalPackets": 1'),
      'application/json'
    );
  });

  it('loads Secrets Manager only when provider is explicitly enabled', async () => {
    const store = objectStore(eventJson());
    const getSecretValue = jest.fn().mockResolvedValue('moonshot-test-key');
    const mockProvider = provider(validProviderResult());

    const result = await runAwsResearchAuditReportOnly({
      input: { bucket: 'audit-inputs', key: 'manual/events.json' },
      output: { bucket: 'audit-reports', keyPrefix: 'report-only/2026-06-02/' },
      objectStore: store,
      config: loadResearchAuditProviderConfig({
        AUDIT_AGENT_ENABLED: 'true',
        AUDIT_AGENT_DRY_RUN: 'true',
        AUDIT_AGENT_MAX_EVENTS_PER_RUN: '10',
      }),
      provider: mockProvider,
      useProviderSecret: true,
      getSecretValue,
      region: 'us-east-1',
      now: () => new Date('2026-06-02T12:00:00.000Z'),
    });

    expect(getSecretValue).toHaveBeenCalledWith({
      secretId: 'suplementia/research-audit/moonshot-api-key',
      region: 'us-east-1',
    });
    expect(mockProvider.evaluatePacket).toHaveBeenCalledTimes(1);
    expect(result.report.enabled).toBe(true);
    expect(result.report.externalCalls).toBe(1);
    expect(result.report.results[0]?.valid).toBe(true);
  });

  it('runs PubMed verification only through explicit mocked verifier options', async () => {
    const store = objectStore(eventJson());
    const mockProvider = provider(validProviderResult({
      finding: {
        ...validProviderResult().finding!,
        candidatePmids: ['3544968'],
      },
    }));
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          uids: ['3544968'],
          '3544968': {
            uid: '3544968',
            title: 'Centella asiatica and SEO-neutral evidence review.',
            fulljournalname: 'Audit Journal',
            pubdate: '1987 Jan',
          },
        },
      }),
    } as Response);

    const result = await runAwsResearchAuditReportOnly({
      input: { bucket: 'audit-inputs', key: 'manual/events.json' },
      output: { bucket: 'audit-reports', keyPrefix: 'report-only/2026-06-02' },
      objectStore: store,
      config: loadResearchAuditProviderConfig({
        AUDIT_AGENT_ENABLED: 'true',
        AUDIT_AGENT_DRY_RUN: 'true',
      }),
      provider: mockProvider,
      pmidVerifier: {
        endpoint: 'https://mocked-eutils.local/esummary.fcgi',
        fetchFn,
      },
      now: () => new Date('2026-06-02T12:00:00.000Z'),
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.report.results[0]?.finding?.validatedPmids).toEqual(['3544968']);
    expect(result.report.results[0]?.finding?.pmidVerificationStatus).toBe('all_valid');
    expect(result.report.results[0]?.matchedPmids).toEqual(['3544968']);
  });
});

