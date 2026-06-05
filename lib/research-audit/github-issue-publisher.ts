import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { sanitizeProviderError } from './provider-error-sanitizer';
import type { ProviderAuditReport } from './provider-runner';
import type { ProviderAuditResult } from './provider';
import type { ResearchAuditFinding } from './schema';

export const DEFAULT_RESEARCH_AUDIT_ISSUE_LABELS = [
  'frontier-agent',
  'research-audit',
  'weekly-review',
  'needs-review',
] as const;

export interface ResearchAuditIssueReportRefs {
  json?: string;
  markdown?: string;
  summary?: string;
}

export interface ResearchAuditIssueObjectLocation {
  bucket: string;
  key: string;
}

export interface ResearchAuditIssueObjectStore {
  getText(location: ResearchAuditIssueObjectLocation): Promise<string>;
}

export interface ResearchAuditIssuePublisherInput {
  weekId: string;
  repository: string;
  reports: ResearchAuditIssueReportRefs;
  dryRun?: boolean;
  createIssue?: boolean;
}

export interface ResearchAuditIssuePublisherOptions {
  input: ResearchAuditIssuePublisherInput;
  report: ProviderAuditReport;
  github?: ResearchAuditGitHubClient;
  now?: () => Date;
}

export interface ResearchAuditGitHubIssue {
  number: number;
  title: string;
  body?: string;
}

export interface ResearchAuditGitHubClient {
  findIssueByTitle(repository: string, title: string): Promise<ResearchAuditGitHubIssue | undefined>;
  createIssue(input: {
    repository: string;
    title: string;
    body: string;
    labels: string[];
  }): Promise<ResearchAuditGitHubIssue>;
  updateIssue(input: {
    repository: string;
    issueNumber: number;
    body: string;
    labels: string[];
  }): Promise<ResearchAuditGitHubIssue>;
}

export interface ResearchAuditIssuePlan {
  weekId: string;
  repository: string;
  title: string;
  body: string;
  labels: string[];
  shouldCreateIssue: boolean;
  idempotencyKey: string;
  noActionableFindings: boolean;
  metrics: ResearchAuditIssueMetrics;
}

export interface ResearchAuditIssueMetrics {
  totalPackets: number;
  validFindings: number;
  rejectedFindings: number;
  highSeverityFindings: number;
  clinicalReviewFindings: number;
  seoFindings: number;
  providerErrorFindings: number;
  externalCalls: number;
  estimatedCostUsd: number;
}

export interface ResearchAuditIssuePublisherResult {
  dryRun: boolean;
  createIssue: boolean;
  action: 'rendered' | 'created' | 'updated' | 'skipped' | 'failed';
  issue?: ResearchAuditGitHubIssue;
  plan: ResearchAuditIssuePlan;
  error?: {
    message: string;
    errorType?: string;
    httpStatus?: number;
  };
}

export interface LocalResearchAuditIssuePublisherOptions {
  input: ResearchAuditIssuePublisherInput;
  outputDir?: string;
  now?: () => Date;
}

export function loadProviderAuditReportFromFile(filePath: string): ProviderAuditReport {
  return JSON.parse(readFileSync(filePath, 'utf8')) as ProviderAuditReport;
}

export async function loadProviderAuditReportFromObjectStore(
  objectStore: ResearchAuditIssueObjectStore,
  location: ResearchAuditIssueObjectLocation
): Promise<ProviderAuditReport> {
  return JSON.parse(await objectStore.getText(location)) as ProviderAuditReport;
}

export function buildResearchAuditIssuePlan(
  input: ResearchAuditIssuePublisherInput,
  report: ProviderAuditReport,
  now: Date = new Date()
): ResearchAuditIssuePlan {
  const metrics = buildIssueMetrics(report);
  const noActionableFindings = isNoActionableFindings(metrics, report);
  const title = `[Frontier Audit] Weekly findings - ${input.weekId}`;
  const labels = issueLabelsForReport(report, metrics);

  return {
    weekId: input.weekId,
    repository: input.repository,
    title,
    body: renderResearchAuditIssueMarkdown(input, report, metrics, noActionableFindings, now),
    labels,
    shouldCreateIssue: !noActionableFindings,
    idempotencyKey: `frontier-audit-week-${input.weekId}`,
    noActionableFindings,
    metrics,
  };
}

