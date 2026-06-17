# TASK_SPEC - Review E2E Runtime Isolation

Generated: 2026-06-17

## Objective

Review Playwright runtime isolation and patch only proven local test isolation gaps.

## Reconciliation Against `origin/main`

- `playwright.config.ts` starts the test server with `JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false`.
- `reuseExistingServer: !process.env.CI` allows local Playwright runs to reuse an already running server that may not have those isolation variables.
- `e2e/portal-real-search.spec.ts` is skipped unless `RUN_REAL_SEARCHES=1`.

## IN SCOPE

- `playwright.config.ts`
- `docs/e2e-runtime-isolation.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/review-e2e-runtime-isolation/**`

## OUT OF SCOPE

- Product UI changes
- E2E test rewrites
- Real search diagnostics redesign
- AWS/Bedrock/Lambda calls
- Merge, deploy, Terraform, EventBridge, feature flags

## Implementation Plan

1. Make existing-server reuse opt-in via `PLAYWRIGHT_REUSE_SERVER=1`.
2. Document default e2e isolation and real-search caveats.
3. Run Playwright portal e2e after config change.

## Validation Harness

```bash
npm run test:e2e -- e2e/portal.spec.ts
git diff --check
rg -n "PLAYWRIGHT_REUSE_SERVER|JOB_STORE_DRIVER=memory|SEARCH_BACKEND=local" playwright.config.ts docs/e2e-runtime-isolation.md OBSERVATIONS.md
```

## Risks

- Risk: local developers who rely on an existing server will need an explicit opt-in.
- Mitigation: document `PLAYWRIGHT_REUSE_SERVER=1` and default to isolation.
