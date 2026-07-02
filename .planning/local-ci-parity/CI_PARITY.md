# Local CI Parity

Date: 2026-07-01

## Local Harness Result

Command:

```bash
npm run gsd:invariants && npm run lint && npm run type-check && npm run build && npm test -- --runInBand && npm run test:e2e
```

Result: PASS.

Observed checkpoints:

- `npm run gsd:invariants`: `GSD_INVARIANTS: PASS`.
- `npm run lint`: PASS.
- `npm run type-check`: route types generated and `tsc --noEmit` PASS.
- `npm run build`: PASS; 133 static pages generated.
- `npm test -- --runInBand`: 111 suites passed, 2 skipped; 834 tests passed, 15 skipped.
- `npm run test:e2e`: 46 passed, 78 skipped.

## CI Workflow

CI file: `.github/workflows/quality-gates.yml`

CI runs:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run gsd:invariants`
4. `npm run lint`
5. `npm run type-check`
6. `npm run build`
7. `npm test -- --runInBand`
8. `npm audit`
9. `npm run test:e2e`
10. `RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1`

## Differences

| CI Step | Local Harness Coverage | Note |
| --- | --- | --- |
| `npm ci` | Not rerun | Local workspace already had dependencies installed; CI uses clean install. |
| Playwright install | Not rerun | Local browsers were already available. |
| Node version | Different | CI uses Node 20; local command ran under the current desktop Node runtime. |
| `npm audit` | Not in TASKS harness | CI will still run it; a failure should be handled as a dependency/security task, not mixed into product work. |
| `RUN_REAL_SEARCHES=1` matrix | Not in TASKS harness | `npm run test:e2e` skipped 78 real-search cases as expected; CI runs them separately with the env flag. |

## Warnings Observed

- Build and Playwright emitted Browserslist stale-data warnings.
- Playwright worker processes emitted `NO_COLOR` ignored because `FORCE_COLOR` is set.
- Playwright web server logged an expected mocked portal outcome error during the CBD-scoped test,
  but the test passed.

These warnings did not fail the harness and should be handled only in separate cleanup tasks if
they become noisy or blocking.

## Next Safe Step

Keep CI unchanged. If full local reproduction of CI is needed, run a separate task with:

```bash
npm audit && RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1
```

That command can be slow and may depend on local browser/network conditions, so it should be
claimed explicitly instead of folded into unrelated work.
