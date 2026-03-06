# Phase 2: Internationalization Fix - Research

**Researched:** 2026-03-06
**Domain:** next-intl routing, React component localization, Next.js App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Fix `useRouter` import in `app/[locale]/portal/page.tsx` and `app/[locale]/portal/results/page.tsx`
- Use existing `src/i18n/navigation.ts` (locale-aware router) — do NOT switch to a different routing library
- Add translations to `PortalHeader` component
- Update `messages/es.json` and `messages/en.json` for nav items
- Nav wording: "Iniciar sesión" / "Cerrar sesión"
- Remove the 2 English-only search tips from ErrorState
- Fix the 4 `window.location.href` hardcoded links in ErrorState to use locale-aware navigation
- Do NOT refactor ErrorState beyond these two targeted changes

### Claude's Discretion

- None stated — all decisions are locked

### Deferred Ideas (OUT OF SCOPE)

- Full audit of all strings in results page — deferred, out of scope for this phase
- `EvidenceAnalysisPanelNew` i18n — deferred to future phase
- Bedrock Spanish output — explicit non-goal, not a future phase item
- `EvidenceAnalysisPanelNew` is OUT OF SCOPE — do not touch
- Bedrock output language is OUT OF SCOPE — do not add language prompting or output translation
- Full results page string audit is OUT OF SCOPE — only fix the 1 identified `router.push` call
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| I18N-01 | Locale stays consistent during search (/es/ does not switch to /en/) | `useRouter` from `next/navigation` strips locale prefix; `useRouter` from `src/i18n/navigation.ts` preserves it. Fix in portal/page.tsx and results/page.tsx. |
| I18N-02 | Nav items localized ("Search" -> "Buscar", "Plans" -> "Planes" in ES) | PortalHeader uses hardcoded English strings "Search" and "Plans". Must add `useTranslations` + new keys in both message files. |
| I18N-03 | Fallback suggestions localized per locale (not hardcoded English) | ErrorState suggestion buttons use `window.location.href = '/portal/results?q=...'` (locale-stripped). Must use locale-aware navigation. |
| I18N-04 | Search tips remove "usa terminos en ingles" advice | ErrorState lines 197 and 276 contain English-language-specific tips. Remove exactly these 2 items from both error type renderings. |
| I18N-05 | All search results render in user's selected locale | results/page.tsx imports `useRouter` from `next/navigation` causing redirect to /en/. Fix the single `router.push('/portal')` at line 1438. |
</phase_requirements>

---

## Summary

Phase 2 is a targeted i18n fix across 5-6 files. The root cause of the locale-switching bug (I18N-01, I18N-05) is that both portal pages import `useRouter` from `next/navigation` instead of the project's locale-aware wrapper at `src/i18n/navigation.ts`. When `router.push('/portal/results?q=...')` is called with a bare path, Next.js resolves it without the current locale prefix, causing a redirect to `/en/`.

The nav translation gap (I18N-02) is straightforward: `PortalHeader` renders hardcoded English strings "Search", "Plans", "Sign In", "Sign Out". The component does not use `useTranslations` at all. Both `messages/es.json` and `messages/en.json` lack a `nav` key. Adding it and wiring `useTranslations` into PortalHeader completes the fix.

The ErrorState issues (I18N-03, I18N-04) are also surgical. There are exactly 4 `window.location.href` assignments that navigate to `/portal/results?q=...` and `/portal` without a locale prefix. These must be replaced with a locale-aware `useRouter` push. Separately, 2 search tip list items explicitly advise English-language searches ("Prueba con términos en inglés" at line 197; "Usa términos en inglés si es posible" at line 276). These 2 items must be deleted.

**Primary recommendation:** Replace all `useRouter` from `next/navigation` with `useRouter` from `src/i18n/navigation.ts` in the three affected client components. Remove 2 English-tip `<li>` items from ErrorState. Replace 4 `window.location.href` calls with locale-aware router pushes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | Already installed | i18n routing + message translation | Project's existing i18n solution |
| `src/i18n/navigation.ts` | Project file | Locale-aware `useRouter`, `Link`, `redirect` | Wraps next-intl's `createNavigation` — already configured for this project |
| `src/i18n/routing.ts` | Project file | `locales` array (`['en', 'es']`) | Single source of truth for locale config |
| `useTranslations` (next-intl) | Already installed | Component-level message lookup | Already used in portal/page.tsx |

### How `src/i18n/navigation.ts` Works

```typescript
// src/i18n/navigation.ts (existing file — do not modify)
import { createNavigation } from 'next-intl/navigation';
import { locales } from './routing';

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales });
```