export async function publishResearchAuditWeeklyIssue(
  options: ResearchAuditIssuePublisherOptions
): Promise<ResearchAuditIssuePublisherResult> {
  const dryRun = options.input.dryRun !== false;
  const createIssue = options.input.createIssue === true;
  const plan = buildResearchAuditIssuePlan(
    options.input,
    options.report,
    options.now?.() ?? new Date()
  );

  if (dryRun || !createIssue) {
    return {
      dryRun,
      createIssue,
      action: plan.shouldCreateIssue ? 'rendered' : 'skipped',
      plan,
    };
  }

  if (!plan.shouldCreateIssue) {
    return {
      dryRun,
      createIssue,
      action: 'skipped',
      plan,
    };
  }

  if (!options.github) {
    return {
      dryRun,
      createIssue,
      action: 'failed',
      plan,
      error: { message: 'github client is required to create or update issues' },
    };
  }

  try {
    const existing = await options.github.findIssueByTitle(plan.repository, plan.title);
    const issue = existing
      ? await options.github.updateIssue({
          repository: plan.repository,
          issueNumber: existing.number,
          body: plan.body,
          labels: plan.labels,
        })
      : await options.github.createIssue({
          repository: plan.repository,
          title: plan.title,
          body: plan.body,
          labels: plan.labels,
        });

    return {
      dryRun,
      createIssue,
      action: existing ? 'updated' : 'created',
      issue,
      plan,
    };
  } catch (error) {
    return {
      dryRun,
      createIssue,
      action: 'failed',
      plan,
      error: sanitizeIssuePublisherError(error),
    };
  }
}

export async function renderLocalResearchAuditWeeklyIssue(
  options: LocalResearchAuditIssuePublisherOptions
): Promise<{ result: ResearchAuditIssuePublisherResult; markdownPath: string }> {
  if (!options.input.reports.json) {
    throw new Error('input.reports.json is required for local issue rendering');
  }

  const report = loadProviderAuditReportFromFile(options.input.reports.json);
  const result = await publishResearchAuditWeeklyIssue({
    input: {
      ...options.input,
      dryRun: true,
      createIssue: false,
    },
    report,
    now: options.now,
  });
  const outputDir = options.outputDir || '.research-audit-reports';
  mkdirSync(outputDir, { recursive: true });
  const markdownPath = path.join(
    outputDir,
    `github-issue-${options.input.weekId}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
  );
  writeFileSync(markdownPath, result.plan.body);

  return { result, markdownPath };
}

function buildIssueMetrics(report: ProviderAuditReport): ResearchAuditIssueMetrics {
  const validResults = report.results.filter((result) => result.valid && result.finding);
  const rejectedResults = report.results.filter((result) => !result.valid);

  return {
    totalPackets: report.totalPackets,
    validFindings: validResults.length,
    rejectedFindings: rejectedResults.length,
    highSeverityFindings: validResults.filter((result) => result.finding?.severity === 'high').length,
    clinicalReviewFindings: validResults.filter((result) => result.finding?.clinicalRisk !== 'none').length,
    seoFindings: validResults.filter((result) => result.finding?.taskType === 'seo_opportunity').length,
    providerErrorFindings: rejectedResults.filter((result) =>
      result.rejectionReasons.some((reason) => /provider|timeout|quota|rate limit/i.test(reason))
    ).length,
    externalCalls: report.externalCalls,
    estimatedCostUsd: report.totalCostEstimateUsd,
  };
}

function isNoActionableFindings(metrics: ResearchAuditIssueMetrics, report: ProviderAuditReport): boolean {
  return (
    metrics.validFindings === 0 &&
    metrics.highSeverityFindings === 0 &&
    metrics.clinicalReviewFindings === 0 &&
    metrics.seoFindings === 0 &&
    metrics.providerErrorFindings === 0 &&
    report.enabled === false
  );
}

function issueLabelsForReport(
  report: ProviderAuditReport,
  metrics: ResearchAuditIssueMetrics
): string[] {
  const labels = new Set<string>(DEFAULT_RESEARCH_AUDIT_ISSUE_LABELS);

  if (metrics.clinicalReviewFindings > 0) labels.add('clinical-review');
  if (metrics.seoFindings > 0) labels.add('seo');
  if (metrics.providerErrorFindings > 0) labels.add('provider-error');
  if (report.results.some((result) => result.pmidEntityMatchStatus === 'none_matched')) {
    labels.add('low-confidence');
  }
  if (report.results.some((result) => result.finding?.taskType === 'pipeline_failure')) {
    labels.add('product');
  }

  return [...labels];
}

function renderResearchAuditIssueMarkdown(
  input: ResearchAuditIssuePublisherInput,
  report: ProviderAuditReport,
  metrics: ResearchAuditIssueMetrics,
  noActionableFindings: boolean,
  now: Date
): string {
  const actionableResults = report.results
    .filter((result) => result.valid && result.finding)
    .sort(compareResultPriority)
    .slice(0, 10);
  const clinicalResults = actionableResults.filter((result) => result.finding?.clinicalRisk !== 'none');
  const seoResults = actionableResults.filter((result) => result.finding?.taskType === 'seo_opportunity');
  const rejectedResults = report.results.filter((result) => !result.valid);

  return [
    `## Summary`,
    `- Week: ${input.weekId}`,
    `- Idempotency key: frontier-audit-week-${input.weekId}`,
    `- Generated at: ${now.toISOString()}`,
    `- Repository: ${input.repository}`,
    `- Events audited: ${metrics.totalPackets}`,
    `- Valid findings: ${metrics.validFindings}`,
    `- Rejected findings: ${metrics.rejectedFindings}`,
    `- External calls: ${metrics.externalCalls}`,
    `- Estimated cost: $${metrics.estimatedCostUsd.toFixed(6)}`,
    `- Provider: ${report.provider}`,
    `- Model: ${report.model}`,
    `- Dry-run/report-only: ${report.dryRun && report.reportOnly ? 'yes' : 'no'}`,
    `- No actionable findings: ${noActionableFindings ? 'yes' : 'no'}`,
    '',
    `## Top Actionable Findings`,
    renderActionableFindings(actionableResults),
    '',
    `## Clinical / Editorial Review Needed`,
    renderClinicalFindings(clinicalResults),
    '',
    `## SEO / Product Opportunities`,
    renderSeoFindings(seoResults),
    '',
    `## Noise / Rejected Findings`,
    renderRejectedFindings(rejectedResults),
    '',
    `## Cost / Reliability`,
    `- Estimated cost: $${metrics.estimatedCostUsd.toFixed(6)}`,
    `- Provider calls: ${metrics.externalCalls}`,
    `- Provider errors/timeouts: ${metrics.providerErrorFindings}`,
    `- Skipped packets: ${report.skippedPackets}`,
    `- Validation failures: ${report.validationFailures}`,
    '',
    `## Reports`,
    `- JSON report: ${input.reports.json || 'not provided'}`,
    `- Markdown report: ${input.reports.markdown || 'not provided'}`,
    `- Summary: ${input.reports.summary || 'not provided'}`,
    '',
    `## Review Decision`,
    `- [ ] Actionable`,
    `- [ ] Needs more data`,
    `- [ ] Noisy / reject`,
    `- [ ] Create follow-up issue`,
    `- [ ] Create PR after human review`,
    '',
  ].join('\n');
}

