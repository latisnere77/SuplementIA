# Oracle-first GSD v2

This repo adapts the Software-E2E-Autonomo and AnkoSoft Agentic SDLC method to
SuplementAI's existing GSD loop. The rule is: autonomy is only as reliable as the oracle
that certifies it.

## Project Context

- Product: Next.js evidence-aware supplement search and recommendation portal.
- User/case: people comparing supplements need prudent, traceable answers without unsafe
  clinical claims.
- Stack: Next.js App Router i18n, TypeScript, Jest, Playwright, AWS Amplify, GSD gates.
- First milestone DONE: Codex and Claude share one contract, SDD artifacts are versioned,
  TDD red/green checkpoints are explicit, deploy remains default-deny, L0-L4 autonomy is
  declared, and invariants protect the oracle.

## Phase 0 Retrofit Checklist

- `AGENTS.md` remains the model-agnostic authority and stays command-first.
- `CLAUDE.md` references `@AGENTS.md` so Claude Code and Codex share the same contract.
- `STATE.md` captures current posture without replacing `ROADMAP.md`.
- `docs/done-criteria.md` remains the measurable DONE oracle.
- `docs/invariants-baseline.md` defines non-weakenable safety and methodology invariants.
- `scripts/gsd/invariant-ratchet.mjs` fails closed when required oracle files/tokens are
  missing.
- `jest.config.js` declares a positive `coverageThreshold`.
- `.deploy-go` remains absent by default and one-use by human production flow only.

## SDD Cycle

Every task follows this order and leaves versioned artifacts:

1. Specify: `.planning/<slug>/TASK_SPEC.md`
2. Plan: `.planning/<slug>/PLAN.md` when the task has more than one implementation step.
3. Tasks: `.planning/<slug>/TASKS.md` when work is split across agents or batches.
4. Implement: code/docs changes only after the spec and required gates exist.
5. Verify: `.planning/<slug>/AUDIT_FANOUT.md` and `CHANGE_MANIFEST.md`.

For small one-file or docs-only tasks, `TASK_SPEC.md` may include the plan/tasks sections
inline. For broad or product-facing work, separate `PLAN.md` and `TASKS.md` are required.

## Human Gates

Human GO is required:

- Between plan and implement for newly proposed product work not already in
  `TASK_QUEUE.md`, `ROADMAP.md`, or an explicit user assignment.
- Before merge to `main`.
- Before deploy, `.deploy-go`, AWS writes, Lambda invoke/update, Terraform/EventBridge,
  feature flags, Bedrock, LanceDB mutation, checkout/live purchase, real GitHub issues, or
  `production-content-enricher`.

## TDD Contract

For product behavior changes:

1. Write or update tests first.
2. Run the focused tests and record that they fail for the expected reason.
3. Commit that test checkpoint when the task scope requires a red/green audit trail.
4. Implement the smallest fix until tests pass.
5. Do not weaken or rewrite tests merely to pass.

Docs-only or governance-only changes can skip the red test checkpoint, but must state why
TDD is not applicable in `TASK_SPEC.md` or `CHANGE_MANIFEST.md`.

## L0-L4 Autonomy Ladder

- L0 Manual: human specifies exact commands and reviews every step.
- L1 Supervised task: agent executes one bounded task with human merge/deploy gates.
- L2 Queue autonomous: agent drains approved `TASK_QUEUE.md`/`ROADMAP.md` work and opens PRs.
- L3 Multi-agent bounded: workers split disjoint scopes; read-only verifier certifies.
- L4 Continuous governed: agent proposes queue expansions only through oracle-backed
  discovery and human-approved gates.

SuplementAI operates at L2 for approved queue/roadmap work, drops to L1 for new
methodology/product proposals, and only uses L3 when the simple path is insufficient.

## Mini-benchmark To Raise Autonomy

Before moving up one level, a batch must show:

- Three consecutive tasks closed with `GSD_DONE: PASS`.
- No gate violations.
- No repeated same-error loop beyond the circuit breaker.
- CI green or a documented external pending state.
- At least one independent read-only audit artifact per task.

## Context Engineering

- Use just-in-time `rg`/file reads instead of loading the whole repo.
- Record durable decisions under `docs/decisions/`.
- Compact long sessions into `STATE.md`, `ROADMAP.md`, task planning files, or decision
  records rather than relying on chat memory.
