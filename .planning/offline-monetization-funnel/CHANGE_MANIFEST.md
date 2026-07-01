# CHANGE_MANIFEST — offline-monetization-funnel

Date: 2026-07-01

## Summary

Documented the monetization surfaces that can be verified offline and separated them from live
Stripe/checkout and affiliate-network gates.

## Files Changed

- `.planning/offline-monetization-funnel/TASK_SPEC.md`
- `.planning/offline-monetization-funnel/FUNNEL_EVIDENCE.md`
- `.planning/offline-monetization-funnel/AUDIT_FANOUT.md`
- `.planning/offline-monetization-funnel/CHANGE_MANIFEST.md`
- `TASKS.md`
- `.refactor-session.md`

## Validation

- `npm test -- --runInBand --runTestsByPath lib/portal/iherb-affiliate.test.ts` — PASS (1 suite, 9 tests).

## Gates

- No live checkout or purchase.
- No Stripe mutation.
- No affiliate-network call.
- No production flag change.
- No deploy.
- No `.deploy-go`.
- No AWS reads/writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
- No real GitHub issues.
