const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/gsd/pre-tool-policy.mjs');

function runPolicy(command, options = {}) {
  const cwd = options.cwd || fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-policy-'));
  return spawnSync(process.execPath, [scriptPath], {
    cwd,
    input: JSON.stringify({ command }),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
}

describe('pre-tool-policy', () => {
  it.each([
    'npm run gsd:invariants',
    'npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/pre-tool-policy.test.js',
    'git status --short --branch',
    'gh pr view 198 --json number,title,state',
    'aws sts get-caller-identity --profile suplementai-admin --output json',
  ])('allows safe local/read-only command: %s', (command) => {
    const result = runPolicy(command);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it.each([
    ['merge-main', 'gh pr merge 198 --merge'],
    ['merge-main', 'git merge main'],
    ['merge-main', 'git push origin main'],
    ['auto-merge', 'enable auto-merge for pr 198'],
    ['deploy', 'npm run deploy'],
    ['aws-write', 'aws s3 put-object --bucket example --key x --body y'],
    ['terraform-write', 'terraform apply'],
    ['bedrock-or-enricher', 'node production-content-enricher/run.js'],
    ['bedrock-or-enricher', 'configure Bedrock model access'],
    ['lancedb-mutation', 'tsx scripts/enrich-lancedb-autocomplete.ts update LanceDB'],
    ['destructive-rm', 'rm -rf .next'],
  ])('blocks %s command: %s', (blockName, command) => {
    const result = runPolicy(command);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`GSD_POLICY_BLOCK: ${blockName}`);
  });

  it.each([
    'touch .deploy-go',
    'printf token > .deploy-go',
    'echo token >> ./.deploy-go',
    'cat token.txt > .deploy-go',
    'tee .deploy-go',
  ])('blocks attempts to create .deploy-go: %s', (command) => {
    const result = runPolicy(command);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('GSD_POLICY_BLOCK: agent must not create .deploy-go');
  });

});
