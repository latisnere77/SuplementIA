# SuplementAI DONE-CRITERIA

A task is DONE only when all required evidence is present. The writer's judgment is not enough.

## Required Evidence

- Scope matches the task spec.
- SDD artifacts exist for the task phase: specify, plan/tasks when applicable, implement
  evidence, and verify evidence.
- Product behavior changes include a TDD red/green checkpoint, or the task documents why
  TDD is not applicable.
- Substitution test passes: if an edit were removed, the task would fail.
- In-scope files only, unless the spec was updated before execution.
- `npm run gsd:invariants` passes.
- Offline validation passes with explicit exit 0.
- Portal/category/SEO/render work includes local Playwright.
- Unsafe health-claim gates remain intact.
- No negative test control is weakened.
- No live/prod/AWS write/Bedrock/LanceDB mutation/content-enricher action occurred unless the spec and human GO explicitly allowed it.
- Read-only audit fan-out evidence exists with:
  - `REVIEWER: PASS`
  - `REVIEWER_ISOLATED: YES`
  - `VERIFIER: PASS`
  - `VERIFIER_ISOLATED: YES`
  - `SMOKE_TESTER: PASS`
  - `SMOKE_TESTER_ISOLATED: YES`
  - `WRITER_SELF_APPROVAL: NO`

## Rubric

| Area | PASS | FAIL |
| --- | --- | --- |
| Scope | Exact files and behavior match spec | Scope expanded silently |
| Validation | Required commands have explicit PASS/exit 0 | Missing, ambiguous, or stale evidence |
| Safety | Gates and health-claim protections remain stronger or equal | Gate weakening or unsafe copy |
| Independence | Non-writer audit PASS recorded | Writer self-approves |
| Tamper visibility | Any rubric/invariant/hook change is shown in digest | Safety layer changed silently |
| SDD/TDD | Required artifacts and red/green evidence are present | Feature work starts without oracle-backed tests/spec |

## Closure Rule

Use:

```bash
npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md
```

The command must print `GSD_DONE: PASS`. Otherwise the task remains open or blocked.
