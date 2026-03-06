# Phase 4: SEO & Analytics - Research

**Researched:** 2026-03-06
**Domain:** Next.js 14 metadata API, sitemap generation, Vercel Analytics custom events
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Analytics: Vercel Analytics already installed — do NOT add any new analytics providers (no GA4, no PostHog, no custom dashboard)
- Only add custom events: search queries submitted, supplement views (detail page), result clicks (supplement card clicks)
- Use the existing `@vercel/analytics` package's `track()` API for custom events
- Sitemap: auto-generate from SUPPLEMENTS_DATABASE (153 supplements per locale), cover both `/es/` and `/en/` locales (306 supplement URLs total + locale index pages), implement as `app/sitemap.ts`
- Meta tags: locale-aware (Spanish for `/es/`, English for `/en/`), locale-specific canonical URLs (no cross-locale canonical/hreflang), each supplement page gets unique meta title, description, and Open Graph tags from SUPPLEMENTS_DATABASE
- Primary target file for meta tags: `app/[locale]/portal/results/page.tsx`
- GSC: code task only — add GSC verification meta tag or file to `<head>`, no programmatic GSC API integration

### Claude's Discretion
- Exact format of meta title/description templates (within locale-aware constraint)
- Whether sitemap includes `lastModified` and `changeFrequency` fields
- Placement of analytics track() calls within existing component event handlers

### Deferred Ideas (OUT OF SCOPE)
- Google Search Console property setup and index submission (manual ops, not code)
- Adding PostHog, GA4, or any additional analytics provider
- Custom analytics dashboard UI components
- Cross-locale hreflang canonicalization strategy beyond locale-specific URLs
- LanceDB discrepancy (156 vs 153 supplements) — tracked as existing debt, not addressed here
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEO-01 | Meta tags, Open Graph, and structured data for supplement pages | Next.js 14 `generateMetadata` on server wrapper pattern; `app/[locale]/portal/results/page.tsx` is 'use client' so needs server wrapper |
| SEO-02 | Sitemap.xml generated from SUPPLEMENTS_DATABASE | Next.js 14 native `app/sitemap.ts` with `MetadataRoute.Sitemap`; 153 entries × 2 locales = 306 URLs + index pages |
| SEO-03 | Visitor tracking implemented | `@vercel/analytics` v1.6.1 `track()` already in package; 3 custom events: search_submitted, supplement_view, result_click |
</phase_requirements>

---

## Summary

Phase 4 adds SEO discoverability and analytics event tracking to an existing Next.js 14 / next-intl application. The project already has `@vercel/analytics@1.6.1` installed and the `<Analytics />` component mounted in `app/[locale]/layout.tsx`, so pageview tracking is live. Phase 4 extends this with three custom `track()` calls and adds sitemap + meta tag infrastructure.

The dominant technical constraint is that both target pages (`app/[locale]/portal/results/page.tsx` and `app/[locale]/portal/supplement/[slug]/page.tsx`) are `'use client'` components. Next.js 14 does not permit `generateMetadata` exports from client components. The standard solution is a server component wrapper: keep the client component as-is, extract it to a separate file if needed, and create a thin server component page that exports `generateMetadata` and renders the client component as a child. This pattern avoids rewriting the large client components.

The sitemap requires generating 306 supplement-specific URLs (153 SUPPLEMENTS_DATABASE entries × 2 locales) plus locale index pages. The database already has `language` field (`'es'` | `'en'`) so supplement slugs can be derived directly from entry IDs by stripping the `-es`/`-en` suffix. Since `SUPPLEMENTS_DATABASE` is a static TypeScript array, the sitemap function simply imports and maps it — no async data fetching needed.

