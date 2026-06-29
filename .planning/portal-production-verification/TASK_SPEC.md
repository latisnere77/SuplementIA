# TASK_SPEC — portal-production-verification

## Objective

Execute Phase 5 portal production verification in public/read-only mode and record
evidence without deploying, reading/writing AWS, invoking Lambda, changing infrastructure,
creating `.deploy-go`, or making product changes.

## Substitution Test

If this verification is not run, Phase 5 remains gated with no current public smoke
evidence for the production portal canary matrix.

## In Scope

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/portal-production-verification/TASK_SPEC.md`
- `.planning/portal-production-verification/CHANGE_MANIFEST.md`
- `.planning/portal-production-verification/AUDIT_FANOUT.md`
- `.planning/portal-production-verification/PRODUCTION_SMOKE.md`

## Out of Scope

- Product/runtime code changes.
- Deploy or `.deploy-go`.
- AWS reads or writes.
- Lambda invoke/update.
- Terraform/EventBridge.
- Feature flags.
- Bedrock.
- LanceDB mutation.
- `production-content-enricher`.
- Checkout/live purchase.
- Real GitHub issue creation.

## Authorized Read-Only Commands

- `npm run smoke:production:portal`
- `PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal`
- `PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal`
- GSD validation commands listed below.

These smoke commands perform public HTTP requests to production URLs only.

## Validation

- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/portal-production-verification/AUDIT_FANOUT.md`

## Stop Rules

- Stop if verification requires credentials, AWS APIs, mutation, deploy, `.deploy-go`,
  Lambda, Terraform/EventBridge, feature flags, Bedrock, LanceDB, checkout/live purchase,
  real GitHub issues, or `production-content-enricher`.
- Do not patch product behavior in this task. Production failures are recorded as smoke
  evidence and require a separate scoped fix.

## Audit Fan-Out Plan

Record read-only evidence for:

- Public smoke command outcomes.
- No prohibited gate crossings.
- Roadmap state after Phase 5 verification.
