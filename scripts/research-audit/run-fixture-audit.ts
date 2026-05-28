#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { loadAuditFixtures } from '../../lib/research-audit/fixtures';
import { simulateFixtureAudit, type SimulatedAuditResult } from '../../lib/research-audit/simulator';
import type { AuditModel } from '../../lib/research-audit/cost-estimator';
import type { ResearchAuditFinding } from '../../lib/research-audit/schema';

type CliOptions = {
  format: 'json' | 'markdown';
  fixturePath: string;
  model: AuditModel;
  outputDir: string;
};

type FixtureAuditReport = {
  dryRun: true;
  externalCalls: 0;
  fixturePath: string;
  model: AuditModel;
  totalFixtures: number;
  validationFailures: number;
  totalCostEstimateUsd: number;
  results: SimulatedAuditResult[];
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    format: 'json',
    fixturePath: 'docs/research-audit-provider-fixtures.json',
    model: 'gpt-5.4-nano',
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
    } else if (arg === '--model' && next) {
      options.model = next as AuditModel;
      index += 1;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      index += 1;
    }
  }

  return options;
}

function renderMarkdown(results: SimulatedAuditResult[]): string {
  const totalCost = results.reduce((sum, result) => sum + result.costEstimateUsd, 0);
  const invalid = results.filter((result) => !result.valid);
  const lines = [
    '# Research Audit Fixture Dry Run',
    '',
    `- Findings: ${results.length}`,
    `- Validation failures: ${invalid.length}`,
    `- Estimated total cost if sent to selected provider: $${totalCost.toFixed(6)}`,
    '- External calls: 0',
    '',
    '| Fixture | Task | Classification | Boundary | Cost | Valid |',
    '| --- | --- | --- | --- | ---: | --- |',
  ];

  for (const result of results) {
    const finding: Partial<ResearchAuditFinding> | undefined = result.finding ?? result.rejectedFinding;
    lines.push([
      result.fixtureId,
      finding?.taskType ?? 'n/a',
      finding?.proposedClassification ?? 'n/a',
      finding?.evidenceBoundary ?? 'n/a',
      `$${result.costEstimateUsd.toFixed(6)}`,
      result.valid ? 'yes' : 'no',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  if (invalid.length > 0) {
    lines.push('', '## Validation Errors', '');
    for (const result of invalid) {
      lines.push(`- ${result.fixtureId}: ${result.rejectionReasons.join('; ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function writeReports(report: FixtureAuditReport, outputDir: string) {
  mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `fixture-audit-${timestamp}.json`);
  const markdownPath = path.join(outputDir, `fixture-audit-${timestamp}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, renderMarkdown(report.results));

  return { jsonPath, markdownPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixtures = loadAuditFixtures(options.fixturePath);
  const results = fixtures.map((fixture) => simulateFixtureAudit(fixture, options.model));
  const totalCostEstimateUsd = results.reduce((sum, result) => sum + result.costEstimateUsd, 0);
  const validationFailures = results.filter((result) => !result.valid);
  const report: FixtureAuditReport = {
    dryRun: true,
    externalCalls: 0,
    fixturePath: options.fixturePath,
    model: options.model,
    totalFixtures: fixtures.length,
    validationFailures: validationFailures.length,
    totalCostEstimateUsd: Number(totalCostEstimateUsd.toFixed(6)),
    results,
  };
  const reportPaths = writeReports(report, options.outputDir);

  if (options.format === 'markdown') {
    process.stdout.write(renderMarkdown(results));
  } else {
    process.stdout.write(`${JSON.stringify({
      ...report,
      reportPaths,
    }, null, 2)}\n`);
  }

  if (validationFailures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
