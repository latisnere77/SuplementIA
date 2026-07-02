const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/gsd/done-oracle.mjs');

function writeAudit(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-done-audit-'));
  const filePath = path.join(dir, 'AUDIT_FANOUT.md');
  fs.writeFileSync(filePath, content);
  return filePath;
}

function runDoneOracle(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

describe('done-oracle', () => {
  jest.setTimeout(30000);

  it('passes config-only mode after invariants pass', () => {
    const result = runDoneOracle(['--check-config-only']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('GSD_DONE: PASS config-only');
  });

  it('fails when audit fan-out evidence is missing', () => {
    const result = runDoneOracle(['--audit-pass-file', path.join(os.tmpdir(), 'missing-audit.md')]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GSD_DONE: FAIL missing --audit-pass-file evidence');
  });

  it('fails when required audit fan-out tokens are missing', () => {
    const auditFile = writeAudit([
      'AUDIT_FANOUT: PASS',
      'REVIEWER: PASS',
      'SMOKE_TESTER: PASS',
      'WRITER_SELF_APPROVAL: NO',
    ].join('\n'));

    const result = runDoneOracle(['--audit-pass-file', auditFile]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('VERIFIER: PASS');
    expect(result.stderr).toContain('REVIEWER_ISOLATED: YES');
  });

  it('passes when all required audit fan-out tokens are present', () => {
    const auditFile = writeAudit([
      'AUDIT_FANOUT: PASS',
      'REVIEWER: PASS',
      'REVIEWER_ISOLATED: YES',
      'VERIFIER: PASS',
      'VERIFIER_ISOLATED: YES',
      'SMOKE_TESTER: PASS',
      'SMOKE_TESTER_ISOLATED: YES',
      'WRITER_SELF_APPROVAL: NO',
    ].join('\n'));

    const result = runDoneOracle(['--audit-pass-file', auditFile]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('GSD_DONE: PASS');
  });

  it('fails when fan-out pass tokens lack isolation evidence', () => {
    const auditFile = writeAudit([
      'AUDIT_FANOUT: PASS',
      'REVIEWER: PASS',
      'VERIFIER: PASS',
      'SMOKE_TESTER: PASS',
      'WRITER_SELF_APPROVAL: NO',
    ].join('\n'));

    const result = runDoneOracle(['--audit-pass-file', auditFile]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('REVIEWER_ISOLATED: YES');
    expect(result.stderr).toContain('VERIFIER_ISOLATED: YES');
    expect(result.stderr).toContain('SMOKE_TESTER_ISOLATED: YES');
  });
});
