import { createResearchAuditLambdaHandler, type ResearchAuditLambdaEvent } from './aws-lambda-handler';
import type { ResearchAuditObjectStore } from './aws-report-runner';
import type { ProviderAuditResult, ResearchAuditProviderAdapter } from './provider';

function event(overrides: Partial<ResearchAuditLambdaEvent> = {}): ResearchAuditLambdaEvent {
  return {
    input: { bucket: 'audit-inputs', key: 'manual/events.json' },
    output: { bucket: 'audit-reports', keyPrefix: 'report-only/manual' },
    ...overrides,
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

function objectStore(inputText = eventJson()): ResearchAuditObjectStore & {
  getText: jest.Mock;
  putText: jest.Mock;
} {
  return {
    getText: jest.fn().mockResolvedValue(inputText),
    putText: jest.fn().mockResolvedValue(undefined),
  };
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

describe('createResearchAuditLambdaHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUDIT_AGENT_ENABLED: 'false',
      AUDIT_AGENT_DRY_RUN: 'true',
      AUDIT_AGENT_MAX_EVENTS_PER_RUN: '5',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects invalid manual Lambda events before touching S3', async () => {
    const store = objectStore();
    const handler = createResearchAuditLambdaHandler({ objectStore: store });

    const response = await handler({} as ResearchAuditLambdaEvent);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      ok: false,
      error: 'event.input.bucket and event.input.key are required',
    });
    expect(store.getText).not.toHaveBeenCalled();
    expect(store.putText).not.toHaveBeenCalled();
  });

  it('runs report-only with safe defaults and no external provider, secret, or PubMed calls', async () => {
    const store = objectStore();
    const getSecretValue = jest.fn();
    const handler = createResearchAuditLambdaHandler({
      objectStore: store,
      getSecretValue,
    });

    const response = await handler(event({ useProviderSecret: true }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      ok: true,
      dryRun: true,
      reportOnly: true,
      enabled: false,
      totalPackets: 1,
      skippedPackets: 1,
      externalCalls: 0,
    }));
    expect(getSecretValue).not.toHaveBeenCalled();
    expect(store.getText).toHaveBeenCalledWith({ bucket: 'audit-inputs', key: 'manual/events.json' });
    expect(store.putText).toHaveBeenCalledTimes(3);
  });

  it('uses mocked Secrets Manager, provider, and PubMed only when explicitly enabled', async () => {
    process.env = {
      ...process.env,
      AUDIT_AGENT_ENABLED: 'true',
      AUDIT_AGENT_DRY_RUN: 'true',
    };
    const store = objectStore();
    const getSecretValue = jest.fn().mockResolvedValue('mock-moonshot-key');
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          uids: ['3544968'],
          '3544968': {
            uid: '3544968',
            title: 'Centella asiatica title match.',
            fulljournalname: 'Audit Journal',
            pubdate: '1987 Jan',
          },
        },
      }),
    } as Response);
    const mockProvider = provider(validProviderResult({
      finding: {
        ...validProviderResult().finding!,
        candidatePmids: ['3544968'],
      },
    }));
    const handler = createResearchAuditLambdaHandler({
      objectStore: store,
      getSecretValue,
      provider: mockProvider,
      pmidFetchFn: fetchFn,
    });

    const response = await handler(event({
      useProviderSecret: true,
      allowPubMedVerifier: true,
      pmidVerifier: {
        endpoint: 'https://mocked-eutils.local/esummary.fcgi',
      },
    }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.externalCalls).toBe(2);
    expect(getSecretValue).toHaveBeenCalledWith({
      secretId: 'suplementia/research-audit/moonshot-api-key',
      region: 'us-east-1',
    });
    expect(mockProvider.evaluatePacket).toHaveBeenCalledTimes(1);
    expect(store.putText).toHaveBeenCalledTimes(3);

    const jsonWrite = store.putText.mock.calls.find((call) => call[0].key.endsWith('.json'));
    expect(jsonWrite).toBeDefined();
    const report = JSON.parse(jsonWrite?.[1]);
    expect(report.results[0].finding.validatedPmids).toEqual(['3544968']);
    expect(report.results[0].matchedPmids).toEqual(['3544968']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
