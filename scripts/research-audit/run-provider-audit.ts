#!/usr/bin/env tsx

import { loadResearchAuditProviderConfig } from '../../lib/research-audit/config';
import { renderProviderAuditMarkdown, runProviderFixtureAudit } from '../../lib/research-audit/provider-runner';

type CliOptions = {
  format: 'json' | 'markdown';
  fixturePath?: string;
  outputDir: string;
  limit?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    format: 'json',
    outputDir: '.research-audit-reports',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--format' && (next === 'json' || next === 'markdown')) {
      options.format = next;
      index += 1;
    } else if (arg === '--fixture' && next) {
      options.fixturePath = next;
      index += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadResearchAuditProviderConfig();
  const { report, reportPaths } = await runProviderFixtureAudit(config, {
    fixturePath: options.fixturePath,
    outputDir: options.outputDir,
    limit: options.limit,
  });

  if (options.format === 'markdown') {
    process.stdout.write(renderProviderAuditMarkdown(report));
  } else {
    process.stdout.write(`${JSON.stringify({ ...report, reportPaths }, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

