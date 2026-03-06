---
phase: 02-internationalization-fix
plan: 02
status: complete
duration: ~5min
---

# Plan 02-02 Summary: useRouter Imports + PortalHeader Translations

## What Was Done

### Task 1: Fixed useRouter imports in portal/page.tsx and results/page.tsx
- `app/[locale]/portal/page.tsx`: replaced `useRouter` from `next/navigation` → `@/src/i18n/navigation`
- `app/[locale]/portal/results/page.tsx`: split combined import, kept `useSearchParams` from `next/navigation`, added `useRouter` from `@/src/i18n/navigation`

### Task 2: Fixed PortalHeader router import + wired useTranslations + added message keys
- `components/portal/PortalHeader.tsx`: replaced `useRouter` from `next/navigation` → `@/src/i18n/navigation`; added `useTranslations` from `next-intl`; added `const t = useTranslations('nav')` in component body; replaced all 10 hardcoded nav strings ("Search", "Plans", "Sign In", "Sign Out", "Subscription" × 2 locations each) with `t('key')` calls
- `messages/en.json`: added `"nav"` key at root with search/plans/sign_in/sign_out/subscription
- `messages/es.json`: added `"nav"` key at root with Buscar/Planes/Iniciar sesión/Cerrar sesión/Suscripción

## Result

- `npx jest --testPathPatterns="i18n-routing"` → 6/6 GREEN
- `npx jest --testPathPatterns="PortalHeader.i18n"` → 5/5 GREEN
- Both JSON files valid
