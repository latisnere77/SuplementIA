import {
  DEFAULT_MOONSHOT_SECRET_ID,
  loadResearchAuditProviderApiKey,
} from './aws-secret-loader';
import { loadResearchAuditProviderConfig, type ResearchAuditProviderConfig } from './config';
import { buildAuditPacketFromEvent, parseAggregatedAuditEvents } from './events';
import type { PmidVerifierOptions } from './pmid-verifier';
import type { ResearchAuditProviderAdapter } from './provider';
import {
  buildProviderPacketAuditReport,
  renderProviderAuditMarkdown,
  type ProviderAuditReport,
} from './provider-runner';

export interface ResearchAuditS3Location {
  bucket: string;
  key: string;
}

export interface ResearchAuditS3Prefix {
  bucket: string;
  keyPrefix: string;
}

export interface ResearchAuditObjectStore {
  getText(location: ResearchAuditS3Location): Promise<string>;
  putText(location: ResearchAuditS3Location, body: string, contentType: string): Promise<void>;
}

export type ResearchAuditAwsSecretGetter = (input: {
  secretId: string;
  region: string;
}) => Promise<string | undefined>;

export interface AwsResearchAuditReportOnlyOptions {
  input: ResearchAuditS3Location;
  output: ResearchAuditS3Prefix;
  objectStore: ResearchAuditObjectStore;
  config?: ResearchAuditProviderConfig;
  provider?: ResearchAuditProviderAdapter;
  useProviderSecret?: boolean;
  secretId?: string;
  region?: string;
  getSecretValue?: ResearchAuditAwsSecretGetter;
  pmidVerifier?: PmidVerifierOptions | false;
  now?: () => Date;
}

export interface AwsResearchAuditReportOnlyResult {
  report: ProviderAuditReport;
  objects: {
    input: ResearchAuditS3Location;
    json: ResearchAuditS3Location;
    markdown: ResearchAuditS3Location;
    summary: ResearchAuditS3Location;
  };
}

export async function runAwsResearchAuditReportOnly(
  options: AwsResearchAuditReportOnlyOptions
): Promise<AwsResearchAuditReportOnlyResult> {
  const baseConfig = options.config ?? loadResearchAuditProviderConfig();
  const apiKey = await loadResearchAuditProviderApiKey({
    enabled: Boolean(options.useProviderSecret) && baseConfig.enabled,
    existingApiKey: baseConfig.apiKey,
    secretId: options.secretId || DEFAULT_MOONSHOT_SECRET_ID,
    region: options.region,
    getSecretValue: options.getSecretValue,
  });
  const config = apiKey ? { ...baseConfig, apiKey } : baseConfig;
  const inputText = await options.objectStore.getText(options.input);
  const events = parseAggregatedAuditEvents(inputText, inputFormatFromKey(options.input.key));
  const limit = Math.min(config.maxEventsPerRun, events.length);
  const packetInputs = events.slice(0, limit).map((event, index) => ({
    id: event.id || `event-${index + 1}`,
    packetResult: buildAuditPacketFromEvent(event),
  }));
  const report = await buildProviderPacketAuditReport(config, packetInputs, {
    provider: options.provider,
    pmidVerifier: options.pmidVerifier ?? false,
  });
  const objects = outputObjects(options.output, options.now?.() ?? new Date());

  await options.objectStore.putText(objects.json, `${JSON.stringify(report, null, 2)}\n`, 'application/json');
  await options.objectStore.putText(objects.markdown, renderProviderAuditMarkdown(report), 'text/markdown');
  await options.objectStore.putText(
    objects.summary,
    `${JSON.stringify(buildAwsReportSummary(report, options.input, objects), null, 2)}\n`,
    'application/json'
  );

  return {
    report,
    objects: {
      input: options.input,
      ...objects,
    },
  };
}

function inputFormatFromKey(key: string): 'json' | 'jsonl' {
  return key.toLowerCase().endsWith('.jsonl') ? 'jsonl' : 'json';
}

function outputObjects(prefix: ResearchAuditS3Prefix, timestamp: Date) {
  const timestampSlug = timestamp.toISOString().replace(/[:.]/g, '-');
  const keyPrefix = prefix.keyPrefix.replace(/\/+$/, '');

  return {
    json: {
      bucket: prefix.bucket,
      key: `${keyPrefix}/provider-audit-${timestampSlug}.json`,
    },
    markdown: {
      bucket: prefix.bucket,
      key: `${keyPrefix}/provider-audit-${timestampSlug}.md`,
    },
    summary: {
      bucket: prefix.bucket,
      key: `${keyPrefix}/summary-${timestampSlug}.json`,
    },
  };
}

function buildAwsReportSummary(
  report: ProviderAuditReport,
  input: ResearchAuditS3Location,
  objects: ReturnType<typeof outputObjects>
) {
  return {
    dryRun: report.dryRun,
    reportOnly: report.reportOnly,
    enabled: report.enabled,
    provider: report.provider,
    model: report.model,
    input,
    outputs: objects,
    totalPackets: report.totalPackets,
    skippedPackets: report.skippedPackets,
    validationFailures: report.validationFailures,
    externalCalls: report.externalCalls,
    totalCostEstimateUsd: report.totalCostEstimateUsd,
    findingsByTaskType: countBy(report.results, (result) => result.finding?.taskType || 'none'),
    findingsBySeverity: countBy(report.results, (result) => result.finding?.severity || 'none'),
    seoFindings: report.results.filter((result) => taskTypeFromResult(result) === 'seo_opportunity').length,
    rejectedFindings: report.results.filter((result) => !result.valid).length,
  };
}

function taskTypeFromResult(result: ProviderAuditReport['results'][number]): string | undefined {
  if (result.finding) return result.finding.taskType;
  if (!result.rejectedFinding || typeof result.rejectedFinding !== 'object') return undefined;
  const fields = result.rejectedFinding as { taskType?: unknown };

  return typeof fields.taskType === 'string' ? fields.taskType : undefined;
}

function countBy<T>(items: T[], selector: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}