The `useRouter` returned by `createNavigation` automatically prepends the current locale to all push paths. When a user on `/es/portal` calls `router.push('/portal/results?q=melatonina')`, next-intl produces `/es/portal/results?q=melatonina`.

The buggy import `useRouter` from `next/navigation` does NOT do this — it produces `/portal/results?q=melatonina`, causing middleware to route it to `/en/portal/results?q=melatonina` (the default locale).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useLocale` (next-intl) | Already installed | Get current locale string in client component | When locale-conditional rendering is needed |
| `useTranslations` (next-intl) | Already installed | Access message keys from messages/*.json | Any component needing localized strings |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `src/i18n/navigation.ts` useRouter | next/navigation useRouter | next/navigation strips locale — causes the bug we are fixing |
| `window.location.href` | locale-aware router.push | window.location.href loses locale prefix — same bug class |

---

## Architecture Patterns

### Recommended Project Structure (no changes)

The project already has the correct structure. This phase modifies existing files only.

```
src/i18n/
├── navigation.ts      # Exports locale-aware useRouter, Link, redirect
├── routing.ts         # locales = ['en', 'es']
├── request.ts         # Server-side locale request helper
└── ...

messages/
├── en.json            # English message keys (add nav.* keys)
└── es.json            # Spanish message keys (add nav.* keys)

app/[locale]/portal/
├── page.tsx           # Fix: useRouter import source
└── results/page.tsx   # Fix: useRouter import source + 1 router.push

components/portal/
├── PortalHeader.tsx   # Fix: add useTranslations + nav.* keys
└── ErrorState.tsx     # Fix: remove 2 tips + replace 4 window.location.href
```

### Pattern 1: Locale-Aware Router Import

**What:** Swap the import source from `next/navigation` to `src/i18n/navigation.ts`.
**When to use:** Any client component that calls `router.push()` and must stay in the current locale.

```typescript
// BEFORE (broken — strips locale)
import { useRouter } from 'next/navigation';

// AFTER (correct — preserves locale)
import { useRouter } from '@/src/i18n/navigation';
// or using the path alias the project uses:
import { useRouter } from '@/src/i18n/navigation';
```

Note: `@/` maps to the project root per `jest.config.js` `moduleNameMapper`. The correct import path is `@/src/i18n/navigation` (the `src/` prefix is needed because the file lives at `src/i18n/navigation.ts`).

### Pattern 2: useTranslations in a Client Component

**What:** Call `useTranslations()` (or `useTranslations('nav')`) inside the component. The key structure must match the message file.

```typescript
// In component:
import { useTranslations } from 'next-intl';
const t = useTranslations('nav');

// In JSX:
<button>{t('search')}</button>  // renders "Search" (en) or "Buscar" (es)
<button>{t('plans')}</button>   // renders "Plans" (en) or "Planes" (es)
```

```json
// messages/en.json — add under root:
"nav": {
  "search": "Search",
  "plans": "Plans",
  "sign_in": "Sign In",
  "sign_out": "Sign Out"
}

// messages/es.json — add under root:
"nav": {
  "search": "Buscar",
  "plans": "Planes",
  "sign_in": "Iniciar sesión",
  "sign_out": "Cerrar sesión"
}
```

### Pattern 3: Replace window.location.href with locale-aware push

**What:** ErrorState cannot use `useRouter` as a hook (it is rendered inside portal/results/page.tsx which already has a locale-aware router). ErrorState must accept a navigation callback as a prop, OR import `useRouter` from `src/i18n/navigation.ts` directly inside ErrorState.

**Current ErrorState signature:**
```typescript
interface ErrorStateProps {
  error: string | { type: ErrorType; message: string; ... };
  supplementName: string;
  onRetry: () => void;
  suggestions?: string[];
}
```

**Approach A (minimal scope — add onNavigate prop):** Add `onNavigate: (path: string) => void` to ErrorStateProps. The caller (results/page.tsx) passes `(path) => router.push(path)` where router is locale-aware. Replace all 4 `window.location.href = ...` with `onNavigate(...)`.

**Approach B (self-contained fix):** ErrorState imports `useRouter` from `src/i18n/navigation.ts` internally. Simpler — no prop change needed.

Approach B is simpler (fewer files changed), but either is valid. The CONTEXT.md says "do NOT refactor ErrorState beyond these two targeted changes" — both approaches are surgical. Approach B is preferred as it requires no caller changes.

```typescript
// In ErrorState.tsx (Approach B):
import { useRouter } from '@/src/i18n/navigation';

