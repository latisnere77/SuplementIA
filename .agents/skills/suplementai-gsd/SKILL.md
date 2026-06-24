---
name: suplementai-gsd
description: Run SuplementAI's autonomous GSD SDLC loop with offline certification, invariant ratchets, read-only audit fan-out, DONE-CRITERIA, and strict production gates. Use when asked to continue the queue, execute Agentic SDLC work, bootstrap autonomy, certify DONE, or avoid human quality approvals while preserving merge/deploy gates.
---

# SuplementAI GSD

Use this skill to run SuplementAI's "get shipping done" loop. The skill replaces prompt-heavy A/B/C cycles with repo-local policy, deterministic checks, and independent read-only verification.

## Non-negotiables

- `AGENTS.md` is authority. This skill adds workflow mechanics; it does not relax gates.
- Never merge `main`, enable auto-merge, create `.deploy-go`, deploy, run AWS writes, invoke/update Lambda, run Terraform/EventBridge, mutate LanceDB, use Bedrock, or touch `production-content-enricher` unless an explicit approved production TASK_SPEC and human GO allow that exact action.
- The writer never self-approves. DONE requires offline checks plus independent read-only audit evidence.
- Do not invent product tasks. Work from `TASK_QUEUE.md`, an explicit user assignment, or a user-approved new task.
- If the task touches portal/category/SEO/render, run Playwright locally in addition to lint/type-check/Jest.

## Loop

1. **Preflight**
   - `git fetch origin`
   - `git status --short --branch`
   - `git rev-parse --abbrev-ref HEAD`
   - `git rev-parse HEAD`
   - `gh pr list --state open --json number,title,headRefName,baseRefName,state,isDraft,url,mergeStateStatus,statusCheckRollup`
   - `test -f .deploy-go && printf 'DEPLOY_GO_PRESENT\n' || printf 'DEPLOY_GO_ABSENT\n'`

2. **Select**
   - If a user assigned a task, use that scope.
   - Otherwise take the first `PENDING` task in `TASK_QUEUE.md`.
   - If only PR review/merge/prod/deploy work remains, stop with `review_bound` or `waiting_human_go`.

3. **Spec**
   - Write `.planning/<slug>/TASK_SPEC.md`.
   - Include exact files in scope, out of scope, validation commands, substitution test, stop rules, human gates, and audit-fanout plan.
   - Existing `PENDING` queue tasks are implicitly approved. New agent-proposed tasks need human approval before execution.

4. **Execute**
   - Create a feature branch from `origin/main` unless the spec says the task must stack on an open branch.
   - Edit only in-scope files.
   - Keep one writer per file. Use subagents only for disjoint work or read-only review.
   - Stop after 3 repeated failures of the same gate.

5. **Auto-certify**
   - Run `npm run gsd:invariants`.
   - Run `npm run gsd:offline-certify` or the exact task validation commands.
   - Spawn read-only fan-out if available: reviewer, verifier, smoke-tester. They must not write.
   - Record audit evidence in `.planning/<slug>/AUDIT_FANOUT.md`.
   - Run `npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md`.

6. **Flush**
   - Commit and push the feature branch.
   - Open/update a PR ready for review against `main`.
   - Write `.planning/<slug>/CHANGE_MANIFEST.md`.
   - Mark queue task `DONE (PR #n)` if it came from `TASK_QUEUE.md`.
   - Do not merge. Reconstruct context before taking another task.

## Stop States

- `closed`: task complete and PR ready.
- `review_bound`: only human PR review/merge remains.
- `waiting_human_go`: only merge/deploy/AWS/Terraform/Bedrock/LanceDB/prod GO remains.
- `blocked`: circuit breaker, invariant red, ambiguous scope, missing rollback/smoke for prod, or contradictory state.
- `product_ready_candidate`: no active queue/spec/critical findings, CI green, no `.deploy-go`, and no open PR needed for product state.

## References

- `docs/gsd-autonomous-sdlc.md` for architecture.
- `docs/done-criteria.md` for the DONE rubric.
- `docs/invariants-baseline.md` for ratchet rules.
