#!/usr/bin/env node
import fs from 'node:fs';

const requiredFiles = [
  '.agents/skills/suplementai-gsd/SKILL.md',
  '.codex/agents/gsd-reviewer.toml',
  '.codex/agents/gsd-verifier.toml',
  '.codex/agents/gsd-smoke-tester.toml',
  '.codex/hooks.json',
  'docs/gsd-autonomous-sdlc.md',
  'docs/done-criteria.md',
  'docs/invariants-baseline.md',
  'scripts/gsd/pre-tool-policy.mjs',
  'scripts/gsd/digest.mjs',
  'scripts/gsd/offline-certify.mjs',
  'scripts/gsd/done-oracle.mjs',
];

const requiredTokens = [
  { file: 'docs/invariants-baseline.md', token: 'never merges `main`' },
  { file: 'docs/invariants-baseline.md', token: 'never creates `.deploy-go`' },
  { file: 'docs/invariants-baseline.md', token: 'production-content-enricher' },
  { file: 'docs/invariants-baseline.md', token: 'Bedrock' },
  { file: 'docs/invariants-baseline.md', token: 'LanceDB mutation' },
  { file: 'docs/done-criteria.md', token: 'WRITER_SELF_APPROVAL: NO' },
  { file: 'docs/done-criteria.md', token: 'REVIEWER: PASS' },
  { file: 'docs/done-criteria.md', token: 'VERIFIER: PASS' },
  { file: 'docs/done-criteria.md', token: 'SMOKE_TESTER: PASS' },
  { file: '.agents/skills/suplementai-gsd/SKILL.md', token: 'The writer never self-approves' },
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

for (const requirement of requiredTokens) {
  if (!fs.existsSync(requirement.file)) {
    continue;
  }
  const content = fs.readFileSync(requirement.file, 'utf8');
  if (!content.includes(requirement.token)) {
    failures.push(`missing invariant token in ${requirement.file}: ${requirement.token}`);
  }
}

if (fs.existsSync('.deploy-go')) {
  failures.push('.deploy-go is present; production gate must be resolved by a human GO workflow');
}

if (failures.length) {
  console.error('GSD_INVARIANTS: FAIL');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('GSD_INVARIANTS: PASS');
