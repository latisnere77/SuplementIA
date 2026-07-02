# TASK_SPEC - pr198-real-search-navigation-hardening

Date: 2026-07-01

## Objective

Fix the PR #198 CI failure where one real-search Playwright case clicked `Go` but stayed on
`/en/portal` instead of navigating to `/en/portal/results`.

## Scope

In scope:

- `e2e/portal-real-search.spec.ts`
- `.planning/pr198-real-search-navigation-hardening/**`

Out of scope:

- Product runtime code.
- Portal component behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Failure Evidence

GitHub `Validate` job `84680290743` failed in:

```text
e2e/portal-real-search.spec.ts:65
live result quality for valeriana officinalis
Expected pattern: /\/en\/portal\/results\?/
Received string: "http://127.0.0.1:3100/en/portal"
```

The paired `Validate` job on the same head passed, so this is a CI flake in the browser
submission path rather than a deterministic product failure.

## Harness

```bash
RUN_REAL_SEARCHES=1 npm run test:e2e -- e2e/portal-real-search.spec.ts --workers=1 --project=chromium --grep "valeriana officinalis"
```

Also run:

```bash
npm run gsd:invariants
```

## Substitution Test

If the test keeps typing sequentially and then clicks without waiting for navigation in the same
action, React state and browser action timing can leave the page at `/en/portal`, reproducing
the observed CI failure.

## Stop Rules

- If local focused Playwright cannot run because of environment constraints, document the exact
  blocker and run the strongest static/GSD validation available.
- Do not alter product runtime behavior for a single flaky e2e transition unless the local
  repro proves product code is broken.
