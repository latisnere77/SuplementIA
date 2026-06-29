# CHANGE_MANIFEST — portal-production-verification

## Summary

- Ran Phase 5 public/read-only production smoke commands against the three checklist base
  URLs.
- Recorded smoke evidence in `.planning/portal-production-verification/PRODUCTION_SMOKE.md`.
- Updated `ROADMAP.md` and `.planning/queue-idle.md` to reflect that Phase 5 verification
  was executed but failed.
- Did not mark Phase 5 `HECHO`.

## Files Changed

- `ROADMAP.md`
- `.planning/queue-idle.md`
- `.planning/portal-production-verification/TASK_SPEC.md`
- `.planning/portal-production-verification/PRODUCTION_SMOKE.md`
- `.planning/portal-production-verification/CHANGE_MANIFEST.md`
- `.planning/portal-production-verification/AUDIT_FANOUT.md`

## Validation

- `npm run smoke:production:portal` — FAIL, 3 public canary failures.
- `PRODUCTION_BASE_URL=https://www.suplementai.com npm run smoke:production:portal` — FAIL, 3 public canary failures.
- `PRODUCTION_BASE_URL=https://main.d2yn3faih4ykom.amplifyapp.com npm run smoke:production:portal` — FAIL, 1 public canary failure.
- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- `node scripts/gsd-autonomous.mjs --recon`
- `git diff --check`
- `npm run gsd:done -- --audit-pass-file .planning/portal-production-verification/AUDIT_FANOUT.md`

## Gates

- No deploy.
- No `.deploy-go`.
- No AWS reads or writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flags.
- No Bedrock.
- No LanceDB mutation.
- No checkout/live purchase.
- No real GitHub issue creation.
- No provider/PubMed direct calls.
- No `production-content-enricher`.
