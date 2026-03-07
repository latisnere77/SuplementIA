---
phase: 5
slug: pubmed-fallback-pipeline
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
closed: 2026-03-06
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | jest.config.ts |
| **Quick run command** | `npx jest --testPathPatterns="quiz/route"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPatterns="quiz/route"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | PUB-05 | unit | `npx jest --testPathPatterns="quiz/route" -t "catch block"` | ✅ | ✅ green |
| 5-01-02 | 01 | 1 | PUB-02 | unit | `npx jest --testPathPatterns="quiz/route" -t "translate"` | ✅ | ✅ green |
| 5-02-01 | 02 | 2 | PUB-01 | unit | `npx jest --testPathPatterns="pubmed-search-supplement"` | ✅ | ✅ green |
| 5-02-02 | 02 | 2 | PUB-03 | unit | `npx jest --testPathPatterns="quiz/route" -t "bedrock"` | ✅ | ✅ green |
| 5-03-01 | 03 | 3 | PUB-04 | unit | `npx jest --testPathPatterns="quiz/route" -t "noData"` | ✅ | ✅ green |
| 5-03-02 | 03 | 3 | E2E | manual | N/A | N/A | manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/services/__tests__/pubmed-search-supplement.test.ts` — unit tests for new `searchPubMedForSupplement` function (7 tests, all passing)

*Wave 0 satisfied: file created during Phase 5 execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "tejocote" search returns full evidence panel in browser | PUB-01, PUB-03 | Live PubMed API call + Bedrock — cannot mock in unit | 1. Run dev server. 2. Search "tejocote". 3. Verify evidence panel renders (not 500, not blank). |
| Zero-result supplement shows friendly message in UI | PUB-04 | Requires PubMed API to return 0 results for obscure term | 1. Search "xyzunknownxyz". 2. Verify friendly "no encontramos datos científicos" message appears. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** compliant

---

## Validation Audit 2026-03-06

| Metric | Count |
|--------|-------|
| Gaps found | 1 (5-02-01 Wave 0 file marked missing) |
| Resolved | 1 (file existed — created during execution, not reflected in draft) |
| Escalated | 0 |
| Manual-only | 2 (live E2E — cannot automate) |

*Audit: retroactive closure via `/gsd:validate-phase 5`. All 12 tests (7 unit + 5 route) confirmed green.*
