---
phase: 02-internationalization-fix
plan: 01
status: complete
duration: ~5min
---

# Plan 02-01 Summary: i18n Test Stubs (RED)

## What Was Done

Created 3 failing test files establishing the RED state for all i18n requirements:

1. `lib/__tests__/i18n-routing.test.ts` — static import verification (node env)
   - 6 tests asserting useRouter import source for portal/page.tsx, results/page.tsx, PortalHeader.tsx
2. `components/portal/__tests__/PortalHeader.i18n.test.tsx` — component render (jsdom env)
   - 5 tests asserting useTranslations wiring and absence of hardcoded English nav strings
3. `components/portal/__tests__/ErrorState.i18n.test.tsx` — component render + click (jsdom env)
   - 5 tests asserting no English tips and locale-aware navigation on suggestion clicks

Also updated `jest.config.js` to use `@swc/jest` with `runtime: 'automatic'` JSX transform (required for Next.js components that omit the React import).

## Key Fix

`jest.config.js` needed automatic JSX runtime configured — Next.js components use the new JSX transform (`_jsx(...)` not `React.createElement(...)`). Without this, component tests threw `ReferenceError: React is not defined`.

## Result

All 16 tests RAN and FAILED RED (assertion failures, not errors):
- i18n-routing: 6 FAIL
- PortalHeader.i18n: 5 FAIL
- ErrorState.i18n: 5 FAIL
