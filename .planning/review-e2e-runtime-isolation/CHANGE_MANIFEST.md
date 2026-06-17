# CHANGE_MANIFEST - Review E2E Runtime Isolation

## Status

Done in PR #180: https://github.com/latisnere77/SuplementIA/pull/180

## Files Changed

- `playwright.config.ts`
- `docs/e2e-runtime-isolation.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/review-e2e-runtime-isolation/TASK_SPEC.md`
- `.planning/review-e2e-runtime-isolation/CHANGE_MANIFEST.md`
- `.planning/review-e2e-runtime-isolation/HANDOFF.md`

## Validation

- `npm run test:e2e -- e2e/portal.spec.ts`
- `git diff --check`
- `rg -n "PLAYWRIGHT_REUSE_SERVER|JOB_STORE_DRIVER=memory|SEARCH_BACKEND=local" playwright.config.ts docs/e2e-runtime-isolation.md OBSERVATIONS.md`

## Notes

- Existing server reuse is now opt-in through `PLAYWRIGHT_REUSE_SERVER=1`.
- Default e2e runs start an isolated local server.
