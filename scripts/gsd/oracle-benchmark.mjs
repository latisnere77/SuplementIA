#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const fixturesFlagIndex = args.indexOf('--fixtures');
const fixturesPath = fixturesFlagIndex >= 0 ? args[fixturesFlagIndex + 1] : '';

if (!fixturesPath) {
  console.error('ORACLE_BENCHMARK: FAIL missing --fixtures <path>');
  process.exit(1);
}

const requiredTokens = [
  'AUDIT_FANOUT: PASS',
  'REVIEWER: PASS',
  'VERIFIER: PASS',
  'SMOKE_TESTER: PASS',
  'WRITER_SELF_APPROVAL: NO',
];

const fixtures = readFixtures(fixturesPath);
const results = fixtures.cases.map(runCase);
const failed = results.filter((result) => !result.pass);

for (const result of results) {
  const status = result.pass ? 'PASS' : 'FAIL';
  console.log(`${status} ${result.name}: expected=${result.expectedPass} actual=${result.actualPass}`);
  if (result.message) {
    console.log(`  ${result.message}`);
  }
}

if (failed.length) {
  console.error(`ORACLE_BENCHMARK: FAIL ${failed.length}/${results.length} cases failed`);
  process.exit(1);
}

console.log(`ORACLE_BENCHMARK: PASS ${results.length} cases`);

function readFixtures(filePath) {
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`ORACLE_BENCHMARK: FAIL cannot read fixtures: ${error.message}`);
    process.exit(1);
  }

  if (!parsed || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    console.error('ORACLE_BENCHMARK: FAIL fixtures must include a non-empty cases array');
    process.exit(1);
  }

  return parsed;
}

function runCase(fixtureCase) {
  const name = String(fixtureCase.name || '').trim();
  const expectedPass = Boolean(fixtureCase.expectedPass);
  const expectedMissing = Array.isArray(fixtureCase.expectedMissing)
    ? fixtureCase.expectedMissing
    : [];

  if (!name) {
    return {
      name: '<unnamed>',
      expectedPass,
      actualPass: false,
      pass: false,
      message: 'case is missing name',
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suplementai-oracle-benchmark-'));
  const auditPath = path.join(tempDir, 'AUDIT_FANOUT.md');
  fs.writeFileSync(auditPath, `${String(fixtureCase.audit || '').trim()}\n`);

  const audit = fs.readFileSync(auditPath, 'utf8');
  const missing = requiredTokens.filter((token) => !audit.includes(token));
  const actualPass = missing.length === 0;
  const missingMatches = sameItems(missing, expectedMissing);
  const pass = actualPass === expectedPass && missingMatches;
  const message = pass ? '' : `missing=${JSON.stringify(missing)} expectedMissing=${JSON.stringify(expectedMissing)}`;

  return {
    name,
    expectedPass,
    actualPass,
    pass,
    message,
  };
}

function sameItems(actual, expected) {
  if (actual.length !== expected.length) {
    return false;
  }

  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  return sortedActual.every((item, index) => item === sortedExpected[index]);
}
