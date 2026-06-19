# CHANGE_MANIFEST - Portal Homepage Log Hygiene

Generated: 2026-06-19

## Summary

Removed debug `console.log` traces from the portal homepage search flow while preserving search
validation, normalization, GA tracking, suggestion selection, and navigation behavior.

## Files Changed

- `app/[locale]/portal/PortalPageClient.tsx`
  - Removed debug logs from `handleSearch`.
  - Removed debug logs from form submit handling.
  - Removed debug logs from Combobox suggestion selection.
- `.planning/portal-homepage-log-hygiene/TASK_SPEC.md`
  - Added scope and validation plan.
- `.planning/portal-homepage-log-hygiene/CHANGE_MANIFEST.md`
  - Added this handoff record.
- `TASK_QUEUE.md`
  - Marked T16 as done after PR handoff.

## Validation

- `rg -n "console\\.log" 'app/[locale]/portal/PortalPageClient.tsx'` -> exit 1, expected no matches.
- `npm run lint` -> exit 0.
- `npm run type-check` -> exit 0.
- `npm test` -> exit 0; 111 passed suites, 2 skipped.
- `npm run test:e2e -- e2e/portal.spec.ts` -> exit 0; 44 passed.

## Gates

- No merge to `main`.
- No deploy.
- No AWS read/write.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No feature flag change.
- No Bedrock, LanceDB mutation, or `production-content-enricher` action.
