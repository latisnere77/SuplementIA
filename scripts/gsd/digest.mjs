#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const trackedChanged = git(['diff', '--name-only', 'origin/main...HEAD'])
  .split('\n')
  .filter(Boolean);
const worktreeChanged = git(['diff', '--name-only', 'origin/main'])
  .split('\n')
  .filter(Boolean);
const untrackedChanged = git(['ls-files', '--others', '--exclude-standard'])
  .split('\n')
  .filter(Boolean);
const changed = [...new Set([...trackedChanged, ...worktreeChanged, ...untrackedChanged])];
const hookMode = process.argv.includes('--hook');

const protectedPrefixes = [
  '.agents/skills/suplementai-gsd/',
  '.codex/',
  'docs/done-criteria.md',
  'docs/invariants-baseline.md',
  'scripts/gsd/',
];

const tamperVisible = changed.filter((file) =>
  protectedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix)),
);

const digest = {
  branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
  head: git(['rev-parse', '--short', 'HEAD']) || 'unknown',
  changedFiles: changed.length,
  deployGo: fs.existsSync('.deploy-go') ? 'PRESENT' : 'ABSENT',
  tamperVisible,
};

const lines = [
  `GSD_DIGEST: branch=${digest.branch} head=${digest.head}`,
  `changed_files=${digest.changedFiles}`,
  `deploy_go=${digest.deployGo}`,
  `tamper_visible=${digest.tamperVisible.length ? digest.tamperVisible.join(',') : 'none'}`,
];

if (hookMode) {
  console.log(JSON.stringify({
    gsdDigest: digest,
    message: lines.join('\n'),
  }));
  process.exit(0);
}

console.log(lines.join('\n'));
