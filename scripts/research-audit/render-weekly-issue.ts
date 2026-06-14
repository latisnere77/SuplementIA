#!/usr/bin/env tsx

import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import {
  DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID,
  loadResearchAuditGitHubIssueToken,
} from '../../lib/research-audit/aws-secret-loader';
import {
  createResearchAuditGitHubClient,
  loadProviderAuditReportFromFile,
  publishResearchAuditWeeklyIssue,
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
  createGithubIssue: boolean;
  useAwsSecret: boolean;
  githubTokenSecretId: string;
  awsRegion?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    repository: 'latisnere77/SuplementIA',
    outputDir: '.research-audit-reports',
    createGithubIssue: false,
    useAwsSecret: false,
    githubTokenSecretId: DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID,
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
    } else if (arg === '--create-github-issue') {
      options.createGithubIssue = true;
    } else if (arg === '--use-aws-secret') {
      options.useAwsSecret = true;
    } else if (arg === '--github-token-secret-id') {
      options.githubTokenSecretId = requireValue(arg, next);
      index += 1;
    } else if (arg === '--aws-region') {
      options.awsRegion = requireValue(arg, next);
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
    'Default behavior is dry-run/local only. It renders a proposed GitHub Issue Markdown file and never calls GitHub.',
    '',
    'Real GitHub issue creation is manual-only:',
    '  --create-github-issue',
    '',
    'Credentials are loaded from GITHUB_ISSUE_TOKEN/GITHUB_TOKEN, or from AWS Secrets Manager only when',
    'explicitly passing --use-aws-secret. Default secret:',
    `  ${DEFAULT_GITHUB_ISSUE_TOKEN_SECRET_ID}`,
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
    dryRun: !options.createGithubIssue,
    createIssue: options.createGithubIssue,
    reports: {
      json: options.jsonReport,
      markdown: options.markdownReport,
      summary: options.summaryReport,
    },
  };
  const { result, markdownPath } = options.createGithubIssue
    ? await publishAndRenderLocalIssue(input, options)
    : await renderLocalResearchAuditWeeklyIssue({
        input,
        outputDir: options.outputDir,
      });

  console.log(JSON.stringify({
    dryRun: result.dryRun,
    createIssue: result.createIssue,
    action: result.action,
    issue: result.issue
      ? { number: result.issue.number, title: result.issue.title }
      : undefined,
    title: result.plan.title,
    labels: result.plan.labels,
    shouldCreateIssue: result.plan.shouldCreateIssue,
    noActionableFindings: result.plan.noActionableFindings,
    error: result.error,
    markdownPath,
    metrics: result.plan.metrics,
  }, null, 2));
}

async function publishAndRenderLocalIssue(
  input: ResearchAuditIssuePublisherInput,
  options: CliOptions
) {
  if (!input.reports.json) {
    throw new Error('input.reports.json is required for GitHub issue publishing');
  }

  const report = loadProviderAuditReportFromFile(input.reports.json);
  const preflight = await publishResearchAuditWeeklyIssue({
    input,
    report,
  });

  if (!preflight.plan.shouldCreateIssue) {
    const markdownPath = writeIssueMarkdown(options.outputDir, input.weekId, preflight.plan.body);
    return { result: preflight, markdownPath };
  }

  const token = await loadResearchAuditGitHubIssueToken({
    enabled: options.useAwsSecret,
    existingToken: process.env.GITHUB_ISSUE_TOKEN || process.env.GITHUB_TOKEN,
    secretId: options.githubTokenSecretId,
    region: options.awsRegion,
  });

  if (!token) {
    throw new Error(
      'GitHub issue token is required. Set GITHUB_ISSUE_TOKEN or pass --use-aws-secret.'
    );
  }

  const result = await publishResearchAuditWeeklyIssue({
    input,
    report,
    github: createResearchAuditGitHubClient({ token }),
  });
  const markdownPath = writeIssueMarkdown(options.outputDir, input.weekId, result.plan.body);

  return { result, markdownPath };
}

function writeIssueMarkdown(outputDir: string, weekId: string, body: string): string {
  mkdirSync(outputDir, { recursive: true });
  const markdownPath = path.join(
    outputDir,
    `github-issue-${weekId}-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
  );
  writeFileSync(markdownPath, body);

  return markdownPath;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
