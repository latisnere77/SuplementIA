# CHANGE_MANIFEST - pr198-real-search-navigation-hardening

Date: 2026-07-01

## Summary

Hardened the real-search Playwright submission path by filling the query deterministically and
waiting for `/en/portal/results` in the same action window as the `Go` click.

## Files Changed

- `e2e/portal-real-search.spec.ts`
- `.planning/pr198-real-search-navigation-hardening/TASK_SPEC.md`
- `.planning/pr198-real-search-navigation-hardening/PLAN.md`
- `.planning/pr198-real-search-navigation-hardening/TASKS.md`
- `.planning/pr198-real-search-navigation-hardening/CHANGE_MANIFEST.md`
- `.planning/pr198-real-search-navigation-hardening/AUDIT_FANOUT.md`

## Validation

- `RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1 --project=chromium --grep "valeriana officinalis"` - PASS, exit 0 (1 test).
- `npm run gsd:invariants` - PASS, exit 0 (`GSD_INVARIANTS: PASS`).
- `git diff --check` - PASS, exit 0.
- Read-only reviewer - PASS for code/scope after `next-env.d.ts` generated change was restored.
- Read-only verifier - PASS for local invariants/diff state; delivery/pending-audit blockers remediated by this manifest and commit/push.
- Read-only smoke tester - PASS.

## Gates

- No merge.
- No deploy.
- No `.deploy-go`.
- No AWS.
- No Lambda/Terraform/EventBridge.
- No Bedrock/LanceDB.
- No checkout/live purchase.
- No `production-content-enricher`.
- No real GitHub issues.
