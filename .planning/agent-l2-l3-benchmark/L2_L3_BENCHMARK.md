# L2 To L3 Agent Benchmark

Date: 2026-07-01

## Current Recon

Command:

```bash
node scripts/gsd-autonomous.mjs --recon
```

Result:

- Exit code: 0.
- Roadmap phases: 11.
- `HECHO`: 7.
- `ESPERA_GATE`: 4.
- `ABIERTA_REAL`: 0.
- Next open phase: none.

Interpretation: the repo is not currently asking for an `ABIERTA_REAL` product task. Remaining
roadmap phases are gate-bound, so L3 must not be activated for remote writes or product expansion.

## L2 Definition For This Repo

L2 means one orchestrator drains already-approved queue/roadmap/documented tasks, creates specs,
runs local harnesses, records audit evidence, commits, and opens reviewable work while preserving
human gates for merge and production actions.

Allowed in L2:

- Local docs/code edits inside selected task scope.
- Local validation, Jest, Playwright, build, lint, type-check.
- Local commits and PR preparation.
- Read-only audit evidence.

Not allowed in L2:

- Merge to `main`.
- Deploy or `.deploy-go`.
- AWS writes, Lambda invoke/update, Terraform/EventBridge.
- Feature flags, Bedrock, LanceDB mutation, production-content-enricher.
- Checkout/live purchase or real GitHub issue creation.

## L3 Candidate Definition

L3 is bounded multi-agent autonomy for disjoint local scopes. It may be used only when splitting
work reduces risk and the verifier remains independent/read-only.

Required conditions:

- At least three consecutive selected tasks close with their exact harness exit 0.
- No task leaves `IN_PROGRESS` at context close.
- No repeated same-error loop beyond the circuit breaker.
- Each worker owns disjoint files or an explicit serial group exists for shared files.
- A read-only verifier checks scope, gates, and harness evidence.
- The final writer does not self-approve.
- CI is green or the work is clearly review-bound with no code changes.

## Benchmark Batch

Before any L3 run, execute a pilot with three local-only tasks:

| Pilot Task Type | Required Evidence | Pass Condition |
| --- | --- | --- |
| Docs/governance task | `TASK_SPEC.md`, `CHANGE_MANIFEST.md`, `AUDIT_FANOUT.md` | Harness exit 0 and no gate crossing. |
| Pure-function/test task | TDD note if behavior changes, focused Jest output | Focused Jest exit 0, no unrelated files. |
| Portal/render task | Playwright evidence plus normal validation | Playwright exit 0 across configured projects. |

The pilot passes only if all three tasks are completed without scope expansion, gate crossing, or
manual correction of an agent-created unsafe action.

## L3 Execution Pattern

Use one orchestrator and three bounded workers:

- Implementation worker: writes only files listed in `TASK_SPEC.md`.
- Test/docs worker: updates tests or evidence files only when listed in scope.
- Verifier worker: read-only; runs the harness, checks gates, and records PASS/FAIL.

If two workers need the same file, downgrade to L2 serial execution for that task.

## L3 Is Not Approved For These Actions

L3 never authorizes:

- Merge to `main`.
- Deploy or `.deploy-go`.
- AWS writes or reads without STS identity confirmation.
- Lambda invoke/update.
- Terraform/EventBridge.
- Feature flags.
- Bedrock.
- LanceDB mutation.
- `production-content-enricher`.
- Checkout/live purchase.
- Real GitHub issue creation.

## Decision

SuplementAI remains L2 for approved local queue/roadmap work. L3 can be used only as a bounded
local pilot for disjoint scopes after this benchmark is explicitly selected by a future task and
the verifier is read-only.
