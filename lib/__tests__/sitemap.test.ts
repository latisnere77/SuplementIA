// lib/__tests__/sitemap.test.ts
// Note: DB has 153 entries but only 90 unique base slugs (all have -es/-en suffix)
// Total URLs = 90 unique slugs × 2 locales + 2 index = 182
import sitemap from '@/app/sitemap';
import { SUPPLEMENTS_DATABASE } from '@/lib/portal/supplements-database';

const UNIQUE_SLUGS = [...new Set(SUPPLEMENTS_DATABASE.map((e) => e.id.replace(/-(?:es|en)$/, '')))];
const EXPECTED_SUPPLEMENT_URLS = UNIQUE_SLUGS.length * 2; // 2 locales
const EXPECTED_TOTAL = EXPECTED_SUPPLEMENT_URLS + 2; // 2 index pages

describe('sitemap()', () => {
  it(`returns exactly ${EXPECTED_TOTAL} URLs (2 index + ${EXPECTED_SUPPLEMENT_URLS} supplement)`, () => {
    const urls = sitemap();
    expect(urls).toHaveLength(EXPECTED_TOTAL);
  });

  it(`contains ${EXPECTED_SUPPLEMENT_URLS} supplement URLs using /portal/results?q= pattern`, () => {
    const supplementUrls = sitemap().filter((u: { url: string }) => u.url.includes('/portal/results'));
    expect(supplementUrls).toHaveLength(EXPECTED_SUPPLEMENT_URLS);
  });

  it('has both /es/ and /en/ for ashwagandha', () => {
    const urls = sitemap().map((u: { url: string }) => u.url);
    expect(urls).toContain('https://suplementia.com/es/portal/results?q=ashwagandha');
    expect(urls).toContain('https://suplementia.com/en/portal/results?q=ashwagandha');
  });

  it('all URLs begin with https://suplementia.com/', () => {
    const urls = sitemap().map((u: { url: string }) => u.url);
    urls.forEach((url: string) => {
      expect(url).toMatch(/^https:\/\/suplementia\.com\//);
    });
  });

  it('includes /es/portal and /en/portal as index pages', () => {
    const urls = sitemap().map((u: { url: string }) => u.url);
    expect(urls).toContain('https://suplementia.com/es/portal');
    expect(urls).toContain('https://suplementia.com/en/portal');
  });
});
