#!/usr/bin/env tsx

import {
  renderLocalResearchAuditWeeklyIssue,
  type ResearchAuditIssuePublisherInput,
} from '../../lib/research-audit/github-issue-publisher';

interface CliOptions {
  jsonReport?: string;
  markdownReport?: string;
  summaryReport?: string;
  weekId?: string;
  repository: string;
  outputDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    repository: 'latisnere77/SuplementIA',
    outputDir: '.research-audit-reports',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--json-report') {
      options.jsonReport = requireValue(arg, next);
      index += 1;
    } else if (arg === '--markdown-report') {
      options.markdownReport = requireValue(arg, next);
      index += 1;
    } else if (arg === '--summary-report') {
      options.summaryReport = requireValue(arg, next);
      index += 1;
    } else if (arg === '--week-id') {
      options.weekId = requireValue(arg, next);
      index += 1;
    } else if (arg === '--repository') {
      options.repository = requireValue(arg, next);
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = requireValue(arg, next);
      index += 1;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.jsonReport) {
    throw new Error('--json-report is required');
  }

  return options;
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function printHelp() {
  console.log([
    'Usage:',
    '  npx tsx scripts/research-audit/render-weekly-issue.ts \\',
    '    --json-report .research-audit-reports/provider-audit.json \\',
    '    --week-id 2026-W23',
    '',
    'This is dry-run/local only. It renders a proposed GitHub Issue Markdown file and never calls GitHub.',
  ].join('\n'));
}

function defaultWeekId(date = new Date()): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const input: ResearchAuditIssuePublisherInput = {
    weekId: options.weekId || defaultWeekId(),
    repository: options.repository,
    dryRun: true,
    createIssue: false,
    reports: {
      json: options.jsonReport,
      markdown: options.markdownReport,
      summary: options.summaryReport,
    },
  };
  const { result, markdownPath } = await renderLocalResearchAuditWeeklyIssue({
    input,
    outputDir: options.outputDir,
  });

  console.log(JSON.stringify({
    dryRun: result.dryRun,
    createIssue: result.createIssue,
    action: result.action,
    title: result.plan.title,
    labels: result.plan.labels,
    shouldCreateIssue: result.plan.shouldCreateIssue,
    noActionableFindings: result.plan.noActionableFindings,
    markdownPath,
    metrics: result.plan.metrics,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
