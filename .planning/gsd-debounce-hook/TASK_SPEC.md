# TASK_SPEC - gsd-debounce-hook

Date: 2026-07-01

## Objective

Implement a physical DebounceHook for repeated commands so the third identical command in the
same session fails closed before the agent loops.

## Scope

In scope:

- `scripts/gsd/tool-budget-policy.mjs`
- `scripts/gsd/__tests__/tool-budget-policy.test.js`
- `.codex/hooks.json`
- `.planning/gsd-debounce-hook/**`
- `TASKS.md`
- `.refactor-session.md`
- `DEAD_ENDS.md`

Out of scope:

- Product runtime code.
- LimitToolCounts per tool type; that remains a separate queued task.
- Deploy, `.deploy-go`, AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB,
  checkout/live purchase, production-content-enricher, and real GitHub issues.

## Harness

```bash
npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:invariants
```

## Substitution Test

If the physical debounce hook is absent, the same command can be invoked repeatedly and safety
depends on the agent remembering the anti-loop rule instead of infrastructure enforcing it.

## Branch Reconciliation

This task is stacked on `codex/autonomous-edo-task-loop`, which already contains prior Phase 2
EDO commits against `origin/main`. Review this task by the active working-tree diff and files in
scope above. Prior committed duplicate-cleanup/runtime deletions are not edited by this task.

## Fan-Out Plan

After the harness exits 0, run read-only fan-out review for hook wiring, debounce behavior,
local-only state, and no production gate crossing.
