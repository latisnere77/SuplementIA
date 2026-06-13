import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import {
  buildResearchAuditIssuePlan,
  createResearchAuditGitHubClient,
  loadProviderAuditReportFromObjectStore,
  publishResearchAuditWeeklyIssue,
  renderLocalResearchAuditWeeklyIssue,
  type ResearchAuditGitHubFetch,
  type ResearchAuditGitHubClient,
} from './github-issue-publisher';
import type { ProviderAuditReport } from './provider-runner';
import type { ProviderAuditResult } from './provider';

function validResult(overrides: Partial<ProviderAuditResult> = {}): ProviderAuditResult {
  const costEstimateUsd = overrides.costEstimateUsd ?? 0.004;

  return {
    packetId: 'rap_event_centella_alias',
    provider: 'kimi',
    model: 'kimi-k2.6',
    valid: true,
    finding: {
      findingId: 'raf_centella_alias_2026',
      createdAt: '2026-06-05T00:00:00.000Z',
      provider: 'kimi',
      model: 'kimi-k2.6',
      taskType: 'alias_gap',
      severity: 'medium',
      supplementName: 'Centella asiatica',
      originalQueries: ['gotu kola'],
      problemDetected: 'Users search gotu kola, but the app may need stronger alias coverage.',
      evidenceBoundary: 'human_clinical_required',
      suggestedAliases: ['Centella asiatica', 'gotu kola'],
      candidatePmids: ['3544968'],
      validatedPmids: ['3544968'],
      pmidVerificationStatus: 'all_valid',
      proposedClassification: 'possible_recall_gap',
      clinicalRisk: 'low',
      recommendedAction: 'Review alias handling and decide whether a follow-up issue is needed.',
      blockedFromProduction: true,
      requiresHumanReview: true,
      confidence: 0.74,
      redactionApplied: true,
      costEstimateUsd,
      tokenEstimate: { input: 1100, output: 300 },
    },
    matchedPmids: ['3544968'],
    rejectionReasons: [],
    costEstimateUsd,
    tokenEstimate: { input: 1100, output: 300 },
    externalCalls: 2,
    ...overrides,
  };
}

function report(overrides: Partial<ProviderAuditReport> = {}): ProviderAuditReport {
  const results = overrides.results ?? [validResult()];

  return {
    dryRun: true,
    reportOnly: true,
    externalCalls: results.reduce((sum, result) => sum + result.externalCalls, 0),
    provider: 'kimi',
    model: 'kimi-k2.6',
    enabled: true,
    totalPackets: results.length,
    skippedPackets: results.filter((result) => result.skippedReason).length,
    validationFailures: results.filter((result) => !result.valid && !result.skippedReason).length,
    totalCostEstimateUsd: Number(
      results.reduce((sum, result) => sum + result.costEstimateUsd, 0).toFixed(6)
    ),
    results,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    weekId: '2026-W23',
    repository: 'latisnere77/SuplementIA',
    reports: {
      json: 's3://suplementai-research-audit-reports/report-only/provider-audit.json',
      markdown: 's3://suplementai-research-audit-reports/report-only/provider-audit.md',
      summary: 's3://suplementai-research-audit-reports/report-only/summary.json',
    },
    dryRun: true,
    createIssue: false,
    ...overrides,
  };
}

function githubClient(overrides: Partial<ResearchAuditGitHubClient> = {}): ResearchAuditGitHubClient {
  return {
    findIssueByTitle: jest.fn().mockResolvedValue(undefined),
    createIssue: jest.fn().mockResolvedValue({
      number: 77,
      title: '[Frontier Audit] Weekly findings - 2026-W23',
    }),
    updateIssue: jest.fn().mockResolvedValue({
      number: 77,
      title: '[Frontier Audit] Weekly findings - 2026-W23',
    }),
    ...overrides,
  };
}

