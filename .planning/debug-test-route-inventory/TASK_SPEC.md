# TASK_SPEC — debug-test-route-inventory

Date: 2026-07-01

## Objective

Inventory and classify debug/test routes without modifying product behavior.

## Scope

In scope:

- `.planning/debug-test-route-inventory/**`
- `TASKS.md`
- `.refactor-session.md`

Out of scope:

- Removing, protecting, or editing routes.
- Portal UI changes.
- API behavior changes.
- AWS, Lambda, Terraform/EventBridge, Bedrock, LanceDB, production-content-enricher,
  checkout/live purchase, real GitHub issues, deploy, and `.deploy-go`.

## Harness

```bash
npm run test:e2e -- e2e/portal.spec.ts --workers=1
```

## Playwright Applicability

Required by the task harness and by AGENTS.md because future cleanup may affect portal
routes. This task itself is documentation-only.
