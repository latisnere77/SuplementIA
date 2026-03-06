---
phase: 02-internationalization-fix
plan: 03
status: complete
duration: ~3min
---

# Plan 02-03 Summary: ErrorState Fix

## What Was Done

4 surgical modifications to `components/portal/ErrorState.tsx`:

1. **Added import**: `import { useRouter } from '@/src/i18n/navigation';`
2. **Added hook**: `const router = useRouter();` as first statement in component body
3. **Replaced 4 window.location.href assignments**:
   - Line 145 (insufficient_data suggestions): `window.location.href = /portal/results?q=...` → `router.push(...)`
   - Line 170 (insufficient_data back button): `window.location.href = '/portal'` → `router.push('/portal')`
   - Line 239/241 (generic/system suggestions): same pattern → `router.push(...)`
   - Line 261/263 (generic/system back button): `window.location.href = '/portal'` → `router.push('/portal')`
4. **Deleted 2 English-language search tip `<li>` elements**:
   - insufficient_scientific_data branch: `"Prueba con términos en inglés - la mayoría de estudios están en inglés"`
   - generic/system/network branch: `"Usa términos en inglés si es posible"`

## Verification

- `grep -c "window.location.href" components/portal/ErrorState.tsx` → 0 ✓
- `grep -c "términos en inglés" components/portal/ErrorState.tsx` → 0 ✓
- `npx jest --testPathPatterns="ErrorState.i18n"` → 5/5 GREEN ✓
- Full i18n suite: 16/16 GREEN ✓
- No new test failures introduced (pre-existing failures confirmed pre-dated Phase 2)
