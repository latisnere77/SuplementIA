---
phase: 1
slug: search-backend-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing) |
| **Config file** | `jest.config.ts` |
| **Quick run command** | `npx jest --testPathPattern="phase1" --no-coverage` |
| **Full suite command** | `npx jest --testPathPattern="phase1"` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="phase1" --no-coverage`
- **After every plan wave:** Run `npx jest --testPathPattern="phase1"`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SRCH-01 | unit | `npx jest supplement-resolver` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | SRCH-01 | unit | `npx jest supplement-resolver` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | SRCH-04, SRCH-05 | unit | `npx jest recommend-route` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | SRCH-02 | integration | `npx jest search-integration` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | SRCH-03 | unit | `npx jest lexicon-sync` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/phase1/supplement-resolver.test.ts` — stubs for SRCH-01, SRCH-02, SRCH-03
- [ ] `__tests__/phase1/recommend-route.test.ts` — stubs for SRCH-04, SRCH-05
- [ ] `__tests__/phase1/search-integration.test.ts` — integration test stubs

*Existing jest infrastructure covers framework needs. Only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search "manzanilla" on suplementai.com returns results (no 500) | SRCH-02 | Requires live production deployment | 1. Go to suplementai.com 2. Search "manzanilla" 3. Verify evidence panel loads |
| Locale stays /es/ during search | I18N-01 | Phase 2 scope, but regression check | 1. Navigate to /es/portal 2. Search supplement 3. Verify URL stays /es/ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