describe('github issue publisher', () => {
  it('renders a deterministic dry-run issue without calling GitHub', async () => {
    const github = githubClient();

    const result = await publishResearchAuditWeeklyIssue({
      input: input(),
      report: report(),
      github,
      now: () => new Date('2026-06-05T12:00:00.000Z'),
    });

    expect(result.action).toBe('rendered');
    expect(result.dryRun).toBe(true);
    expect(result.createIssue).toBe(false);
    expect(result.plan.title).toBe('[Frontier Audit] Weekly findings - 2026-W23');
    expect(result.plan.idempotencyKey).toBe('frontier-audit-week-2026-W23');
    expect(result.plan.body).toContain('## Top Actionable Findings');
    expect(result.plan.body).toContain('Centella asiatica');
    expect(result.plan.labels).toEqual(expect.arrayContaining([
      'frontier-agent',
      'research-audit',
      'weekly-review',
      'needs-review',
      'clinical-review',
    ]));
    expect(github.findIssueByTitle).not.toHaveBeenCalled();
    expect(github.createIssue).not.toHaveBeenCalled();
    expect(github.updateIssue).not.toHaveBeenCalled();
  });

  it('marks disabled skipped reports as no-actionable and skips issue creation', async () => {
    const skippedReport = report({
      enabled: false,
      results: [{
        packetId: 'rap_event_disabled',
        provider: 'kimi',
        model: 'kimi-k2.6',
        valid: false,
        rejectionReasons: ['AUDIT_AGENT_ENABLED is not true'],
        costEstimateUsd: 0.001,
        tokenEstimate: { input: 200, output: 100 },
        externalCalls: 0,
        skippedReason: 'disabled',
      }],
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: skippedReport,
      github: githubClient(),
    });

    expect(result.action).toBe('skipped');
    expect(result.plan.noActionableFindings).toBe(true);
    expect(result.plan.shouldCreateIssue).toBe(false);
    expect(result.plan.body).toContain('No actionable findings: yes');
  });

  it('updates an existing weekly issue instead of creating a duplicate', async () => {
    const github = githubClient({
      findIssueByTitle: jest.fn().mockResolvedValue({
        number: 42,
        title: '[Frontier Audit] Weekly findings - 2026-W23',
      }),
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: report(),
      github,
    });

    expect(result.action).toBe('updated');
    expect(github.findIssueByTitle).toHaveBeenCalledWith(
      'latisnere77/SuplementIA',
      '[Frontier Audit] Weekly findings - 2026-W23'
    );
    expect(github.updateIssue).toHaveBeenCalledWith(expect.objectContaining({
      repository: 'latisnere77/SuplementIA',
      issueNumber: 42,
    }));
    expect(github.createIssue).not.toHaveBeenCalled();
  });

  it('sanitizes GitHub failures without exposing raw token-like values', async () => {
    const github = githubClient({
      findIssueByTitle: jest.fn().mockRejectedValue(new Error(
        '401 token ghp_secret org-abc account 123 <billing_meta>'
      )),
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: report(),
      github,
    });

    expect(result.action).toBe('failed');
    expect(result.error?.message).toBe('github issue publisher failed');
    expect(JSON.stringify(result.error)).not.toContain('ghp_secret');
    expect(JSON.stringify(result.error)).not.toContain('org-abc');
    expect(JSON.stringify(result.error)).not.toContain('billing_meta');
  });

  it('renders a local Markdown issue from an existing JSON report file', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'research-audit-issue-publisher-'));
    const jsonPath = path.join(dir, 'provider-audit.json');
    const outputDir = path.join(dir, 'out');
    writeFileSync(jsonPath, `${JSON.stringify(report(), null, 2)}\n`);

    const { result, markdownPath } = await renderLocalResearchAuditWeeklyIssue({
      input: input({
        reports: {
          json: jsonPath,
          markdown: 's3://reports/provider-audit.md',
          summary: 's3://reports/summary.json',
        },
      }),
      outputDir,
      now: () => new Date('2026-06-05T12:00:00.000Z'),
    });

    expect(result.action).toBe('rendered');
    expect(readFileSync(markdownPath, 'utf8')).toContain('[ ] Create follow-up issue');
  });

  it('loads provider reports from a mocked object store without AWS calls', async () => {
    const objectStore = {
      getText: jest.fn().mockResolvedValue(`${JSON.stringify(report())}\n`),
    };

    const loadedReport = await loadProviderAuditReportFromObjectStore(objectStore, {
      bucket: 'audit-reports',
      key: 'report-only/provider-audit.json',
    });
    const result = await publishResearchAuditWeeklyIssue({
      input: input({
        reports: {
          json: 's3://audit-reports/report-only/provider-audit.json',
          markdown: 's3://audit-reports/report-only/provider-audit.md',
          summary: 's3://audit-reports/report-only/summary.json',
        },
      }),
      report: loadedReport,
    });

    expect(objectStore.getText).toHaveBeenCalledWith({
      bucket: 'audit-reports',
      key: 'report-only/provider-audit.json',
    });
    expect(result.action).toBe('rendered');
    expect(result.plan.body).toContain('s3://audit-reports/report-only/provider-audit.json');
  });

  it('fails closed when local JSON report path is missing', async () => {
    await expect(renderLocalResearchAuditWeeklyIssue({
      input: input({ reports: { markdown: 's3://reports/provider-audit.md' } }),
    })).rejects.toThrow('input.reports.json is required for local issue rendering');
  });

  it('derives SEO and provider-error labels from report metadata', () => {
    const plan = buildResearchAuditIssuePlan(input(), report({
      results: [
        validResult({
          finding: {
            ...validResult().finding!,
            taskType: 'seo_opportunity',
            clinicalRisk: 'none',
            evidenceBoundary: 'operational_only',
            candidatePmids: [],
            validatedPmids: [],
            pmidVerificationStatus: 'not_checked',
          },
        }),
        {
          packetId: 'rap_event_timeout',
          provider: 'kimi',
          model: 'kimi-k2.6',
          valid: false,
          rejectedFinding: { error: 'sanitized' },
          rejectionReasons: ['provider timeout'],
          costEstimateUsd: 0.002,
          tokenEstimate: { input: 1000, output: 300 },
          externalCalls: 1,
        },
      ],
    }));

    expect(plan.labels).toEqual(expect.arrayContaining(['seo', 'provider-error']));
  });

  it('creates a real GitHub issue through a mocked REST client without exposing the token', async () => {
    const fetchImpl: ResearchAuditGitHubFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          number: 88,
          title: '[Frontier Audit] Weekly findings - 2026-W23',
        }),
      });
    const github = createResearchAuditGitHubClient({
      token: 'ghp_sensitive_token',
      apiBaseUrl: 'https://api.github.test',
      fetchImpl,
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: report(),
      github,
    });

    expect(result.action).toBe('created');
    expect(result.issue?.number).toBe(88);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.github.test/repos/latisnere77/SuplementIA/issues?state=open&labels=frontier-agent%2Cresearch-audit%2Cweekly-review&per_page=100',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.github.test/repos/latisnere77/SuplementIA/issues',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"labels"'),
      })
    );
    expect(JSON.stringify(result)).not.toContain('ghp_sensitive_token');
  });

  it('uses the mocked REST client to update an existing weekly GitHub issue', async () => {
    const fetchImpl: ResearchAuditGitHubFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue([{
          number: 99,
          title: '[Frontier Audit] Weekly findings - 2026-W23',
        }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          number: 99,
          title: '[Frontier Audit] Weekly findings - 2026-W23',
        }),
      });
    const github = createResearchAuditGitHubClient({
      token: 'github-token',
      apiBaseUrl: 'https://api.github.test',
      fetchImpl,
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: report(),
      github,
    });

    expect(result.action).toBe('updated');
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'https://api.github.test/repos/latisnere77/SuplementIA/issues/99',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('sanitizes mocked REST failures without saving raw response bodies', async () => {
    const fetchImpl: ResearchAuditGitHubFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        message: 'Bad credentials ghp_sensitive_token <account_metadata>',
      }),
    });
    const github = createResearchAuditGitHubClient({
      token: 'ghp_sensitive_token',
      apiBaseUrl: 'https://api.github.test',
      fetchImpl,
    });

    const result = await publishResearchAuditWeeklyIssue({
      input: input({ dryRun: false, createIssue: true }),
      report: report(),
      github,
    });

    expect(result.action).toBe('failed');
    expect(result.error?.httpStatus).toBe(401);
    expect(JSON.stringify(result.error)).not.toContain('ghp_sensitive_token');
    expect(JSON.stringify(result.error)).not.toContain('account_metadata');
  });
});
