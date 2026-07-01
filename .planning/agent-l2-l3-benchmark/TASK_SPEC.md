# TASK_SPEC — agent-l2-l3-benchmark

Date: 2026-07-01

## Objective

Define a mini-benchmark for moving SuplementAI agents from L2 queue autonomy to L3 bounded
multi-agent autonomy, while preserving all human gates.

## Scope

In scope:

- `.planning/agent-l2-l3-benchmark/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Enabling L3 by default.
- Remote writes, merges, deploys, feature flags, or new product tasks.
- Editing runtime code, GSD scripts, AGENTS, ROADMAP, or CI.

## Harness

```bash
node scripts/gsd-autonomous.mjs --recon
```

## Stop Rules

- Do not declare L3 effective for writes, merges, deploys, or remote actions.
- Do not weaken merge/deploy/AWS/Lambda/Terraform/EventBridge/Bedrock/LanceDB/content-enricher
  gates.
- Do not invent new product tasks.
