# TASK_SPEC - Map Search Backend Contracts

Generated: 2026-06-17

## Objective

Document search backend contracts, environment switches, fallback behavior, and AWS/Bedrock boundaries.

## Reconciliation Against `origin/main`

Relevant code paths:

- `lib/search-service.ts`
- `lib/lancedb-service.ts`
- `lib/portal/autocomplete-suggestions-fuzzy.ts`
- `app/api/portal/search/route.ts`
- `app/api/portal/autocomplete/route.ts`
- `app/api/portal/quiz/route.ts`
- `playwright.config.ts`

## IN SCOPE

- `docs/search-backend-contracts.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/map-search-backend-contracts/**`

## OUT OF SCOPE

- Search implementation changes
- New abstractions
- Bedrock/LanceDB calls
- Real search e2e
- Merge, deploy, AWS writes, Lambda invoke/update, Terraform, EventBridge, feature flags

## Implementation Plan

1. Document `SEARCH_BACKEND`, `USE_LANCEDB`, `SEARCH_API_URL`, `LANCEDB_PATH`, and debug flags.
2. Map contracts for portal search, quiz hybrid search, and autocomplete.
3. Record local/e2e isolation contract.
4. Update observations and task state.

## Validation Harness

```bash
git diff --check
rg -n "SEARCH_BACKEND|USE_LANCEDB|Bedrock Boundary|E2E Isolation Contract" docs/search-backend-contracts.md OBSERVATIONS.md
```

Full app validation is out of scope because this task changes only documentation.

## Risks

- Risk: docs imply live AWS/Bedrock use is safe.
- Mitigation: explicitly identify Bedrock/LanceDB paths as gated and disable them in e2e/local isolation.
