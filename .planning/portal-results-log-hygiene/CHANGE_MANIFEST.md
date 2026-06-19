# CHANGE_MANIFEST - Portal Results Log Hygiene

Generated: 2026-06-19

## Summary

Gated trace-level portal results logs behind a local debug flag without changing result rendering,
cache behavior, async polling, variant selection, warnings, or errors.

## Files Changed

- `app/[locale]/portal/results/page.tsx`
  - Added file-local `debugPortalResults()` helper gated by `NEXT_PUBLIC_DEBUG_PORTAL === 'true'`.
  - Replaced direct `console.log` traces with `debugPortalResults`.
  - Preserved existing `console.warn` and `console.error` operational logs.
- `.planning/portal-results-log-hygiene/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/portal-results-log-hygiene/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T18 done after PR handoff.

## Validation

- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test` -> exit 0; 111 passed suites, 2 skipped.
- `npm run test:e2e -- e2e/portal.spec.ts` -> exit 0; 44 passed.
- `rg -n "console\\.log" 'app/[locale]/portal/results/page.tsx'` -> only the debug helper uses `console.log`.

## Gates

- No merge to `main`.
- No deploy.
- No AWS read/write.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flag change.
- No Bedrock, LanceDB mutation, or `production-content-enricher` action.