export function ErrorState(...) {
  const router = useRouter();
  // ...
  // Replace: window.location.href = `/portal/results?q=${...}`
  // With:    router.push(`/portal/results?q=${...}`)
  //
  // Replace: window.location.href = '/portal'
  // With:    router.push('/portal')
}
```

### Anti-Patterns to Avoid

- **Using `window.location.href` for in-app navigation:** Causes full page reload AND loses locale prefix. Use `router.push()` from locale-aware router.
- **Using `useRouter` from `next/navigation` in locale-prefixed routes:** Strips locale on push. This is the root cause of the I18N-01 bug.
- **Hardcoding locale in push paths:** `router.push('/es/portal/results?q=...')` is fragile. Let next-intl prepend locale automatically via `router.push('/portal/results?q=...')`.
- **Using `useLocale()` for nav text selection:** Nav text should come from `useTranslations`, not conditional language strings. The `portal/page.tsx` has multiple `language === 'es' ? '...' : '...'` patterns — do NOT expand these; they are out of scope for this phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale-preserving navigation | Custom locale-prepend logic | `useRouter` from `src/i18n/navigation.ts` | Already implemented via next-intl's createNavigation |
| Message lookup by locale | Custom translation object switch | `useTranslations` from next-intl | Handles locale detection, fallbacks, and type safety |
| Locale detection | Manual `window.location.pathname` parsing | `useLocale()` from next-intl | Reactive to locale changes |

---

## Common Pitfalls

### Pitfall 1: Wrong `useRouter` import persisting in the same file

**What goes wrong:** The file has `import { useRouter } from 'next/navigation'` at the top. After fix, if any other import from `next/navigation` is kept, editors may auto-reimport the wrong `useRouter`.
**Why it happens:** `portal/page.tsx` also imports `useSearchParams` from `next/navigation`. The `useRouter` import is on the same line or nearby.
**How to avoid:** Confirm `useRouter` is removed from the `next/navigation` import and added from `@/src/i18n/navigation`. Other imports from `next/navigation` are fine.
**Warning signs:** TypeScript error "router.push does not preserve locale" is not detectable at compile time — test behavior at runtime.

### Pitfall 2: Message key namespace mismatch

**What goes wrong:** Component calls `useTranslations('nav')` but message file has the keys at the root level or under a different namespace.
**Why it happens:** `useTranslations('nav')` scopes to `{ "nav": { ... } }`. `useTranslations()` scopes to the full file root.
**How to avoid:** Match the namespace argument exactly to the JSON structure. Use `useTranslations('nav')` and add `"nav": { ... }` to both message files.
**Warning signs:** Keys render as their raw key string (e.g., "nav.search" appears literally on screen).

### Pitfall 3: ErrorState `useRouter` — "hooks cannot be called conditionally"

**What goes wrong:** ErrorState currently has no hook calls. Adding `useRouter` at the top of the function is safe. But if `useRouter` is called inside an `if` block or callback, React will throw.
**Why it happens:** React hooks rules — must be called unconditionally at the top of the component.
**How to avoid:** Place `const router = useRouter()` at the top of the `ErrorState` function, before any conditional returns.

### Pitfall 4: `window.location.href` in 2 separate render branches

**What goes wrong:** ErrorState has two render paths: `insufficient_scientific_data` (yellow card, lines ~60-206) and `generic/system/network` (red card, lines ~210-284). Each has its own `window.location.href` calls. Both must be fixed.
**How to avoid:** Grep for `window.location.href` in ErrorState — there are 4 occurrences across the 2 render branches. Fix all 4.

### Pitfall 5: PortalHeader also has router.push calls from `next/navigation`

**What goes wrong:** PortalHeader imports `useRouter` from `next/navigation` (line 9). Its `router.push('/portal')` and `router.push('/portal/subscription')` calls will strip locale.
**Why it matters:** The CONTEXT.md scope specifically targets nav translations (I18N-02) in PortalHeader. When fixing the nav translation, also fix the router import in the same file — it is the same pattern as portal/page.tsx.
**Warning signs:** Clicking the logo or "Search" nav button from `/es/portal` redirects to `/en/portal`.

---

## Code Examples

### Exact `useRouter` import change (3 files)

```typescript
// portal/page.tsx — before (line 9)
import { useRouter } from 'next/navigation';

// portal/page.tsx — after
import { useRouter } from '@/src/i18n/navigation';
```

```typescript
// portal/results/page.tsx — before (line 14)
import { useSearchParams, useRouter } from 'next/navigation';

