---
phase: 2
slug: internationalization-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (jest.config.js — @swc/jest transform) |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `npx jest --testPathPattern="i18n" --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="i18n" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | I18N-01, I18N-02, I18N-03, I18N-04, I18N-05 | unit (stub) | `npx jest --testPathPattern="i18n" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | I18N-01, I18N-05 | unit (static import check) | `npx jest --testPathPattern="i18n-routing" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | I18N-02 | unit (component render) | `npx jest --testPathPattern="PortalHeader" --no-coverage` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 1 | I18N-03, I18N-04 | unit (component render + click) | `npx jest --testPathPattern="ErrorState.i18n" --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/i18n-routing.test.ts` — static import verification for I18N-01, I18N-05
- [ ] `components/portal/__tests__/PortalHeader.i18n.test.tsx` — covers I18N-02
- [ ] `components/portal/__tests__/ErrorState.i18n.test.tsx` — covers I18N-03, I18N-04

**Mocking pattern for all component tests:**

```typescript
// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'es',
}));

// Mock locale-aware router
const mockPush = jest.fn();
jest.mock('@/src/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browsing /es/portal and searching stays in /es/portal/results | I18N-01 | Full route integration — static import test verifies the fix but not runtime routing | Navigate to /es/portal, search for "melatonina", verify URL stays /es/portal/results?q=melatonina |
| Nav bar shows "Buscar" / "Planes" in browser at /es/ | I18N-02 | Requires next-intl provider + actual message loading | Load /es/portal, verify nav text in browser |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
