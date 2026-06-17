# E2E Runtime Isolation

Generated: 2026-06-17

## Default Contract

Playwright starts its own Next.js dev server with:

```text
JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false
```

This keeps normal portal e2e runs away from DynamoDB job storage, Lambda search, LanceDB, and Bedrock-backed embedding paths.

## Existing Server Reuse

Existing server reuse is disabled by default because a manually started server may not have the isolation environment above.

Opt in only when the existing server was started with matching isolation:

```bash
PLAYWRIGHT_REUSE_SERVER=1 npm run test:e2e
```

## Real Search Diagnostics

`e2e/portal-real-search.spec.ts` remains skipped unless `RUN_REAL_SEARCHES=1`. Treat that mode as a diagnostic path. Do not assume it has the same isolation guarantees as the default portal e2e run unless the env contract is inspected for that specific run.
