# SuplementAI GSD Autonomous SDLC

This is the repo-local autonomy layer for SuplementAI. It keeps humans out of routine quality approval while preserving the gates that protect `main`, production, AWS, Bedrock, LanceDB, and the content enricher.

## Map

The loop is:

`preflight -> select task -> spec -> execute -> offline certify -> read-only audit fan-out -> DONE oracle -> PR -> reset context`

The human only gates:

- merge to `main`;
- deploy/production or `.deploy-go`;
- AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flags;
- Bedrock, LanceDB mutation, `production-content-enricher`;
- executive scope decisions and milestone closure.

## Six Capabilities

1. **GO-gate**
   - Blocks outward/prod actions unless a human explicitly authorizes the exact action.
   - The agent never creates `.deploy-go`.

2. **Guard**
   - Enforces scope reflex, exact in-scope files, one writer per file, max 3 repeated failures, and no unplanned refactors.

3. **Invariant ratchet**
   - Checks baseline safety invariants before DONE.
   - Any edit to this layer is tamper-visible in the digest.

4. **Offline correctness harness**
   - Runs real local validation without live providers or production side effects.
   - Includes Playwright when portal/category/SEO/render behavior changes.

5. **Audit fan-out**
   - Uses read-only reviewers that are not the writer: `gsd_reviewer`, `gsd_verifier`, and `gsd_smoke_tester`.
   - The writer cannot mark DONE without their PASS evidence.

6. **DONE-CRITERIA oracle**
   - Closes work only when validation, independent audit, and invariants pass.
   - Build success alone is not DONE.

## What Exists Now

- `AGENTS.md` has the core Agentic SDLC and production gates.
- `.agents/skills/suplementai-gsd/` provides the reusable GSD workflow.
- `.codex/agents/` defines read-only reviewer/verifier/smoke roles.
- `.codex/hooks.json` wires command-policy and stop-digest hooks.
- `scripts/gsd/` provides deterministic local checks.
- `docs/done-criteria.md` and `docs/invariants-baseline.md` define the closure oracle.

## Operator Prompt

Use this prompt repeatedly after the GSD layer is merged. It is designed to be iterative: each run takes the next actionable task, leaves a PR ready for human review, or stops at a declared terminal state.

```text
Usa el skill SuplementAI GSD (`.agents/skills/suplementai-gsd/`) y opera bajo `AGENTS.md`.

Ejecuta el loop GSD continuo:
preflight -> selección de tarea -> spec -> ejecución -> certificación offline -> audit fan-out read-only -> DONE oracle -> PR -> reset context.

No inventes tareas. Si `TASK_QUEUE.md` tiene tareas PENDING, toma la primera accionable. Si no hay tareas PENDING, determina si el repo está `review_bound`, `waiting_human_go` o `product_ready_candidate`.

El escritor nunca se auto-aprueba. DONE requiere:
- `npm run gsd:invariants`
- validación offline aplicable
- audit fan-out read-only con `gsd_reviewer`, `gsd_verifier`, `gsd_smoke_tester`
- `.planning/<slug>/AUDIT_FANOUT.md` con PASS explícito
- `npm run gsd:done -- --audit-pass-file .planning/<slug>/AUDIT_FANOUT.md`

Para portal/category/SEO/render, corre Playwright local además de lint/type-check/Jest.

Nunca hagas merge a main, auto-merge, deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, live providers, scraping, vector sync, HERMES, research_broker ni `production-content-enricher` sin GO humano explícito y TASK_SPEC propio.

Ejecuta hasta PR ready-for-review o estado terminal. Reporta DIGEST corto: tarea, rama, PR, validación, gates no cruzados, estado terminal.
```

## Terminal Meaning

- `closed`: the current task is complete and a PR is ready for human review.
- `review_bound`: work is waiting on human PR review or merge.
- `waiting_human_go`: work is waiting on deploy/prod/AWS/Terraform/Bedrock/LanceDB/content-enricher GO.
- `blocked`: scope, evidence, invariant, or circuit-breaker issue needs human decision.
- `product_ready_candidate`: no active tasks, no required open PR, relevant CI green, no `.deploy-go`, and no critical finding without a task.

This prompt can be reused until the project reaches `product_ready_candidate`. It cannot truthfully claim "100% productivo" until human-owned gates are also complete: required PRs merged, release/deploy decisions made, production smoke accepted when applicable, and no active critical tasks remain.

## What Still Requires Future Work

- A domain-specific formula correctness fixture harness can be added when the formula pipeline source of truth is identified.
- CI can add `npm run gsd:invariants` after this PR is merged.
- A repo or org plugin can package this skill after the workflow stabilizes.
