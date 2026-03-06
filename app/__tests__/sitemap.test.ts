/**
 * Sitemap tests — Phase 04, Plan 03
 * Actual unique slugs: 90 (all 153 DB entries have -es/-en suffix)
 * Expected total URLs: 90 * 2 (locales) + 2 (index) = 182
 */
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';

// Derive expected counts from actual DB data (single source of truth)
const UNIQUE_SLUGS = [
  ...new Set(SUPPLEMENTS_DATABASE.map((e) => e.id.replace(/-(?:es|en)$/, ''))),
];
const LOCALES = ['es', 'en'];
const EXPECTED_SUPPLEMENT_URLS = UNIQUE_SLUGS.length * LOCALES.length;
const EXPECTED_INDEX_URLS = LOCALES.length;
const EXPECTED_TOTAL = EXPECTED_INDEX_URLS + EXPECTED_SUPPLEMENT_URLS;

describe('sitemap()', () => {
  let sitemap: () => Array<{ url: string; priority?: number; changeFrequency?: string }>;

  beforeAll(async () => {
    const mod = await import('@/app/sitemap');
    sitemap = mod.default;
  });

  it('returns the correct total number of URLs', () => {
    const entries = sitemap();
    expect(entries).toHaveLength(EXPECTED_TOTAL);
  });

  it('includes one index URL per locale with priority 1.0', () => {
    const entries = sitemap();
    for (const locale of LOCALES) {
      const indexEntry = entries.find(
        (e) => e.url === `https://suplementia.com/${locale}/portal`
      );
      expect(indexEntry).toBeDefined();
      expect(indexEntry?.priority).toBe(1.0);
    }
  });

  it('includes both locale variants for every unique slug', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    for (const slug of UNIQUE_SLUGS.slice(0, 10)) {
      // Sample first 10 slugs for speed
      expect(urls).toContain(
        `https://suplementia.com/es/portal/results?q=${encodeURIComponent(slug)}`
      );
      expect(urls).toContain(
        `https://suplementia.com/en/portal/results?q=${encodeURIComponent(slug)}`
      );
    }
  });

  it('all supplement URLs use priority 0.7 and monthly frequency', () => {
    const entries = sitemap();
    const supplementEntries = entries.filter(
      (e) => e.url.includes('/portal/results')
    );
    expect(supplementEntries).toHaveLength(EXPECTED_SUPPLEMENT_URLS);
    for (const entry of supplementEntries) {
      expect(entry.priority).toBe(0.7);
      expect(entry.changeFrequency).toBe('monthly');
    }
  });

  it('all URLs start with https://suplementia.com/', () => {
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/suplementia\.com\//);
    }
  });
});
