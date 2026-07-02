# TASK_SPEC - gsd-limit-tool-counts

Date: 2026-07-01

## Objective

Implement physical per-session `LimitToolCounts` enforcement in the existing GSD tool budget
hook so local autonomy limits are enforced by code instead of prompt memory.

## Scope

In scope:

- `scripts/gsd/tool-budget-policy.mjs`
- `scripts/gsd/__tests__/tool-budget-policy.test.js`
- `.codex/hooks.json`
- `.planning/gsd-limit-tool-counts/**`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

Out of scope:

- Product runtime code.
- Portal/render/API behavior.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.
- Changing the command policy hook or production gates.

## Harness

```bash
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:done -- --check-config-only
```

## Substitution Test

If `LimitToolCounts` remains document-only, a session can exceed configured tool budgets as
long as individual commands are not identical, so the task still fails.

## Design

- Reuse `scripts/gsd/tool-budget-policy.mjs` instead of introducing a second hook.
- Persist counts in the existing per-session state file.
- Enforce hard default limits: `exec<=24`, `apply_patch<=8`, `git<=4`.
- Allow environment configuration only to make limits stricter, never looser.
- Count every shell command as `exec`; count shell commands beginning with `git` against
  both `exec` and `git`; count explicit apply-patch/edit payloads as `apply_patch`.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out review for hard-limit behavior, session
isolation, local-only state, and no production gate crossing.
