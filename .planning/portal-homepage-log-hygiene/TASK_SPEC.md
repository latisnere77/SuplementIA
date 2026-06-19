# TASK_SPEC - Portal Homepage Log Hygiene

Generated: 2026-06-19

## Task

T16 - Portal log hygiene: remove homepage search debug logs.

## Objective

Remove client-side debug `console.log` calls from the portal homepage search flow without
changing user-facing behavior, analytics events, validation guardrails, autocomplete selection,
form submission, or routing.

## IN SCOPE

- `app/[locale]/portal/PortalPageClient.tsx`
- `.planning/portal-homepage-log-hygiene/TASK_SPEC.md`
- `.planning/portal-homepage-log-hygiene/CHANGE_MANIFEST.md`
- `TASK_QUEUE.md` status update after PR handoff

## OUT OF SCOPE

- `app/[locale]/portal/results/page.tsx`
- API routes
- SEO/category pages
- Autocomplete backend behavior
- UI copy, styling, layout, or animation changes
- GA event payload changes
- Auth, Stripe, AWS/Lambda, Bedrock, LanceDB, `production-content-enricher`
- Dependency updates or shared logger abstractions

## Implementation Plan

1. Remove `console.log` statements from `handleSearch`, the form submit handler, and Combobox
   suggestion selection handler in `PortalPageClient.tsx`.
2. Preserve all existing branches and side effects:
   - empty query returns without navigation
   - invalid query sets `validationError`
   - valid query normalizes and navigates to `/portal/results`
   - GA `search_started` events remain unchanged
   - selected suggestions still call `handleSearch(value)`
3. Verify there are no remaining `console.log` calls in the file.
4. Run required portal-render validation.

## Validation

Because this touches `app/[locale]/portal/**`, run:

```bash
npm run lint
npm run type-check
npm test
npm run test:e2e -- e2e/portal.spec.ts
```

Expected: every command exits 0.

## Risks

- Removing debug logs is behavior-neutral only if no branch condition is changed.
- Portal e2e may expose unrelated flake; retry policy is max three attempts for the same failure.
