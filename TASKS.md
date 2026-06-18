# TASKS - Proposed Agentic Backlog

Generated: 2026-06-17

These tasks come from a read-only governance and architecture audit. They are not active queue work until a human promotes them into `TASK_QUEUE.md` or explicitly assigns them. Each implementation must still follow `AGENTS.md` SPEC -> LOOP -> FLUSH and must not merge to `main`.

- [ ] TAREA: Define Fully Autonomous Deploy Gate Protocol. ESTADO: IN_PROGRESS
  Objetivo: specify the exact governance, command allowlist, execution harness, rollback criteria, and human-stop conditions required before agents can deploy staging or production autonomously without weakening existing review controls.
  Criterio de Arnés: `npm run validate` and `npm run test:e2e` must return exit 0 for any protocol-only implementation; if the task changes deploy commands or AWS automation docs, `AWS_PROFILE=suplementai-admin aws sts get-caller-identity --query Account --output text | grep -q '^643942183354$'` must return exit 0 before any AWS read, and no AWS write command may be executed until the protocol explicitly defines its preflight, smoke, rollback, and audit log.
  Presupuesto de Archivos por Riesgo: Alto, max 20 files with mandatory 10-file pilot batch.
  Enrutamiento de Modelo: Opus for coordination and governance design, Sonnet for implementation edits, Haiku for file navigation, GPT-5.2 for final code/governance review.
  In Scope: `AGENTS.md`, `PROJECT_CONTEXT.md`, `TASKS.md`, `OBSERVATIONS.md`, `MASTER_TASK_SPEC.md`, `docs/aws-production-alignment-runbook.md`, `docs/portal-release-hardening-checklist.md`, `infrastructure/DEPLOYMENT-SCRIPTS-README.md`, and deploy/smoke scripts only for read-only mapping unless the approved task spec explicitly authorizes edits.
  Out Of Scope: merging to `main`, production deploys, AWS writes, Lambda invoke/update, Terraform/EventBridge, feature flag flips, Bedrock actions, and `production-content-enricher` changes until the new protocol is approved and its execution harness is in place.

- [x] TAREA: Reconcile Queue State With Open PRs. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Medio
  Agente recomendado: Senior repo-ops coding agent with GitHub/PR access.

- [x] TAREA: Confirm Root Audit Artifacts Ownership. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Bajo
  Agente recomendado: Documentation and governance agent.

- [x] TAREA: Add Context Reset Governance Rule. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Bajo
  Agente recomendado: Documentation and governance agent.

- [x] TAREA: Audit Duplicate Files With Space-Two Suffix. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Medio
  Agente recomendado: Careful TypeScript maintenance agent.

- [x] TAREA: Discover Database Migration Source Of Truth. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Alto
  Agente recomendado: Backend/data platform agent with SQL migration experience.

- [x] TAREA: Classify Portal And API Logging. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Medio
  Agente recomendado: Observability-focused frontend/full-stack agent.

- [x] TAREA: Map Search Backend Contracts. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Medio
  Agente recomendado: Full-stack search/data agent.

- [x] TAREA: Plan Content Enricher Type-Safety Recovery. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Alto
  Agente recomendado: Senior TypeScript/AWS Lambda agent with human supervision.

- [x] TAREA: Review E2E Runtime Isolation. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Bajo
  Agente recomendado: QA automation agent familiar with Playwright.

- [x] TAREA: Review Unsafe Health Claim Gates. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Medio
  Agente recomendado: Health-copy QA agent plus TypeScript test agent.

- [x] TAREA: Add `.DS_Store` Hygiene Rule. ESTADO: DONE (PR #180)
  Nivel de Riesgo: Bajo
  Agente recomendado: Repository hygiene agent.
