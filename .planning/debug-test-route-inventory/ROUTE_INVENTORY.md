# ROUTE_INVENTORY — debug-test-route-inventory

Date: 2026-07-01

This inventory classifies debug/test routes only. No route was modified.

| Route | File | Classification | Evidence | Next Action |
| --- | --- | --- | --- | --- |
| `/api/test-env` | `app/api/test-env/route.ts` | REMOVE | Returns selected environment values and all env keys containing API/URL/ENRICHER/STUDIES. Public production exposure would leak configuration shape. | Remove or restrict behind server-only guard in a separate high-risk cleanup task. |
| `/api/test-lancedb` | `app/api/test-lancedb/route.ts` | REMOVE | Executes LanceDB stats/search and returns stack on error. This can touch native/vector path and expose diagnostics. | Remove or restrict behind server-only guard in a separate high-risk cleanup task. |
| `/api/test-lambda-direct` | `app/api/test-lambda-direct/route.ts` | REMOVE | Calls configured or staging search Lambda URL and returns response plus env-derived URLs. | Remove or restrict behind server-only guard in a separate high-risk cleanup task. |
| `/api/portal/test-config` | `app/api/portal/test-config/route.ts` | REMOVE | Fetches API Gateway status test URL and returns headers, body, stack and raw env-derived config. | Remove or restrict behind server-only guard in a separate high-risk cleanup task. |
| `/:locale/portal/debug-enrich` | `app/[locale]/portal/debug-enrich/page.tsx` | PROTECT_OR_REMOVE | Client debug page posts to `/api/analyze-studies` with `forceRefresh: true`; robots disallows `/en` and `/es` paths but robots is not access control. | Prefer removal unless a protected internal diagnostic workflow is documented. |
| `/:locale/portal/stream-test` | `app/[locale]/portal/stream-test/page.tsx` | PROTECT_OR_REMOVE | Client test page exercises `StreamingResults`; robots disallows `/en` and `/es` paths but robots is not access control. | Prefer removal unless a protected internal diagnostic workflow is documented. |

## Supporting Evidence

- `app/robots.ts` disallows `/en/portal/debug-enrich`, `/es/portal/debug-enrich`,
  `/en/portal/stream-test`, and `/es/portal/stream-test`.
- `app/robots.ts` also disallows `/api/`, but API disallow is crawler guidance only and
  does not prevent direct requests.
- No authentication or explicit production guard was found in the inspected route files.

## Cleanup Rule For Phase 2

Cleanup must be separate from this inventory. A future cleanup PR should:

1. Remove one class of routes at a time or add explicit server-side guards.
2. Run `npm run test:e2e -- e2e/portal.spec.ts --workers=1`.
3. Run `npm run validate` if any route file is edited.
4. Keep rollback as a simple revert of the cleanup PR.
