# TASK_SPEC - Classify Portal And API Logging

Generated: 2026-06-17

## Objective

Classify portal and API logging so future cleanup can distinguish structured observability from debug leftovers without stripping useful operational signals.

## Reconciliation Against `origin/main`

The audit found extensive `console.*` usage in portal/UI/API paths. Existing structured logging helpers also exist:

- `lib/portal/api-logger.ts`
- `lib/portal/structured-logger.ts`
- `lib/search-service.ts` and `lib/lancedb-service.ts` gated by `DEBUG_SEARCH`

## IN SCOPE

- `docs/portal-api-logging-classification.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/classify-portal-api-logging/**`

## OUT OF SCOPE

- Removing or changing runtime logs
- Introducing new logging abstractions
- Editing portal/API behavior
- PII redaction implementation
- Merge, deploy, AWS, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Inventory high-volume `console.*` files.
2. Classify logs as structured/intentional, operational error/warn, debug residual, or test-only.
3. Record priority cleanup targets and guardrails.
4. Update observations and task state.

## Validation Harness

```bash
git diff --check
rg -n "Debug Residual|Structured Observability|Cleanup Priority" docs/portal-api-logging-classification.md OBSERVATIONS.md
```

Full app validation is out of scope because this task changes only documentation.

## Risks

- Risk: later cleanup removes logs that are relied on during incidents.
- Mitigation: classify before editing and preserve structured outcome/error logs.
