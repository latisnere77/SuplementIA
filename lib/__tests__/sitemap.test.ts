// lib/__tests__/sitemap.test.ts
import sitemap from '@/app/sitemap';

describe('sitemap()', () => {
  it('returns exactly 308 URLs (2 index + 306 supplement)', () => {
    const urls = sitemap();
    expect(urls).toHaveLength(308);
  });

  it('contains 306 supplement URLs using /portal/results?q= pattern', () => {
    const supplementUrls = sitemap().filter((u: { url: string }) => u.url.includes('/portal/results'));
    expect(supplementUrls).toHaveLength(306);
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