// portal/results/page.tsx — after
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
```

```typescript
// PortalHeader.tsx — before (line 9)
import { useRouter } from 'next/navigation';

// PortalHeader.tsx — after
import { useRouter } from '@/src/i18n/navigation';
```

### ErrorState — 2 tips to remove

In the `insufficient_scientific_data` branch (around line 196-200):
```tsx
// REMOVE this exact <li>:
<li>• <strong>Prueba con términos en inglés</strong> - la mayoría de estudios están en inglés</li>
```

In the generic/system/network branch (around line 276):
```tsx
// REMOVE this exact <li>:
<li>• Usa términos en inglés si es posible</li>
```

### ErrorState — 4 `window.location.href` replacements

```typescript
// BEFORE (4 occurrences):
window.location.href = `/portal/results?q=${encodeURIComponent(suggestion.name)}`;
// ... and:
window.location.href = '/portal'

// AFTER — with router from src/i18n/navigation.ts:
router.push(`/portal/results?q=${encodeURIComponent(suggestion.name)}`);
// ... and:
router.push('/portal')
```

### messages/en.json and messages/es.json — new nav keys

```json
// messages/en.json (add at root level):
"nav": {
  "search": "Search",
  "plans": "Plans",
  "sign_in": "Sign In",
  "sign_out": "Sign Out",
  "subscription": "Subscription"
}

// messages/es.json (add at root level):
"nav": {
  "search": "Buscar",
  "plans": "Planes",
  "sign_in": "Iniciar sesión",
  "sign_out": "Cerrar sesión",
  "subscription": "Suscripción"
}
```

### PortalHeader — add useTranslations

```typescript
// Add import:
import { useTranslations } from 'next-intl';

// Inside component function (add after existing hooks):
const t = useTranslations('nav');

// Replace hardcoded strings:
// "Search"       -> t('search')
// "Plans"        -> t('plans')
// "Sign In"      -> t('sign_in')
// "Sign Out"     -> t('sign_out')
// "Subscription" -> t('subscription')
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/navigation` useRouter in all components | next-intl `createNavigation` useRouter for locale-aware navigation | next-intl v3+ | Preserves locale on all router.push calls automatically |
| `window.location.href` for navigation | `router.push()` from next-intl navigation | Next.js App Router era | No page reload + locale preservation |

**Deprecated/outdated:**
- `window.location.href` for SPA navigation: works but causes full page reload and loses locale prefix in next-intl routing

---

## Open Questions

1. **`supplement` query parameter in results URL**
   - What we know: portal/page.tsx calls `router.push('/portal/results?q=X&supplement=X')` — two params with same value
   - What's unclear: Whether `supplement` is needed or redundant; results/page.tsx reads `useSearchParams().get('q')`
   - Recommendation: Leave both params as-is; only fix the locale — do not change URL structure in this phase

2. **PortalHeader router.push calls for non-results routes**
   - What we know: PortalHeader has `router.push('/portal')` and `router.push('/portal/subscription')` — currently from wrong router
   - What's unclear: Whether these should also be fixed as part of I18N-02 (nav translations task)
   - Recommendation: Yes — fix the router import in PortalHeader as part of the nav translation task; it's the same file, same change pattern

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (configured in `jest.config.js`) |
| Config file | `jest.config.js` (project root) |
| Transform | `@swc/jest` for TypeScript |
| Quick run command | `npx jest --testPathPattern="i18n" --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

Note: The jest environment is `node`. Component tests that use `render` from `@testing-library/react` require `testEnvironment: 'jsdom'` — existing component tests (e.g., `ErrorMessage.test.tsx`) use testing-library. New tests for this phase may need `@jest-environment jsdom` docblock comment or a separate jest config override.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | `router.push` in portal/page.tsx produces locale-prefixed URL | unit (pure function extraction) | `npx jest --testPathPattern="i18n-routing" --no-coverage` | ❌ Wave 0 |
| I18N-02 | PortalHeader renders "Buscar"/"Planes" when locale=es | unit (component render) | `npx jest --testPathPattern="PortalHeader" --no-coverage` | ❌ Wave 0 |
| I18N-03 | ErrorState suggestion buttons use locale-prefixed href | unit (component render + click) | `npx jest --testPathPattern="ErrorState.i18n" --no-coverage` | ❌ Wave 0 |
| I18N-04 | ErrorState search tips do NOT contain English-language advice | unit (component render, text assertion) | `npx jest --testPathPattern="ErrorState.i18n" --no-coverage` | ❌ Wave 0 |
| I18N-05 | results/page.tsx back-button router.push produces locale-prefixed URL | unit (import verification) | `npx jest --testPathPattern="i18n-routing" --no-coverage` | ❌ Wave 0 |

