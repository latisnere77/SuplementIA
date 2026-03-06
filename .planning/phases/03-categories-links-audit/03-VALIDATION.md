---
phase: 3
slug: categories-links-audit
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + `@swc/jest` transform |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage` |
| **Full suite command** | `npx jest --testPathPattern="(lib/__tests__|components/portal/__tests__)" --no-coverage` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage`
- **After every plan wave:** Run `npx jest lib/__tests__/categories-links-audit.test.ts lib/__tests__/i18n-routing.test.ts --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | CAT-01, CAT-02, LINK-01, LINK-02 | unit | `npx jest lib/__tests__/categories-links-audit.test.ts --no-coverage` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | CAT-01 | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "CAT-01" --no-coverage` | ✅ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | LINK-01, LINK-02 | unit | `npx jest lib/__tests__/categories-links-audit.test.ts -t "LINK-0" --no-coverage` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/categories-links-audit.test.ts` — stubs for CAT-01, CAT-02, LINK-01, LINK-02 (all four requirements in one file, consistent with Phase 2 pattern)

*No new framework installation required. `@swc/jest` already installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supplement detail page back-link navigates to `/portal` when `benefit` param is absent | LINK-02 | Client-side runtime behavior not exercised by static assertion | Open `/portal/supplement/melatonin` directly (no `?benefit=`), verify back-link goes to `/portal` |
| Category card clicks preserve locale in `GuidesCategories.tsx` | LINK-01 | Locale routing requires a running browser | Open `/es/portal`, click a category card, verify URL stays on `/es/` locale |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
