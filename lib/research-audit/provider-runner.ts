import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { loadAuditFixtures } from './fixtures';
import { KimiResearchAuditProvider } from './kimi-provider';
import { buildAuditPacketFromFixture, type PacketBuildResult } from './packets';
import type { ResearchAuditPacket } from './packets';
import { verifyPubMedPmids, type PmidVerifierOptions } from './pmid-verifier';
import type { PmidArticleSummary, ProviderAuditResult, ResearchAuditProviderAdapter } from './provider';
import type { ResearchAuditProviderConfig } from './config';

export interface ProviderAuditReport {
  dryRun: true;
  reportOnly: true;
  externalCalls: number;
  provider: ResearchAuditProviderConfig['provider'];
  model: ResearchAuditProviderConfig['model'];
  enabled: boolean;
  totalPackets: number;
  skippedPackets: number;
  validationFailures: number;
  totalCostEstimateUsd: number;
  results: ProviderAuditResult[];
}

export interface ProviderAuditRunnerOptions {
  fixturePath?: string;
  outputDir?: string;
  limit?: number;
  pmidVerifier?: PmidVerifierOptions | false;
  provider?: ResearchAuditProviderAdapter;
}

export interface ProviderPacketAuditInput {
  id: string;
  packetResult: PacketBuildResult;
}

export async function runProviderFixtureAudit(
  config: ResearchAuditProviderConfig,
  options: ProviderAuditRunnerOptions = {}
): Promise<{ report: ProviderAuditReport; reportPaths: { jsonPath: string; markdownPath: string } }> {
  const fixtures = loadAuditFixtures(options.fixturePath);
  const limit = Math.min(options.limit ?? config.maxEventsPerRun, config.maxEventsPerRun);
  const selectedFixtures = fixtures.slice(0, limit);
  const packetInputs = selectedFixtures.map((fixture) => ({
    id: fixture.id,
    packetResult: buildAuditPacketFromFixture(fixture),
  }));

  return runProviderPacketAudit(config, packetInputs, options);
}

export async function runProviderPacketAudit(
  config: ResearchAuditProviderConfig,
  packetInputs: ProviderPacketAuditInput[],
  options: Pick<ProviderAuditRunnerOptions, 'outputDir' | 'pmidVerifier' | 'provider'> = {}
): Promise<{ report: ProviderAuditReport; reportPaths: { jsonPath: string; markdownPath: string } }> {
  const report = await buildProviderPacketAuditReport(config, packetInputs, options);

  return {
    report,
    reportPaths: writeProviderReport(report, options.outputDir || '.research-audit-reports'),
  };
}

export async function buildProviderPacketAuditReport(
  config: ResearchAuditProviderConfig,
  packetInputs: ProviderPacketAuditInput[],
  options: Pick<ProviderAuditRunnerOptions, 'pmidVerifier' | 'provider'> = {}
): Promise<ProviderAuditReport> {
  const provider = options.provider ?? new KimiResearchAuditProvider(config);
  const results: ProviderAuditResult[] = [];

  for (const input of packetInputs) {
    const { packetResult } = input;
    if (!packetResult.valid || !packetResult.packet) {
      results.push({
        packetId: `rap_${input.id.replace(/[^a-z0-9_-]/gi, '').toLowerCase()}`,
        provider: 'kimi',
        model: config.model,
        valid: false,
        rejectionReasons: packetResult.rejectionReasons,
        costEstimateUsd: 0,
        tokenEstimate: { input: 0, output: 0 },
        externalCalls: 0,
        skippedReason: 'redaction_rejected',
      });
      continue;
    }

    const result = await evaluatePacketWithJsonRetry(
      provider,
      packetResult.packet,
      config,
      results.reduce((sum, existingResult) => sum + existingResult.costEstimateUsd, 0)
    );
    results.push(await verifyProviderAuditResultPmids(result, options.pmidVerifier));
  }

  return {
    dryRun: true,
    reportOnly: true,
    externalCalls: results.reduce((sum, result) => sum + result.externalCalls, 0),
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
    totalPackets: results.length,
    skippedPackets: results.filter((result) => result.skippedReason).length,
    validationFailures: results.filter((result) => !result.valid && !result.skippedReason).length,
    totalCostEstimateUsd: Number(
      results.reduce((sum, result) => sum + result.costEstimateUsd, 0).toFixed(6)
    ),
    results,
  };
}

async function evaluatePacketWithJsonRetry(
  provider: ResearchAuditProviderAdapter,
  packet: ResearchAuditPacket,
  config: ResearchAuditProviderConfig,
  currentCostEstimateUsd: number
): Promise<ProviderAuditResult> {
  const firstResult = await provider.evaluatePacket(packet);
  if (!shouldRetryForParseableJson(firstResult)) return firstResult;

  const retryCostEstimateUsd = firstResult.costEstimateUsd;
  if (currentCostEstimateUsd + firstResult.costEstimateUsd + retryCostEstimateUsd > config.maxSpendUsdPerRun) {
    return firstResult;
  }

  const retryResult = await provider.evaluatePacket(packet);

  return combineRetryResults(firstResult, retryResult);
}

function shouldRetryForParseableJson(result: ProviderAuditResult): boolean {
  return (
    !result.valid &&
    !result.skippedReason &&
    result.externalCalls > 0 &&
    result.rejectionReasons.includes('provider response did not include parseable audit JSON')
  );
}

