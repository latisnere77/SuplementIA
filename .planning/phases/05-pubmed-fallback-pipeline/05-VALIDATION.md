---
phase: 5
slug: pubmed-fallback-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | jest.config.ts |
| **Quick run command** | `npm test -- --testPathPattern="quiz/route"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="quiz/route"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | PUB-05 | unit | `npm test -- --testPathPattern="quiz/route" -t "catch block"` | ✅ | ⬜ pending |
| 5-01-02 | 01 | 1 | PUB-02 | unit | `npm test -- --testPathPattern="quiz/route" -t "translate"` | ✅ | ⬜ pending |
| 5-02-01 | 02 | 2 | PUB-01 | unit | `npm test -- --testPathPattern="pubmed-search"` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | PUB-03 | unit | `npm test -- --testPathPattern="quiz/route" -t "bedrock"` | ✅ | ⬜ pending |
| 5-03-01 | 03 | 3 | PUB-04 | unit | `npm test -- --testPathPattern="quiz/route" -t "noData"` | ✅ | ⬜ pending |
| 5-03-02 | 03 | 3 | E2E | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/services/__tests__/pubmed-search-supplement.test.ts` — unit tests for new `searchPubMedForSupplement` function (stub until function exists)

*Existing `app/api/portal/quiz/route.test.ts` covers most test files — Wave 0 only needs stub for the new pubmed function.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "tejocote" search returns full evidence panel in browser | PUB-01, PUB-03 | Live PubMed API call + Bedrock — cannot mock in unit | 1. Run dev server. 2. Search "tejocote". 3. Verify evidence panel renders (not 500, not blank). |
| Zero-result supplement shows friendly message in UI | PUB-04 | Requires PubMed API to return 0 results for obscure term | 1. Search "xyzunknownxyz". 2. Verify friendly "no encontramos datos científicos" message appears. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
