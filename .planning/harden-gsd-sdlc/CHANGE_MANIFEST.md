# CHANGE_MANIFEST — harden GSD SDLC

## Summary

- Refined `.deploy-go` command policy so read-only preflight checks are allowed while creation/write attempts remain blocked.
- Added `npm run gsd:invariants` to the GitHub Actions quality gate.
- Added exact `gsd:done` audit tokens to the existing reconcile SEO cluster audit evidence.
- Refreshed `.planning/queue-idle.md` to show the current idle queue state and no open PRs.

## Files Changed

- `scripts/gsd/pre-tool-policy.mjs`
- `.github/workflows/quality-gates.yml`
- `.planning/reconcile-seo-cluster-queue/AUDIT_FANOUT.md`
- `.planning/queue-idle.md`
- `.planning/harden-gsd-sdlc/TASK_SPEC.md`
- `.planning/harden-gsd-sdlc/CHANGE_MANIFEST.md`
- `.planning/harden-gsd-sdlc/AUDIT_FANOUT.md`

## Local Validation

- `node --check scripts/gsd/pre-tool-policy.mjs` -> exit 0
- Read-only `.deploy-go` preflight payload -> exit 0
- Dynamic `.deploy-go` creation payload -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic `touch` option payloads (`touch -- .deploy-go`, `touch -m ./.deploy-go`) -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic `./.deploy-go` creation payload -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic `./.deploy-go` redirection payload -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic `.//.deploy-go` creation payload -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic `.//.deploy-go` redirection payload -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- Dynamic shell redirection payloads (`:>`, attached `>`, fd `1>`/`2>`, `>|`, `&>`, `&>>`, and quoted paths) to `.deploy-go` variants -> blocked with `GSD_POLICY_BLOCK: agent must not create .deploy-go`
- `npm run gsd:invariants` -> `GSD_INVARIANTS: PASS`
- `npm run gsd:done -- --audit-pass-file .planning/reconcile-seo-cluster-queue/AUDIT_FANOUT.md` -> `GSD_DONE: PASS`
- `npm run gsd:offline-certify -- --quick` -> `GSD_OFFLINE_CERTIFY: PASS quick`
- `npm run lint` -> exit 0

## Gates

No merge, deploy, AWS write, Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, live provider, or `production-content-enricher` action was performed.
