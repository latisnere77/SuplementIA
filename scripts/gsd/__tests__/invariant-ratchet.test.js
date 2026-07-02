const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/gsd/invariant-ratchet.mjs');

function writeFile(root, filePath, content = 'placeholder') {
  const fullPath = path.join(root, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function makeOracleFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-invariants-'));

  const files = {
    'AGENTS.md': 'ORACLE-FIRST GSD v2',
    'CLAUDE.md': '@AGENTS.md',
    'DEAD_ENDS.md': [
      '# DEAD_ENDS',
      '### D1 — Example',
      '- Contexto: example',
      '- Intento: example',
      '- Fallo: example',
      '- No Repetir: example',
      '- Alternativa: example',
    ].join('\n'),
    'STATE.md': 'Oracle-first GSD v2',
    '.agents/skills/suplementai-gsd/SKILL.md': 'The writer never self-approves',
    '.codex/agents/gsd-reviewer.toml': 'reviewer',
    '.codex/agents/gsd-verifier.toml': 'verifier',
    '.codex/agents/gsd-smoke-tester.toml': 'smoke',
    '.codex/hooks.json': '{}',
    'docs/gsd-autonomous-sdlc.md': 'autonomy',
    'docs/done-criteria.md': [
      'WRITER_SELF_APPROVAL: NO',
      'REVIEWER: PASS',
      'VERIFIER: PASS',
      'SMOKE_TESTER: PASS',
      'SDD artifacts',
    ].join('\n'),
    'docs/invariants-baseline.md': [
      'never merges `main`',
      'never creates `.deploy-go`',
      'production-content-enricher',
      'Bedrock',
      'LanceDB mutation',
      'specify → plan → tasks → implement → verify',
      'TDD red/green checkpoint',
    ].join('\n'),
    'docs/oracle-first-gsd-v2.md': 'L0-L4 Autonomy Ladder',
    'docs/sdd-task-template.md': 'Write tests first',
    'docs/decisions/0001-oracle-first-gsd-v2.md': 'decision',
    'scripts/gsd/pre-tool-policy.mjs': 'policy',
    'scripts/gsd/digest.mjs': 'digest',
    'scripts/gsd/offline-certify.mjs': 'offline',
    'scripts/gsd/oracle-benchmark.mjs': 'benchmark',
    'scripts/gsd/done-oracle.mjs': 'done',
  };

  for (const [filePath, content] of Object.entries(files)) {
    writeFile(root, filePath, content);
  }

  return root;
}

function runInvariant(cwd) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
  });
}

describe('invariant-ratchet', () => {
  it('passes when required oracle files and tokens are present', () => {
    const root = makeOracleFixture();

    const result = runInvariant(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('GSD_INVARIANTS: PASS');
  });

  it('fails closed when a required oracle file is missing', () => {
    const root = makeOracleFixture();
    fs.rmSync(path.join(root, 'docs/done-criteria.md'));

    const result = runInvariant(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing required file: docs/done-criteria.md');
  });

  it('fails closed when a required invariant token is removed', () => {
    const root = makeOracleFixture();
    writeFile(root, 'docs/invariants-baseline.md', 'never merges `main`');

    const result = runInvariant(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing invariant token');
    expect(result.stderr).toContain('never creates `.deploy-go`');
  });

  it('fails closed when .deploy-go is present', () => {
    const root = makeOracleFixture();
    writeFile(root, '.deploy-go', 'human-token');

    const result = runInvariant(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.deploy-go is present');
  });

  it('fails closed when a DEAD_ENDS entry misses a required field', () => {
    const root = makeOracleFixture();
    writeFile(root, 'DEAD_ENDS.md', [
      '# DEAD_ENDS',
      '### D1 — Missing Fields',
      '- Contexto: example',
      '- Intento: example',
      '- Fallo: example',
    ].join('\n'));

    const result = runInvariant(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DEAD_ENDS.md D1 missing field: No Repetir');
    expect(result.stderr).toContain('DEAD_ENDS.md D1 missing field: Alternativa');
  });

  it('fails closed when a DEAD_ENDS Dn heading uses the wrong separator', () => {
    const root = makeOracleFixture();
    writeFile(root, 'DEAD_ENDS.md', [
      '# DEAD_ENDS',
      '### D1 - Wrong Separator',
      '- Contexto: example',
      '- Intento: example',
      '- Fallo: example',
      '- No Repetir: example',
      '- Alternativa: example',
    ].join('\n'));

    const result = runInvariant(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DEAD_ENDS.md D1 heading must use');
  });
});
