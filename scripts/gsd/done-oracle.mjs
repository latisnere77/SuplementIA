#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const checkConfigOnly = args.includes('--check-config-only');
const auditFlagIndex = args.indexOf('--audit-pass-file');
const auditFile = auditFlagIndex >= 0 ? args[auditFlagIndex + 1] : '';

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireAuditPass(file) {
  if (!file || !fs.existsSync(file)) {
    console.error('GSD_DONE: FAIL missing --audit-pass-file evidence');
    process.exit(1);
  }

  const content = fs.readFileSync(file, 'utf8');
  const required = [
    'AUDIT_FANOUT: PASS',
    'REVIEWER: PASS',
    'REVIEWER_ISOLATED: YES',
    'VERIFIER: PASS',
    'VERIFIER_ISOLATED: YES',
    'SMOKE_TESTER: PASS',
    'SMOKE_TESTER_ISOLATED: YES',
    'WRITER_SELF_APPROVAL: NO',
  ];
  const missing = required.filter((token) => !content.includes(token));
  if (missing.length) {
    console.error(`GSD_DONE: FAIL audit evidence missing ${missing.join(', ')}`);
    process.exit(1);
  }
}

run('npm', ['run', 'gsd:invariants']);

if (!checkConfigOnly) {
  requireAuditPass(auditFile);
}

console.log(checkConfigOnly ? 'GSD_DONE: PASS config-only' : 'GSD_DONE: PASS');