### Test Scenarios by Success Criterion

**I18N-01 / I18N-05: Routing stays in locale**

Since `useRouter` from next-intl is a React hook, it cannot be unit-tested in isolation without a provider. The practical verification strategy:

- Test 1 (static analysis): Assert that `portal/page.tsx`, `portal/results/page.tsx`, and `PortalHeader.tsx` do NOT import `useRouter` from `'next/navigation'`. This can be checked with a simple file-read test.
- Test 2 (static analysis): Assert that these files DO import `useRouter` from a path containing `i18n/navigation`.

```typescript
// File: lib/__tests__/i18n-routing.test.ts
import * as fs from 'fs';
it('portal/page.tsx does not import useRouter from next/navigation', () => {
  const content = fs.readFileSync('app/[locale]/portal/page.tsx', 'utf-8');
  expect(content).not.toMatch(/useRouter.*from ['"]next\/navigation['"]/);
  expect(content).toMatch(/useRouter.*from ['"]@\/src\/i18n\/navigation['"]/);
});
```

**I18N-02: Nav translation**

```typescript
// File: components/portal/__tests__/PortalHeader.i18n.test.tsx
// Requires jsdom environment + mock for next-intl providers
// Tests:
// - Renders "Buscar" when locale=es (mock useTranslations to return es values)
// - Renders "Search" when locale=en (mock useTranslations to return en values)
// - Renders "Planes" when locale=es
// - Renders "Plans" when locale=en
```

**I18N-03: ErrorState suggestion navigation**

```typescript
// File: components/portal/__tests__/ErrorState.i18n.test.tsx
// Tests:
// - Clicking suggestion button calls router.push (not window.location.href)
// - router.push argument does NOT contain '/en/' or '/es/' hardcoded
// - router.push is called with '/portal/results?q=...' (locale prepended by next-intl at runtime)
// Mock: useRouter from @/src/i18n/navigation returns a jest.fn()
```

**I18N-04: English tips removed**

```typescript
// File: components/portal/__tests__/ErrorState.i18n.test.tsx
// Tests:
// - Renders insufficient_scientific_data error: does NOT contain "términos en inglés"
// - Renders system_error: does NOT contain "términos en inglés"
// - Renders network_error: does NOT contain "términos en inglés"
// These are pure render assertions — no mocking needed beyond error prop
```

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern="i18n" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/i18n-routing.test.ts` — static import verification for I18N-01, I18N-05
- [ ] `components/portal/__tests__/PortalHeader.i18n.test.tsx` — covers I18N-02
- [ ] `components/portal/__tests__/ErrorState.i18n.test.tsx` — covers I18N-03, I18N-04

Note: Next-intl providers (`NextIntlClientProvider`) must be mocked in component tests. The simplest approach is to mock `useTranslations` and `useLocale` directly:

```typescript
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'es',
}));
```

And mock `@/src/i18n/navigation`:

```typescript
const mockPush = jest.fn();
jest.mock('@/src/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection of `src/i18n/navigation.ts` — confirmed `createNavigation` from `next-intl/navigation`
- Direct file inspection of `app/[locale]/portal/page.tsx` — confirmed `useRouter` from `next/navigation` (line 9), `router.push` bare paths (lines 188, 192, 197)
- Direct file inspection of `app/[locale]/portal/results/page.tsx` — confirmed `useRouter` from `next/navigation` (line 14), `router.push('/portal')` at line 1438
- Direct file inspection of `components/portal/PortalHeader.tsx` — confirmed `useRouter` from `next/navigation` (line 9), all nav text hardcoded English
- Direct file inspection of `components/portal/ErrorState.tsx` — confirmed 4 `window.location.href` occurrences (lines 145, 170, 239, 261) and 2 English-tip `<li>` items (lines 197, 276)
- Direct file inspection of `messages/en.json` and `messages/es.json` — confirmed no `nav` key exists in either file

### Secondary (MEDIUM confidence)

- next-intl `createNavigation` documentation pattern — locale preservation behavior verified by reading project's own `src/i18n/navigation.ts` implementation
- Jest `@swc/jest` transform — confirmed in `jest.config.js`

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; research is based on reading actual project files
- Architecture: HIGH — changes are surgical, based on direct file inspection of all 5-6 target files
- Pitfalls: HIGH — all pitfalls identified by reading actual code, not by inference

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable — no external dependencies changing)
