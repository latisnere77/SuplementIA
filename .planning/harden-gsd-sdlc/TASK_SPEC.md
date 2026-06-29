# TASK_SPEC — harden GSD SDLC

## Work Order

Harden the current SuplementAI GSD SDLC layer by fixing a `.deploy-go` read-only preflight false positive, adding invariant checks to CI, making existing audit fan-out evidence machine-readable by `gsd:done`, and refreshing queue-idle state.

## Mode

Governance/tooling only. No production, staging, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags, Bedrock, LanceDB mutation, live providers, scraping, deploy, merge, or `production-content-enricher`.

## In Scope

- `scripts/gsd/pre-tool-policy.mjs`
- `.github/workflows/quality-gates.yml`
- `.planning/reconcile-seo-cluster-queue/AUDIT_FANOUT.md`
- `.planning/queue-idle.md`
- `.planning/harden-gsd-sdlc/TASK_SPEC.md`
- `.planning/harden-gsd-sdlc/CHANGE_MANIFEST.md`
- `.planning/harden-gsd-sdlc/AUDIT_FANOUT.md`

## Out Of Scope

- Product code.
- Portal/category render behavior.
- SEO content.
- `TASK_QUEUE.md` task state, unless a validation finding proves it is inconsistent.
- Dependency changes.
- Deploy, merge to `main`, auto-merge, AWS writes, Bedrock, LanceDB mutation, or `production-content-enricher`.

## Substitution Test

- Without the hook fix, the GSD preflight can be blocked by its own `.deploy-go` guard.
- Without CI invariants, GSD safety can regress after local validation.
- Without exact audit tokens, existing evidence cannot pass `gsd:done`.
- Without queue-idle refresh, the idle report misstates merged PRs as open review work.

## Validation

Required local validation:

```bash
node --check scripts/gsd/pre-tool-policy.mjs
npm run gsd:invariants
npm run gsd:done -- --audit-pass-file .planning/reconcile-seo-cluster-queue/AUDIT_FANOUT.md
npm run gsd:offline-certify -- --quick
npm run lint
```

Hook behavior checks:

```bash
printf '{"cmd":"test -f .deploy-go && printf DEPLOY_GO_PRESENT || printf DEPLOY_GO_ABSENT"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"touch .deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"touch -- .deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"touch -m ./.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"touch ./.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"printf ok > ./.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"touch .//.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"printf ok > .//.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":":>.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"true>.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"true 1>.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"true 2>./.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"true >|.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"&>.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"&>>./.deploy-go"}' | node scripts/gsd/pre-tool-policy.mjs
printf '{"cmd":"true>\"./.deploy-go\""}' | node scripts/gsd/pre-tool-policy.mjs
```

The first command must pass. The creation/write commands must fail.

## Audit Fan-out Plan

Use read-only `gsd_reviewer`, `gsd_verifier`, and `gsd_smoke_tester` after local validation. Record exact PASS tokens in `.planning/harden-gsd-sdlc/AUDIT_FANOUT.md`, then run:

```bash
npm run gsd:done -- --audit-pass-file .planning/harden-gsd-sdlc/AUDIT_FANOUT.md
```

## Stop Rules

- Stop after 3 repeated failures of the same validation gate.
- Stop if any change would cross a production or cloud write gate.
- Stop if CI hardening requires broad workflow redesign or secrets.
- Stop if audit fan-out finds a blocking issue that cannot be fixed within the in-scope files.

## Human Gates

Human still owns merge to `main`, deploy/production GO, `.deploy-go`, AWS writes, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and `production-content-enricher`.
