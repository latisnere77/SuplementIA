# TASK_SPEC — script-gate-matrix

Date: 2026-07-01

## Objective

Create a matrix of infrastructure and script entrypoints that can deploy, write, delete,
mutate LanceDB/Bedrock, or otherwise cross production gates.

## Scope

In scope:

- `.planning/script-gate-matrix/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Executing infrastructure scripts.
- Editing scripts.
- Deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB
  mutation, production-content-enricher, checkout/live purchase, and real GitHub issues.

## Harness

```bash
npm run gsd:invariants
```
