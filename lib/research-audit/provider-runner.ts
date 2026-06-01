import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { loadAuditFixtures } from './fixtures';
import { KimiResearchAuditProvider } from './kimi-provider';
import { buildAuditPacketFromFixture, type PacketBuildResult } from './packets';
import { verifyPubMedPmids, type PmidVerifierOptions } from './pmid-verifier';
import type { ProviderAuditResult } from './provider';
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
  options: Pick<ProviderAuditRunnerOptions, 'outputDir' | 'pmidVerifier'> = {}
): Promise<{ report: ProviderAuditReport; reportPaths: { jsonPath: string; markdownPath: string } }> {
  const provider = new KimiResearchAuditProvider(config);
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

    const result = await provider.evaluatePacket(packetResult.packet);
    results.push(await verifyProviderAuditResultPmids(result, options.pmidVerifier));
  }

  const report: ProviderAuditReport = {
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

  return {
    report,
    reportPaths: writeProviderReport(report, options.outputDir || '.research-audit-reports'),
  };
}

export async function verifyProviderAuditResultPmids(
  result: ProviderAuditResult,
  verifierOptions: PmidVerifierOptions | false = {}
): Promise<ProviderAuditResult> {
  if (verifierOptions === false || !result.valid || !result.finding) return result;
  if (result.finding.candidatePmids.length === 0) return result;

  const verification = await verifyPubMedPmids(result.finding.candidatePmids, verifierOptions);
  const finding = {
    ...result.finding,
    validatedPmids: verification.validatedPmids,
    pmidVerificationStatus: verification.status,
  };

  return {
    ...result,
    finding,
    externalCalls: result.externalCalls + verification.externalCalls,
    rejectionReasons: verification.error
      ? [...result.rejectionReasons, `pmid verification failed: ${verification.error}`]
      : result.rejectionReasons,
  };
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
    '| Packet | Status | External calls | Cost | Reason |',
    '| --- | --- | ---: | ---: | --- |',
  ];

  for (const result of report.results) {
    lines.push([
      result.packetId,
      result.valid ? 'valid' : result.skippedReason || 'rejected',
      String(result.externalCalls),
      `$${result.costEstimateUsd.toFixed(6)}`,
      result.rejectionReasons.join('; ') || 'n/a',
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
