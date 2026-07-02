const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/gsd/tool-budget-policy.mjs');

function runBudgetPolicy(payload, options = {}) {
  const stateDir = options.stateDir || fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-state-'));
  const env = {
    ...process.env,
    GSD_TOOL_BUDGET_STATE_DIR: stateDir,
    GSD_TOOL_BUDGET_SESSION: options.session || 'test-session',
    ...(options.env || {}),
  };

  if (options.clearSessionEnv) {
    delete env.GSD_TOOL_BUDGET_SESSION;
    delete env.CODEX_SESSION_ID;
    delete env.CODEX_THREAD_ID;
    delete env.CLAUDE_SESSION_ID;
  }

  return spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env,
  });
}

describe('tool-budget-policy debounce', () => {
  it('allows the first two identical commands and blocks the third', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-debounce-'));
    const payload = { command: 'npm run gsd:invariants' };

    expect(runBudgetPolicy(payload, { stateDir }).status).toBe(0);
    expect(runBudgetPolicy(payload, { stateDir }).status).toBe(0);

    const third = runBudgetPolicy(payload, { stateDir });
    expect(third.status).toBe(2);
    expect(third.stderr).toContain('GSD_TOOL_BUDGET_BLOCK: repeated command exceeded max 2');
  });

  it('normalizes whitespace before counting repeated commands', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-normalize-'));

    expect(runBudgetPolicy({ command: 'git   status --short' }, { stateDir }).status).toBe(0);
    expect(runBudgetPolicy({ command: 'git status   --short' }, { stateDir }).status).toBe(0);

    const third = runBudgetPolicy({ command: 'git status --short' }, { stateDir });
    expect(third.status).toBe(2);
    expect(third.stderr).toContain('git status --short');
  });

  it('keeps debounce state isolated by session', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-session-'));
    const payload = { command: 'npm test -- --runInBand' };

    expect(runBudgetPolicy(payload, { stateDir, session: 'a' }).status).toBe(0);
    expect(runBudgetPolicy(payload, { stateDir, session: 'a' }).status).toBe(0);
    expect(runBudgetPolicy(payload, { stateDir, session: 'b' }).status).toBe(0);
  });

  it('honors a stricter max identical command setting', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-strict-'));
    const payload = { tool_input: { command: 'npm run lint' } };

    expect(runBudgetPolicy(payload, {
      stateDir,
      env: { GSD_DEBOUNCE_MAX_IDENTICAL: '1' },
    }).status).toBe(0);

    const second = runBudgetPolicy(payload, {
      stateDir,
      env: { GSD_DEBOUNCE_MAX_IDENTICAL: '1' },
    });
    expect(second.status).toBe(2);
  });

  it('does not allow env configuration to loosen the hard max of two', () => {
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-budget-hard-max-'));
    const payload = { command: 'npm run gsd:invariants' };
    const options = {
      stateDir,
      env: { GSD_DEBOUNCE_MAX_IDENTICAL: '3' },
    };

    expect(runBudgetPolicy(payload, options).status).toBe(0);
    expect(runBudgetPolicy(payload, options).status).toBe(0);

    const third = runBudgetPolicy(payload, options);
    expect(third.status).toBe(2);
    expect(third.stderr).toContain('repeated command exceeded max 2');
  });

  it('passes when no command-like payload is present', () => {
    const result = runBudgetPolicy({ event: 'noop' });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('fails closed for command payloads when no session key is available', () => {
    const result = runBudgetPolicy(
      { command: 'npm run gsd:invariants' },
      { clearSessionEnv: true }
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('GSD_TOOL_BUDGET_BLOCK: missing session key');
  });
});