function combineRetryResults(
  firstResult: ProviderAuditResult,
  retryResult: ProviderAuditResult
): ProviderAuditResult {
  const costEstimateUsd = Number(
    (firstResult.costEstimateUsd + retryResult.costEstimateUsd).toFixed(6)
  );
  const externalCalls = firstResult.externalCalls + retryResult.externalCalls;
  const finding = retryResult.finding
    ? {
        ...retryResult.finding,
        costEstimateUsd,
      }
    : undefined;

  return {
    ...retryResult,
    costEstimateUsd,
    externalCalls,
    finding,
  };
}

export async function verifyProviderAuditResultPmids(
  result: ProviderAuditResult,
  verifierOptions: PmidVerifierOptions | false = {}
): Promise<ProviderAuditResult> {
  if (verifierOptions === false || !result.valid || !result.finding) return result;
  if (result.finding.candidatePmids.length === 0) return result;

  const verification = await verifyPubMedPmids(result.finding.candidatePmids, verifierOptions);
  const articleSummaries = buildPmidArticleSummaries(result.finding, verification.articles);
  const matchedPmids = articleSummaries
    .filter((article) => article.matchedTerms.length > 0)
    .map((article) => article.pmid);
  const matchStatus = pmidEntityMatchStatus(articleSummaries.length, matchedPmids.length);
  const finding = {
    ...result.finding,
    validatedPmids: verification.validatedPmids,
    pmidVerificationStatus: verification.status,
  };

  return {
    ...result,
    finding,
    articleSummaries,
    matchedPmids,
    pmidEntityMatchStatus: matchStatus,
    reviewWarnings: [
      ...(result.reviewWarnings || []),
      ...pmidReviewWarnings(matchStatus, verification.validatedPmids.length),
    ],
    externalCalls: result.externalCalls + verification.externalCalls,
    rejectionReasons: verification.error
      ? [...result.rejectionReasons, `pmid verification failed: ${verification.error}`]
      : result.rejectionReasons,
  };
}

function buildPmidArticleSummaries(
  finding: NonNullable<ProviderAuditResult['finding']>,
  articles: Array<{ pmid: string; title?: string; journal?: string; year?: string }>
): PmidArticleSummary[] {
  const terms = entityMatchTerms(finding);

  return articles.map((article) => {
    const normalizedTitle = normalizeEntityText(article.title || '');
    const matchedTerms = terms.filter((term) => normalizedTitle.includes(term));

    return {
      pmid: article.pmid,
      title: article.title,
      journal: article.journal,
      year: article.year,
      matchedTerms,
    };
  });
}

function entityMatchTerms(finding: NonNullable<ProviderAuditResult['finding']>): string[] {
  const rawTerms = [
    finding.supplementName,
    ...finding.originalQueries,
    ...finding.suggestedAliases,
  ];

  return [...new Set(rawTerms.map(normalizeEntityText).filter((term) => term.length >= 5))];
}

function normalizeEntityText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function pmidEntityMatchStatus(
  articleCount: number,
  matchedCount: number
): NonNullable<ProviderAuditResult['pmidEntityMatchStatus']> {
  if (articleCount === 0) return 'not_checked';
  if (matchedCount === 0) return 'none_matched';
  if (matchedCount === articleCount) return 'all_matched';
  return 'partially_matched';
}

function pmidReviewWarnings(
  status: NonNullable<ProviderAuditResult['pmidEntityMatchStatus']>,
  validatedCount: number
): string[] {
  if (status !== 'none_matched' || validatedCount === 0) return [];

  return [
    'PubMed verified the candidate PMIDs exist, but no ESummary title matched the supplement, original query, or suggested aliases; treat these PMIDs as low-confidence reviewer context.',
  ];
}

export function renderProviderAuditMarkdown(report: ProviderAuditReport): string {
  const lines = [
    '# Research Audit Provider Dry Run',
    '',
    `- Provider: ${report.provider}`,
    `- Model: ${report.model}`,
    `- Enabled: ${report.enabled ? 'yes' : 'no'}`,
    `- Report-only: ${report.reportOnly ? 'yes' : 'no'}`,
    `- External calls: ${report.externalCalls}`,
    `- Packets: ${report.totalPackets}`,
    `- Skipped packets: ${report.skippedPackets}`,
    `- Validation failures: ${report.validationFailures}`,
    `- Estimated total cost: $${report.totalCostEstimateUsd.toFixed(6)}`,
    '',
    '| Packet | Status | PMID match | External calls | Cost | Reason | Warning |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
  ];

  for (const result of report.results) {
    lines.push([
      result.packetId,
      result.valid ? 'valid' : result.skippedReason || 'rejected',
      result.pmidEntityMatchStatus || 'n/a',
      String(result.externalCalls),
      `$${result.costEstimateUsd.toFixed(6)}`,
      result.rejectionReasons.join('; ') || 'n/a',
      result.reviewWarnings?.join('; ') || 'n/a',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return `${lines.join('\n')}\n`;
}

function writeProviderReport(report: ProviderAuditReport, outputDir: string) {
  mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `provider-audit-${timestamp}.json`);
  const markdownPath = path.join(outputDir, `provider-audit-${timestamp}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderProviderAuditMarkdown(report));

  return { jsonPath, markdownPath };
}