**Primary recommendation:** Use Next.js 14 server wrapper pattern for `generateMetadata`, `app/sitemap.ts` for static sitemap generation, and place `track()` calls in existing event handlers in portal client components — no new infrastructure required.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | ^14.2.35 (installed) | `generateMetadata`, sitemap API, metadata types | Native App Router support, no extra package |
| `next-intl` | ^4.6.0 (installed) | Locale-aware URLs for canonical tags | Already in use throughout project |
| `@vercel/analytics` | 1.6.1 (installed) | `track()` custom events | Already installed, `<Analytics />` mounted |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/dist/server/app-render/work-unit-async-storage.external` | — | — | Not needed — all metadata is static/derived |

No new packages need to be installed for this phase.

**Installation:**
```bash
# Nothing to install — all packages already present
```

---

## Architecture Patterns

### Next.js 14 Server Wrapper for `generateMetadata` on Client Pages

**What:** When a page is `'use client'`, it cannot export `generateMetadata`. Create a thin server component page that:
1. Exports `generateMetadata` with the locale/params-aware metadata
2. Renders the existing client component as its child

**When to use:** Any time a client-component page needs dynamic per-page meta tags.

**Pattern — for results page:**
```typescript
// app/[locale]/portal/results/page.tsx (convert to server component wrapper)
// Source: Next.js 14 App Router docs — metadata API
import type { Metadata } from 'next';
import ResultsClient from './ResultsClient'; // extracted client component

