#!/usr/bin/env node
import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
let payload = {};

try {
  payload = input.trim() ? JSON.parse(input) : {};
} catch {
  payload = { raw: input };
}

const command = [
  payload.command,
  payload.cmd,
  payload.tool_input?.command,
  payload.tool_input?.cmd,
  payload.arguments?.command,
  payload.arguments?.cmd,
  payload.raw,
]
  .filter(Boolean)
  .join('\n');

const hasDeployGo = fs.existsSync('.deploy-go');

const hardBlocks = [
  { name: 'merge-main', pattern: /\b(gh\s+pr\s+merge|git\s+merge|git\s+push\s+origin\s+main)\b/i },
  { name: 'auto-merge', pattern: /\b(auto-merge|--auto)\b/i },
  { name: 'deploy', pattern: /\b(npm\s+run\s+deploy|amplify\s+.*start-job|start-job)\b/i },
  { name: 'aws-write', pattern: /\baws\b.*\b(create|delete|put|update|invoke|start|stop|apply|attach|detach)\b/i },
  { name: 'terraform-write', pattern: /\bterraform\s+(apply|destroy|import|taint)\b/i },
  { name: 'bedrock-or-enricher', pattern: /\b(Bedrock|bedrock|production-content-enricher)\b/ },
  { name: 'lancedb-mutation', pattern: /\b(add|update|delete|sync|mutate).*\b(LanceDB|lancedb)\b/i },
  { name: 'destructive-rm', pattern: /\brm\s+-rf\b/i },
];

const createsDeployGo = /\.deploy-go/.test(command) && /\b(touch|tee|printf|echo|cat|>|>>)\b/.test(command);

if (createsDeployGo) {
  console.error('GSD_POLICY_BLOCK: agent must not create .deploy-go');
  process.exit(2);
}

for (const block of hardBlocks) {
  if (block.pattern.test(command)) {
    const prodAction = ['deploy', 'aws-write', 'terraform-write', 'bedrock-or-enricher', 'lancedb-mutation'].includes(block.name);
    if (!prodAction || !hasDeployGo || process.env.SUPLEMENTAI_PROD_GO !== '1') {
      console.error(`GSD_POLICY_BLOCK: ${block.name} requires explicit human GO and task spec`);
      process.exit(2);
    }
  }
}

process.exit(0);
