#!/usr/bin/env node
import { spawnSync, execFileSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    console.error(`GSD_OFFLINE_CERTIFY: FAIL command=${command} ${commandArgs.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

function changedFiles() {
  try {
    return execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

run('npm', ['run', 'gsd:invariants']);

if (args.has('--quick')) {
  console.log('GSD_OFFLINE_CERTIFY: PASS quick');
  process.exit(0);
}

run('npm', ['run', 'validate']);

const files = changedFiles();
const needsE2e =
  args.has('--force-e2e') ||
  files.some((file) =>
    file.startsWith('app/[locale]/portal/') ||
    file.includes('/portal/') ||
    file.endsWith('/seo.ts') ||
    file.endsWith('/seo.test.ts') ||
    file.includes('e2e/'),
  );

if (needsE2e) {
  run('npm', ['run', 'test:e2e']);
}

console.log('GSD_OFFLINE_CERTIFY: PASS');
