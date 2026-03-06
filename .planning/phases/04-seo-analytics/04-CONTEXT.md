# Phase 4: SEO & Analytics - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** User-provided context (inline)

<domain>
## Phase Boundary

Deliver SEO discoverability (meta tags, sitemap, GSC verification) and analytics event tracking for the existing Vercel Analytics installation. No new analytics providers, no custom dashboards, no ops work.

</domain>

<decisions>
## Implementation Decisions

### Analytics
- Vercel Analytics is already installed — do NOT add any new analytics providers (no GA4, no PostHog, no custom dashboard)
- Only add custom events: search queries submitted, supplement views (detail page), result clicks (supplement card clicks)
- Use the existing `@vercel/analytics` package's `track()` API for custom events

### Sitemap
- Auto-generate from SUPPLEMENTS_DATABASE (153 supplements per locale)
- Cover both `/es/` and `/en/` locales (306 supplement URLs total + locale index pages)
- Implement as `app/sitemap.ts` (Next.js native sitemap support)

### Meta Tags
- Locale-aware: Spanish content for `/es/` pages, English content for `/en/` pages
- Use locale-specific canonical URLs — no cross-locale canonical (no `hreflang` pointing /es/ canonical to /en/ or vice versa)
- Each supplement page gets unique meta title, description, and Open Graph tags derived from its data in SUPPLEMENTS_DATABASE
- Primary target file: `app/[locale]/portal/results/page.tsx`

### Google Search Console
- Code task only: add GSC verification meta tag or file to `<head>`
- Actual GSC property setup, DNS verification, and index submission are manual/ops tasks — OUT OF SCOPE for this phase
- No programmatic GSC API integration

### Claude's Discretion
- Exact format of meta title/description templates (within locale-aware constraint)
- Whether sitemap includes `lastModified` and `changeFrequency` fields
- Placement of analytics track() calls within existing component event handlers

</decisions>

<specifics>
## Specific References

- SUPPLEMENTS_DATABASE: 153 entries (source of truth for sitemap + meta tags)
- Vercel Analytics already installed — package present, basic pageview tracking active
- `app/[locale]/portal/results/page.tsx` — supplement detail page (meta tags target)
- `app/sitemap.ts` — new file to create
- Requirements: SEO-01, SEO-02, SEO-03

</specifics>

<deferred>
## Deferred Ideas

- Google Search Console property setup and index submission (manual ops, not code)
- Adding PostHog, GA4, or any additional analytics provider
- Custom analytics dashboard UI components
- Cross-locale hreflang canonicalization strategy beyond locale-specific URLs
- LanceDB discrepancy (156 vs 153 supplements) — tracked as existing debt, not addressed here

</deferred>

---

*Phase: 04-seo-analytics*
*Context gathered: 2026-03-06 via inline user session*