function renderActionableFindings(results: ProviderAuditResult[]): string {
  if (results.length === 0) return '- No actionable findings in this report.';

  return results.map((result, index) => {
    const finding = result.finding!;
    return [
      `${index + 1}. ${finding.supplementName}`,
      `   - Type: ${finding.taskType}`,
      `   - Severity: ${finding.severity}`,
      `   - Why it matters: ${finding.problemDetected}`,
      `   - Recommended human action: ${finding.recommendedAction}`,
    ].join('\n');
  }).join('\n');
}

function renderClinicalFindings(results: ProviderAuditResult[]): string {
  if (results.length === 0) return '- None.';

  return results.map((result) => {
    const finding = result.finding!;
    return [
      `- Finding: ${finding.supplementName}`,
      `  - Clinical risk: ${finding.clinicalRisk}`,
      `  - Evidence boundary: ${finding.evidenceBoundary}`,
      `  - Candidate PMIDs: ${finding.candidatePmids.join(', ') || 'none'}`,
      `  - Validated PMIDs: ${finding.validatedPmids.join(', ') || 'none'}`,
      `  - Matched PMIDs: ${result.matchedPmids?.join(', ') || 'none'}`,
      `  - Human review required: ${finding.requiresHumanReview ? 'yes' : 'no'}`,
    ].join('\n');
  }).join('\n');
}

function renderSeoFindings(results: ProviderAuditResult[]): string {
  if (results.length === 0) return '- None.';

  return results.map((result) => {
    const finding = result.finding!;
    return [
      `- Finding: ${finding.supplementName}`,
      `  - Query: ${finding.originalQueries.join(', ')}`,
      `  - Recommended internal action: ${finding.recommendedAction}`,
    ].join('\n');
  }).join('\n');
}

function renderRejectedFindings(results: ProviderAuditResult[]): string {
  if (results.length === 0) return '- None.';
  const reasons = countReasons(results.flatMap((result) => result.rejectionReasons));

  return [
    `- Rejected count: ${results.length}`,
    `- Common rejection reasons:`,
    ...Object.entries(reasons).map(([reason, count]) => `  - ${reason}: ${count}`),
  ].join('\n');
}

function compareResultPriority(a: ProviderAuditResult, b: ProviderAuditResult): number {
  return severityRank(b.finding?.severity) - severityRank(a.finding?.severity);
}

function severityRank(severity: ResearchAuditFinding['severity'] | undefined): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  if (severity === 'low') return 1;
  return 0;
}

function countReasons(reasons: string[]): Record<string, number> {
  return reasons.reduce<Record<string, number>>((counts, reason) => {
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {});
}

function sanitizeIssuePublisherError(error: unknown): ResearchAuditIssuePublisherResult['error'] {
  const maybeError = error as { message?: unknown; status?: unknown; response?: { status?: unknown } };
  const status = typeof maybeError.status === 'number'
    ? maybeError.status
    : typeof maybeError.response?.status === 'number'
      ? maybeError.response.status
      : undefined;
  const body = typeof maybeError.message === 'string' ? maybeError.message : 'github issue publisher failed';
  const sanitized = sanitizeProviderError(body, status);

  return {
    message: sanitized.message === 'provider response could not be parsed'
      ? 'github issue publisher failed'
      : sanitized.message.replace(/^provider /, 'github '),
    errorType: sanitized.errorType,
    httpStatus: sanitized.httpStatus,
  };
}
