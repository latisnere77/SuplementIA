# CHANGE_MANIFEST: Fix Portal E2E JSON Parse Failure

## Status

DONE in local commit.

## Files Changed

- `TASKS.md`
- `playwright.config.ts`
- `.planning/fix-portal-e2e-json-parse/TASK_SPEC.md`
- `.planning/fix-portal-e2e-json-parse/CHANGE_MANIFEST.md`

## Change Summary

- Added an explicit queue task for the portal e2e JSON.parse/runtime failure.
- Forced the Playwright-managed Next.js dev server to use webpack, matching the production build harness.
- Disabled default Playwright full parallelism and set default workers to 1, with `PLAYWRIGHT_WORKERS` as an explicit override.
- Marked the prior deploy-gate governance task back to `PENDING` because its documented blocker, local Playwright failure, is now resolved.

## Validation

- `npm run test:e2e` before fix: exit 1; reproduced Next runtime `Unexpected end of JSON input` plus parallel navigation failures.
- `npx playwright test e2e/portal.spec.ts --project=chromium --workers=1 --grep "Spanish category cards|category pages keep card language|supplement detail shell"` after first config change: exit 0.
- `npm run test:e2e` after final config: exit 0; 44 passed, 78 skipped.
- `npm run validate`: exit 0; type-check passed, build passed, Jest 111 passed / 2 skipped.

## Notes

- No production, AWS, Terraform, Lambda, Bedrock, deploy, or merge action was executed.
- `OBSERVATIONS.md` root was already modified before this task and remains outside this task's commit scope.
