#!/usr/bin/env tsx

import { loadResearchAuditProviderConfig } from '../../lib/research-audit/config';
import {
  DEFAULT_MOONSHOT_SECRET_ID,
  loadResearchAuditProviderApiKey,
} from '../../lib/research-audit/aws-secret-loader';
import { buildAuditPacketFromEvent, loadAggregatedAuditEvents } from '../../lib/research-audit/events';
import { renderProviderAuditMarkdown, runProviderPacketAudit } from '../../lib/research-audit/provider-runner';

type CliOptions = {
  inputPath?: string;
  format: 'json' | 'markdown';
  outputDir: string;
  limit?: number;
  skipPmidVerifier: boolean;
  allowPmidVerifier: boolean;
  pmidVerifierEndpoint?: string;
  pmidVerifierTimeoutMs?: number;
  pmidVerifierMaxPmids?: number;
  useAwsSecret: boolean;
  awsSecretId: string;
  awsRegion?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    format: 'json',
    outputDir: '.research-audit-reports',
    skipPmidVerifier: false,
    allowPmidVerifier: false,
    useAwsSecret: false,
    awsSecretId: DEFAULT_MOONSHOT_SECRET_ID,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === '--input' || arg === '--events') && next) {
      options.inputPath = next;
      index += 1;
    } else if (arg === '--format' && (next === 'json' || next === 'markdown')) {
      options.format = next;
      index += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--skip-pmid-verifier') {
      options.skipPmidVerifier = true;
    } else if (arg === '--allow-pubmed-verifier') {
      options.allowPmidVerifier = true;
    } else if (arg === '--pmid-verifier-endpoint' && next) {
      options.pmidVerifierEndpoint = next;
      index += 1;
    } else if (arg === '--pmid-verifier-timeout-ms' && next) {
      options.pmidVerifierTimeoutMs = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--pmid-verifier-max-pmids' && next) {
      options.pmidVerifierMaxPmids = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--use-aws-secret') {
      options.useAwsSecret = true;
    } else if (arg === '--aws-secret-id' && next) {
      options.awsSecretId = next;
      index += 1;
    } else if (arg === '--aws-region' && next) {
      options.awsRegion = next;
      index += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.inputPath) {
    throw new Error('Missing --input path to aggregated audit events JSON or JSONL');
  }

  const baseConfig = loadResearchAuditProviderConfig();
  const apiKey = await loadResearchAuditProviderApiKey({
    enabled: options.useAwsSecret && baseConfig.enabled,
    existingApiKey: baseConfig.apiKey,
    secretId: options.awsSecretId,
    region: options.awsRegion,
  });
  const config = apiKey ? { ...baseConfig, apiKey } : baseConfig;
  const events = loadAggregatedAuditEvents(options.inputPath);
  const limit = Math.min(options.limit ?? config.maxEventsPerRun, config.maxEventsPerRun);
  const packetInputs = events.slice(0, limit).map((event, index) => ({
    id: event.id || `event-${index + 1}`,
    packetResult: buildAuditPacketFromEvent(event),
  }));
  const { report, reportPaths } = await runProviderPacketAudit(config, packetInputs, {
    outputDir: options.outputDir,
    pmidVerifier: buildPmidVerifierOptions(options),
  });

  if (options.format === 'markdown') {
    process.stdout.write(renderProviderAuditMarkdown(report));
  } else {
    process.stdout.write(`${JSON.stringify({
      inputPath: options.inputPath,
      ...report,
      reportPaths,
    }, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function buildPmidVerifierOptions(options: CliOptions) {
  if (options.skipPmidVerifier || !options.allowPmidVerifier) return false;

  return {
    endpoint: options.pmidVerifierEndpoint,
    timeoutMs: options.pmidVerifierTimeoutMs,
    maxPmids: options.pmidVerifierMaxPmids,
  };
}
