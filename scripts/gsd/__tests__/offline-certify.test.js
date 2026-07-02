const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/gsd/offline-certify.mjs');

function runOfflineCertify(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

describe('offline-certify', () => {
  jest.setTimeout(30000);

  it('runs invariants and oracle benchmark before quick PASS', () => {
    const result = runOfflineCertify(['--quick']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('GSD_INVARIANTS: PASS');
    expect(result.stdout).toContain('ORACLE_BENCHMARK: PASS 4 cases');
    expect(result.stdout).toContain('GSD_OFFLINE_CERTIFY: PASS quick');
    expect(result.stdout.indexOf('GSD_INVARIANTS: PASS'))
      .toBeLessThan(result.stdout.indexOf('ORACLE_BENCHMARK: PASS 4 cases'));
    expect(result.stdout.indexOf('ORACLE_BENCHMARK: PASS 4 cases'))
      .toBeLessThan(result.stdout.indexOf('GSD_OFFLINE_CERTIFY: PASS quick'));
  });
});
