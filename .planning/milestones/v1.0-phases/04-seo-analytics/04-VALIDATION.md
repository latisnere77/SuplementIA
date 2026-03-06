---
phase: 4
slug: seo-analytics
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + @swc/jest |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `jest --testPathPattern="seo\|sitemap\|analytics"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `jest --testPathPattern="seo|sitemap|analytics"`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | SEO-01 | unit | `jest --testPathPattern="seo-meta"` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | SEO-02 | unit | `jest --testPathPattern="sitemap"` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 0 | SEO-03 | unit | `jest --testPathPattern="gsc\|analytics-events"` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | SEO-01 | unit | `jest --testPathPattern="seo-meta"` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | SEO-01 | unit | `jest --testPathPattern="seo-meta"` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 1 | SEO-01 | unit | `jest --testPathPattern="seo-meta"` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | SEO-02 | unit | `jest --testPathPattern="sitemap"` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 1 | SEO-02 | unit | `jest --testPathPattern="sitemap"` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 1 | SEO-03 | unit | `jest --testPathPattern="gsc"` | ❌ W0 | ⬜ pending |
| 4-04-02 | 04 | 1 | SEO-03 | unit | `jest --testPathPattern="analytics-events"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/sitemap.test.ts` — stubs for SEO-02 (sitemap URL count, locale coverage, domain prefix)
- [ ] `components/portal/__tests__/seo-meta.test.ts` — stubs for SEO-01 (unique title, locale-aware, OG tags, canonical URL)
- [ ] `lib/__tests__/analytics-events.test.ts` — stubs for SEO-03 (track() calls: search_submitted, supplement_view, result_click)
- [ ] `lib/__tests__/gsc.test.ts` — stub for SEO-03 GSC verification token in layout metadata

---

## Requirement Coverage

### SEO-01: Meta tags (unique, locale-aware, OG)
| Behavior | Test File | Assertion |
|----------|-----------|-----------|
| `generateMetadata` returns unique title for supplement query | `seo-meta.test.ts` | title contains supplement name |
| Locale-aware: ES vs EN | `seo-meta.test.ts` | Spanish title for `locale='es'`, English for `locale='en'` |
| Open Graph fields present | `seo-meta.test.ts` | `openGraph.title`, `openGraph.description`, `openGraph.url` defined |
| Canonical URL matches page locale | `seo-meta.test.ts` | `alternates.canonical` includes `/es/` or `/en/` |

### SEO-02: Sitemap (auto-generated, 306 supplement URLs)
| Behavior | Test File | Assertion |
|----------|-----------|-----------|
| Exactly 306 supplement URLs (153 × 2 locales) | `sitemap.test.ts` | `urls.filter(supplement).length === 306` |
| Both /es/ and /en/ variants for every slug | `sitemap.test.ts` | For each slug, both locale variants present |
| All URLs prefixed with production domain | `sitemap.test.ts` | Every URL starts with `https://suplementia.com/` |
| 2 index page URLs included | `sitemap.test.ts` | `/es/portal` and `/en/portal` in sitemap |

### SEO-03: GSC verification + Vercel Analytics events
| Behavior | Test File | Assertion |
|----------|-----------|-----------|
| GSC verification meta tag in layout | `gsc.test.ts` | `verification.google` non-empty in root layout metadata |
| `track('search_submitted')` fires on search | `analytics-events.test.ts` | track mock called with `'search_submitted'` + `{query, locale}` |
| `track('supplement_view')` fires on results mount | `analytics-events.test.ts` | track mock called with `'supplement_view'` + `{slug, locale}` |
| `track('result_click')` fires on card click | `analytics-events.test.ts` | track mock called with `'result_click'` + `{slug, locale}` |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/sitemap.xml` renders valid XML in browser | SEO-02 | Requires live Next.js response | Visit `/sitemap.xml`, confirm 300+ URL entries |
| Custom events appear in Vercel Analytics dashboard | SEO-03 | Requires production deployment + dashboard access | After deploy, check Vercel Analytics → Custom Events |
| GSC property verification completed | SEO-03 | Ops task — requires Google account + DNS/file access | GSC team verifies ownership using token from code |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
