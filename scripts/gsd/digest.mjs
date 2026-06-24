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
const untrackedChanged = git(['ls-files', '--others', '--exclude-standard'])
  .split('\n')
  .filter(Boolean);
const changed = [...new Set([...trackedChanged, ...untrackedChanged])];

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

const lines = [
  `GSD_DIGEST: branch=${git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown'} head=${git(['rev-parse', '--short', 'HEAD']) || 'unknown'}`,
  `changed_files=${changed.length}`,
  `deploy_go=${fs.existsSync('.deploy-go') ? 'PRESENT' : 'ABSENT'}`,
  `tamper_visible=${tamperVisible.length ? tamperVisible.join(',') : 'none'}`,
];

console.log(lines.join('\n'));
