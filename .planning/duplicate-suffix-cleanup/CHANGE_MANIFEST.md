# CHANGE_MANIFEST — duplicate-suffix-cleanup

Date: 2026-07-01

## Summary

Removed duplicate files with suffix ` 2` after comparison against canonical paths.

## Files Removed

- `app/api/supplements/route 2.ts`
- `app/api/test-env/route 2.ts`
- `components/portal/VariantSelectorModal 2.tsx`
- `lib/cache/simple-cache 2.ts`
- `lib/portal/variant-detector 2.ts`
- `app/api/supplements/__tests__ 2/auto-embedding.property.test.ts`
- `app/api/supplements/__tests__ 2/cache-invalidation.property.test.ts`
- `app/api/supplements/__tests__ 2/insert-to-search-latency.property.test.ts`
- `app/api/supplements/__tests__ 2/scalability.property.test.ts`

## Validation

- `npm run validate` — PASS.

## Gates

- No deploy.
- No `.deploy-go`.
- No AWS reads/writes.
- No Lambda invoke/update.
- No Terraform/EventBridge.
- No Bedrock.
- No LanceDB mutation.
- No `production-content-enricher`.
- No checkout/live purchase.
- No real GitHub issues.
