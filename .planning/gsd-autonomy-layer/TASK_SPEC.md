# TASK_SPEC — GSD Autonomy Layer

## Work Order

Bootstrap SuplementAI's GSD autonomy layer so future Agentic SDLC work can run through repo-local policy, deterministic offline certification, read-only audit fan-out, and a DONE oracle while preserving human gates for merge and production.

## MODE

Local repo governance and tooling. No production, staging, AWS writes, live providers, Bedrock, LanceDB mutation, vector sync, scraping, HERMES, research_broker, or `production-content-enricher`.

## Objective

Replace prompt-heavy quality approvals with a reusable Codex skill plus scripts, docs, hooks, and read-only verifier agents that make DONE measurable.

## In Scope

- `.agents/skills/suplementai-gsd/**`
- `.codex/agents/gsd-*.toml`
- `.codex/hooks.json`
- `docs/gsd-autonomous-sdlc.md`
- `docs/done-criteria.md`
- `docs/invariants-baseline.md`
- `scripts/gsd/**`
- `package.json`
- `.planning/gsd-autonomy-layer/**`
- A short `AGENTS.md` pointer if needed for durable routing

## Out Of Scope

- Product code.
- Portal SEO cluster execution.
- Queue reconciliation from open PR #181.
- Merge to `main`, auto-merge, deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags.
- Bedrock, LanceDB mutation, live providers, scraping, vector sync, HERMES, research_broker, `production-content-enricher`.

## Validation

Required local validation:

```bash
npm run gsd:invariants
npm run gsd:done -- --check-config-only
node --check scripts/gsd/pre-tool-policy.mjs
node --check scripts/gsd/digest.mjs
node --check scripts/gsd/invariant-ratchet.mjs
node --check scripts/gsd/offline-certify.mjs
node --check scripts/gsd/done-oracle.mjs
npm run lint
```

Full task validation for future product work:

```bash
npm run gsd:offline-certify
npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md
```

## Test de Sustitucion

If these files do not exist, future agents fall back to long prompts and human quality approvals. The task fails because autonomy remains unenforced and non-repeatable.

## Stop Rules

- Stop if a command would cross production, AWS write, deploy, Bedrock, LanceDB mutation, or content-enricher gates.
- Stop after 3 repeated validation failures.
- Stop if the DONE rubric becomes ambiguous.
- Stop if adding the layer requires product-code changes.

## Human Gates

Human still owns merge to `main`, production/deploy GO, `.deploy-go`, AWS writes, Terraform/EventBridge, Bedrock, LanceDB mutation, and `production-content-enricher`.

## Allowed Files

Only files listed in In Scope.
