# SDD Task Template

Copy this structure into `.planning/<slug>/` for non-trivial tasks.

## 1. Specify — TASK_SPEC.md

- Objective
- User-approved context or queue source
- Files in scope
- Files out of scope
- Substitution test
- Human gates
- Validation commands
- Stop rules

## 2. Plan — PLAN.md

- Implementation approach
- Risk review
- File ownership
- Migration or compatibility notes
- Why no simpler path is enough

## 3. Tasks — TASKS.md

- Ordered checklist
- Batch boundaries
- Worker ownership if multi-agent is used
- Required red/green checkpoints

## 4. Implement

- Write tests first for product behavior changes.
- Confirm focused tests fail for the expected reason.
- Commit the red checkpoint when the task requires an audit trail.
- Implement the smallest scoped change.
- Do not edit tests only to make them pass.

## 5. Verify

- Focused tests.
- `npm run gsd:invariants`.
- `npm run gsd:offline-certify -- --quick` or stronger applicable validation.
- Playwright for portal/render/API behavior when required.
- `git diff --check`.
- `AUDIT_FANOUT.md`.
- `npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md`.
- `CHANGE_MANIFEST.md`.