type Props = {
  params: { locale: string };
  searchParams: { q?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const supplement = searchParams.q ?? '';
  const isEs = params.locale === 'es';
  const title = isEs
    ? `${supplement} — Evidencia Científica | SuplementIA`
    : `${supplement} — Scientific Evidence | SuplementIA`;
  const description = isEs
    ? `Descubre qué dice la ciencia sobre ${supplement}: efectos, dosis y calidad de evidencia.`
    : `Discover what science says about ${supplement}: effects, dosage, and evidence quality.`;
  const canonicalUrl = `https://suplementia.com/${params.locale}/portal/results?q=${encodeURIComponent(supplement)}`;
  return {
    title,
    description,
    openGraph: { title, description, url: canonicalUrl, locale: params.locale },
    alternates: { canonical: canonicalUrl },
  };
}

export default function ResultsPage(props: Props) {
  return <ResultsClient {...props} />;
}
```

**Critical detail:** The existing `app/[locale]/portal/results/page.tsx` is 887KB of client-only code. The safest approach is to rename the existing file to `ResultsClient.tsx`, add `'use client'` at the top (it already has it), and create a new thin `page.tsx` server wrapper. This avoids touching the client logic.

**Same pattern applies to** `app/[locale]/portal/supplement/[slug]/page.tsx` (also `'use client'`).

### Next.js 14 Native Sitemap

**What:** Export a default function from `app/sitemap.ts` returning `MetadataRoute.Sitemap`.

**When to use:** Static or semi-static content; no database call needed when source is an in-memory TypeScript array.

```typescript
// app/sitemap.ts
// Source: Next.js 14 App Router — sitemap.ts docs
import { MetadataRoute } from 'next';
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';

const BASE_URL = 'https://suplementia.com';
const LOCALES = ['es', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // Derive unique base slugs from database IDs (strip -es/-en suffix)
  const slugs = [...new Set(
    SUPPLEMENTS_DATABASE.map(e => e.id.replace(/-(?:es|en)$/, ''))
  )];

  const supplementUrls = LOCALES.flatMap(locale =>
    slugs.map(slug => ({
      url: `${BASE_URL}/${locale}/portal/results?q=${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  const indexUrls = LOCALES.map(locale => ({
    url: `${BASE_URL}/${locale}/portal`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 1.0,
  }));

  return [...indexUrls, ...supplementUrls];
}
```

**Output:** 2 index pages + 306 supplement URLs = 308 total entries.

**Note on URL structure:** The supplement detail page uses `?q=` query param (results page) OR `/portal/supplement/[slug]` (slug route). CONTEXT says target is `results/page.tsx`, so canonical URLs use the `?q=` form. However, if the supplement slug pages (`/portal/supplement/[slug]`) are the richer SEO target (they have unique evidence data per supplement), the sitemap should also include those. The planner should decide — both URL patterns exist in the codebase.

### Vercel Analytics Custom Events

**What:** Call `track()` from `@vercel/analytics` inside existing event handlers.

**Import:** `import { track } from '@vercel/analytics';` — works in client components only.

**Three events to add:**

```typescript
// Source: @vercel/analytics v1.6.1 type definitions
import { track } from '@vercel/analytics';

// 1. Search submitted — in portal/page.tsx handleSearch or onSubmit
track('search_submitted', { query: searchQuery, locale: language });

// 2. Supplement view — in results/page.tsx useEffect on data load
track('supplement_view', { supplement: normalizedQuery, locale });

// 3. Result click — on supplement card onClick
track('result_click', { supplement: supplementName, from: 'results_page' });
```

**Constraints on properties:** `AllowedPropertyValues = string | number | boolean | null | undefined`. Nested objects are NOT allowed.

### GSC Verification

Two options — both are valid:

**Option A: Verification file** (simpler, no layout change)
```
public/google[VERIFICATION_TOKEN].html
```
Content: `google-site-verification: google[TOKEN].html`

**Option B: Meta tag in `<head>`** (via layout.tsx)
```typescript
// app/[locale]/layout.tsx — add to existing `metadata` export
export const metadata = {
  // ... existing fields ...
  verification: {
    google: 'YOUR_VERIFICATION_TOKEN',
  },
};
```

Recommendation: **Option B** (meta tag in layout.tsx) because: (1) no `public/` directory exists yet in this project, (2) it uses the existing Next.js metadata API that is already in place, (3) no static file management needed. The planner should leave the token value as a placeholder `'PASTE_GSC_TOKEN_HERE'` since the actual token is obtained manually from GSC.

### Recommended Project Structure After Phase 4

```
app/
├── sitemap.ts                              # NEW — 308 URL sitemap
├── [locale]/
│   ├── layout.tsx                          # MODIFY — add GSC meta tag
│   ├── portal/
│   │   ├── page.tsx                        # MODIFY — add track('search_submitted')
│   │   ├── results/
│   │   │   ├── page.tsx                    # MODIFY — server wrapper + generateMetadata
│   │   │   └── ResultsClient.tsx           # NEW (renamed from page.tsx client logic)
│   │   └── supplement/[slug]/
│   │       ├── page.tsx                    # MODIFY — server wrapper + generateMetadata
│   │       └── SupplementDetailClient.tsx  # NEW (renamed from page.tsx client logic)
```

### Anti-Patterns to Avoid

- **Adding `generateMetadata` to a `'use client'` file:** Next.js silently ignores it or throws a build error. Always put metadata exports in server components.
- **Importing `track` in server components:** `track()` is browser-only. Only import from client components or event handlers that run client-side.
- **Hardcoding sitemap URLs manually:** Use the `SUPPLEMENTS_DATABASE` import. Manual lists will drift.
- **Using `useSearchParams` in `generateMetadata`:** `generateMetadata` receives `searchParams` as a prop — use `props.searchParams`, not the hook.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap generation | Custom XML string builder | `app/sitemap.ts` with `MetadataRoute.Sitemap` | Next.js handles content-type, caching, and `/sitemap.xml` routing automatically |
| Meta tag injection | Custom `<Head>` component or `document.title` writes | `generateMetadata` export | App Router metadata API handles SSR, deduplication, and OG tag serialization |
| Analytics event batching | Custom queue/debounce wrapper | `track()` direct call | `@vercel/analytics` script handles batching and retry internally |
| Robots.txt | Manual static file | `app/robots.ts` with `MetadataRoute.Robots` | Same pattern as sitemap, ensures consistency |

**Key insight:** Next.js 14 App Router provides a complete, tested metadata pipeline. All custom implementations in this domain have subtle bugs around SSR/hydration, duplicate tags, and encoding.

---

## Common Pitfalls

### Pitfall 1: Client Component Cannot Export `generateMetadata`
**What goes wrong:** Adding `export async function generateMetadata()` to a file that has `'use client'` at the top. Next.js build silently ignores it or errors, resulting in no metadata in `<head>`.
**Why it happens:** Next.js metadata API only works in server components.
**How to avoid:** The server wrapper pattern (rename client file → create server wrapper page).
**Warning signs:** Build succeeds but `<title>` shows the default from `app/[locale]/layout.tsx` instead of the supplement-specific title.

### Pitfall 2: `searchParams` in `generateMetadata` is Async in Next.js 15+
**What goes wrong:** In Next.js 15, `searchParams` in page props became a Promise. This project is on Next.js 14.2.35 — not affected. But the pattern `props.searchParams.q` works directly in Next.js 14.
**Why it happens:** API change between Next.js major versions.
**How to avoid:** Confirm version before implementation. Current: `"next": "^14.2.35"` — direct access is correct.
**Warning signs:** TypeScript error on `searchParams.q` access.

### Pitfall 3: Sitemap URL Count Mismatch
**What goes wrong:** Generating more or fewer than 306 supplement URLs. The database has 153 total entries but some IDs appear in both `-es` and `-en` variants. If you map IDs directly without deduplication, you'd generate 153 URLs instead of 306 (one per locale per unique supplement).
**Why it happens:** The DB has 90 ES entries + 65 EN entries = 155 entries with explicit language, but total is 153. Some have no `-es`/`-en` suffix.
**How to avoid:** Deduplicate base IDs first (`id.replace(/-(?:es|en)$/, '')`), then expand to both locales. Expected: ≤153 unique slugs × 2 locales.
**Warning signs:** Sitemap URL count is not 2× the unique slug count.

### Pitfall 4: `track()` Called in Server Context
**What goes wrong:** Importing `track` from `@vercel/analytics` in an API route or server component. `track` relies on `window.va` which doesn't exist server-side.
**Why it happens:** `@vercel/analytics` exports both a browser `track` and a server `track` (from `@vercel/analytics/server`), but they have different behaviors. The browser one is what the dashboard shows as custom events.
**How to avoid:** Use `import { track } from '@vercel/analytics'` only inside client components or browser event handlers. The three event locations (search submit, supplement view effect, result card click) are all in client components.
**Warning signs:** Events not appearing in Vercel Analytics dashboard; no error but silent drop.

### Pitfall 5: Robots.txt Not Updated
**What goes wrong:** `sitemap.xml` is live but robots.txt doesn't reference it, or disallows the portal URLs.
**Why it happens:** No `public/robots.txt` exists in this project.
**How to avoid:** Create `app/robots.ts` that returns `sitemap` pointing to the sitemap URL.
**Warning signs:** GSC reports sitemap but crawl rate stays low.

---

## Code Examples

### GSC Meta Tag in Layout

```typescript
// app/[locale]/layout.tsx — add verification field to existing metadata export
// Source: Next.js 14 metadata API docs
export const metadata = {
  title: "SuplementIA - Evidence-Based Health Solutions",
  description: "Find what the science says about supplements and interventions for your health goals",
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
  verification: {
    google: 'PASTE_GSC_TOKEN_HERE',  // Token obtained from Google Search Console
  },
};
```

### Robots.ts

```typescript
// app/robots.ts — create new file
// Source: Next.js 14 Metadata Files — robots.txt
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://suplementia.com/sitemap.xml',
  };
}
```

### generateMetadata for Results Page

```typescript
// app/[locale]/portal/results/page.tsx — new server wrapper
import type { Metadata } from 'next';
import ResultsClient from './ResultsClient';

type Props = {
  params: { locale: string };
  searchParams: { q?: string; benefit?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const q = searchParams.q ?? '';
  const locale = params.locale;
  const isEs = locale === 'es';
  const supplementDisplay = q.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const title = q
    ? (isEs
        ? `${supplementDisplay} — Evidencia Científica | SuplementIA`
        : `${supplementDisplay} — Scientific Evidence | SuplementIA`)
    : (isEs ? 'Resultados | SuplementIA' : 'Results | SuplementIA');

  const description = q
    ? (isEs
        ? `Efectividad, dosis y calidad de evidencia científica para ${supplementDisplay}.`
        : `Effectiveness, dosage, and scientific evidence quality for ${supplementDisplay}.`)
    : (isEs ? 'Resultados de búsqueda de suplementos' : 'Supplement search results');

  const canonicalUrl = q
    ? `https://suplementia.com/${locale}/portal/results?q=${encodeURIComponent(q)}`
    : `https://suplementia.com/${locale}/portal/results`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'SuplementIA',
      locale,
    },
    alternates: { canonical: canonicalUrl },
  };
}

export default function ResultsPage(props: Props) {
  return <ResultsClient {...props} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/head` + `<Head>` component | `generateMetadata` + `metadata` export | Next.js 13 App Router | No more head injection races; metadata is SSR-safe by default |
| `pages/sitemap.xml.js` custom API route | `app/sitemap.ts` native | Next.js 13.3 | Automatic `/sitemap.xml` routing, proper content-type, caching headers |
| Manual `window.gtag()` calls | `track()` from `@vercel/analytics` | N/A (Vercel product) | No script loading race conditions; integrated with Vercel dashboard |

**Deprecated/outdated:**
- `next/head`: Not used in App Router. This project uses App Router (`app/` directory). Do not use `<Head>` from `next/head`.
- `pages/` directory patterns: This project is App Router only.

---

## Open Questions

1. **Which URL is canonical for a supplement: `/results?q=ashwagandha` or `/supplement/ashwagandha`?**
   - What we know: Both routes exist (`results/page.tsx` and `supplement/[slug]/page.tsx`). CONTEXT says target is `results/page.tsx`.
   - What's unclear: The supplement detail page (`/supplement/[slug]`) may be the richer SEO target with dedicated evidence data, while `results` is more of a search results page with dynamic content.
   - Recommendation: Planner should add meta tags to BOTH pages with their respective canonical URLs. Sitemap should include the canonical form (planner decides which URL form to prefer).

2. **Base URL for canonical/sitemap: what is the production domain?**
   - What we know: `app/[locale]/layout.tsx` has no `metadataBase` set. Without `metadataBase`, Next.js uses relative URLs in `alternates.canonical`.
   - What's unclear: Production domain is likely `suplementia.com` but this is not confirmed in any config file.
   - Recommendation: Add `metadataBase: new URL('https://suplementia.com')` to the root layout metadata, or confirm the domain and hardcode in `sitemap.ts`. The planner should use `https://suplementia.com` as the base and leave a comment marking it for confirmation.

3. **GSC token placeholder: how should the planner handle it?**
   - What we know: The actual token is generated when the GSC property is created — a manual ops step.
   - What's unclear: Whether the token is already available or will be obtained post-deployment.
   - Recommendation: The code task commits a placeholder string `'PASTE_GSC_TOKEN_HERE'` in the `verification.google` field. A follow-up env variable approach (reading from `process.env.NEXT_PUBLIC_GSC_TOKEN`) is cleaner but adds complexity. Given the minimal scope, a placeholder comment is sufficient.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + @swc/jest |
| Config file | `jest.config.js` (root) |
| Quick run command | `jest --testPathPattern="seo"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEO-01 | `generateMetadata` returns unique title for supplement query | unit | `jest --testPathPattern="seo-meta"` | ❌ Wave 0 |
| SEO-01 | `generateMetadata` returns locale-aware title (ES vs EN) | unit | `jest --testPathPattern="seo-meta"` | ❌ Wave 0 |
| SEO-01 | `generateMetadata` returns Open Graph `title`, `description`, `url` fields | unit | `jest --testPathPattern="seo-meta"` | ❌ Wave 0 |
| SEO-01 | `generateMetadata` returns canonical URL matching page locale | unit | `jest --testPathPattern="seo-meta"` | ❌ Wave 0 |
| SEO-02 | `sitemap()` returns array with exactly 2 index URLs | unit | `jest --testPathPattern="sitemap"` | ❌ Wave 0 |
| SEO-02 | `sitemap()` returns 306 supplement URLs (153 unique slugs × 2 locales) | unit | `jest --testPathPattern="sitemap"` | ❌ Wave 0 |
| SEO-02 | All sitemap URLs begin with `https://suplementia.com/` | unit | `jest --testPathPattern="sitemap"` | ❌ Wave 0 |
| SEO-02 | Sitemap contains both `/es/` and `/en/` variants for each slug | unit | `jest --testPathPattern="sitemap"` | ❌ Wave 0 |
| SEO-03 | GSC verification token present in layout metadata | unit | `jest --testPathPattern="gsc"` | ❌ Wave 0 |
| SEO-03 | `track('search_submitted')` called with `query` and `locale` props | unit | `jest --testPathPattern="analytics-events"` | ❌ Wave 0 |
| SEO-03 | `track('supplement_view')` called when results page mounts with data | unit | `jest --testPathPattern="analytics-events"` | ❌ Wave 0 |
| SEO-03 | `track('result_click')` called on supplement card click | unit | `jest --testPathPattern="analytics-events"` | ❌ Wave 0 |

**Manual verification steps (cannot be automated):**
- SEO-02: Visit `/sitemap.xml` in browser and confirm it renders XML with 300+ URLs
- SEO-03: Confirm Vercel Analytics dashboard shows custom events after deployment (requires live environment)
- GSC: Confirm GSC property ownership verified after ops team inputs token

### Key Test Assertions

**Sitemap test** (`lib/__tests__/sitemap.test.ts`):
```typescript
import sitemap from '@/app/sitemap';

describe('sitemap()', () => {
  it('returns exactly 308 URLs (2 index + 306 supplement)', () => {
    const urls = sitemap();
    expect(urls).toHaveLength(308); // adjust if unique slug count differs
  });

  it('contains 306 supplement URLs total', () => {
    const supplementUrls = sitemap().filter(u => u.url.includes('/portal/results'));
    expect(supplementUrls).toHaveLength(306);
  });

  it('has both /es/ and /en/ for ashwagandha', () => {
    const urls = sitemap().map(u => u.url);
    expect(urls).toContain('https://suplementia.com/es/portal/results?q=ashwagandha');
    expect(urls).toContain('https://suplementia.com/en/portal/results?q=ashwagandha');
  });
});
```

**Meta tags test** (`lib/__tests__/seo-metadata.test.ts`):
```typescript
// Test the generateMetadata function directly (it's a pure function)
import { generateMetadata } from '@/app/[locale]/portal/results/page';

describe('generateMetadata — results page', () => {
  it('returns ES locale title for es locale', async () => {
    const meta = await generateMetadata({ params: { locale: 'es' }, searchParams: { q: 'ashwagandha' } });
    expect(meta.title).toContain('Evidencia Científica');
  });

  it('returns EN locale title for en locale', async () => {
    const meta = await generateMetadata({ params: { locale: 'en' }, searchParams: { q: 'ashwagandha' } });
    expect(meta.title).toContain('Scientific Evidence');
  });

  it('includes canonical URL in alternates', async () => {
    const meta = await generateMetadata({ params: { locale: 'es' }, searchParams: { q: 'ashwagandha' } });
    expect((meta.alternates as any).canonical).toContain('/es/');
    expect((meta.alternates as any).canonical).not.toContain('/en/');
  });
});
```

**Analytics events test** (`lib/__tests__/analytics-events.test.ts`):
```typescript
// Mock @vercel/analytics track()
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));
import { track } from '@vercel/analytics';
// ... render portal page, fire search submit, assert track called
expect(track).toHaveBeenCalledWith('search_submitted', expect.objectContaining({ query: expect.any(String) }));
```

### Sampling Rate
- **Per task commit:** `jest --testPathPattern="seo|sitemap|analytics-events|gsc"`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/sitemap.test.ts` — covers SEO-02 (sitemap URL count and content)
- [ ] `lib/__tests__/seo-metadata.test.ts` — covers SEO-01 (generateMetadata output)
- [ ] `lib/__tests__/analytics-events.test.ts` — covers SEO-03 (track() calls)
- [ ] `lib/__tests__/gsc-verification.test.ts` — covers SEO-03 GSC assertion (layout metadata)

All four are new files; no existing test infrastructure covers Phase 4 requirements.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@vercel/analytics/dist/react/index.d.ts` — `track()` signature, `AllowedPropertyValues` type, confirmed v1.6.1
- `app/[locale]/layout.tsx` (project file) — confirmed `<Analytics />` already mounted, existing metadata structure
- `lib/portal/supplements-database.ts` (project file) — confirmed 153 entries, `SupplementEntry` interface with `id`, `name`, `language` fields
- `app/[locale]/portal/results/page.tsx` (project file) — confirmed `'use client'`, no existing `generateMetadata`
- `next.config.js` (project file) — confirmed Next.js 14 App Router with `withNextIntl`

### Secondary (MEDIUM confidence)
- Next.js 14 App Router Metadata docs — `generateMetadata`, `MetadataRoute.Sitemap`, `app/robots.ts` patterns (verified against installed Next.js version ^14.2.35)
- Vercel Analytics custom events documentation — `track()` browser-only behavior

### Tertiary (LOW confidence)
- None — all critical claims verified from installed packages and project source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed, versions read from package.json
- Architecture: HIGH — client component constraint verified by reading source files directly
- Pitfalls: HIGH — Next.js metadata/client component constraint is a documented API boundary
- Sitemap URL count: HIGH — 153 entries confirmed by grep count of object literals in supplements-database.ts
- Analytics events: HIGH — track() signature confirmed from installed type definitions

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable Next.js 14 API; re-verify if upgrading to Next.js 15)
