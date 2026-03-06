// components/portal/__tests__/seo-meta.test.ts
import { generateMetadata } from '@/app/[locale]/portal/results/page';

describe('generateMetadata — results page', () => {
  it('returns ES locale title containing "Evidencia Científica"', async () => {
    const meta = await generateMetadata({
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    });
    expect(String(meta.title)).toContain('Evidencia Científica');
  });

  it('returns EN locale title containing "Scientific Evidence"', async () => {
    const meta = await generateMetadata({
      params: { locale: 'en' },
      searchParams: { q: 'ashwagandha' },
    });
    expect(String(meta.title)).toContain('Scientific Evidence');
  });

  it('title includes the supplement name', async () => {
    const meta = await generateMetadata({
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    });
    expect(String(meta.title)).toMatch(/ashwagandha/i);
  });

  it('includes openGraph with title, description, and url', async () => {
    const meta = await generateMetadata({
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    });
    const og = meta.openGraph as Record<string, unknown>;
    expect(og).toBeDefined();
    expect(og.title).toBeTruthy();
    expect(og.description).toBeTruthy();
    expect(og.url).toBeTruthy();
  });

  it('canonical URL contains /es/ for es locale', async () => {
    const meta = await generateMetadata({
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    });
    const canonical = (meta.alternates as Record<string, string>)?.canonical;
    expect(canonical).toContain('/es/');
    expect(canonical).not.toContain('/en/');
  });

  it('returns fallback title when no q param', async () => {
    const meta = await generateMetadata({
      params: { locale: 'es' },
      searchParams: {},
    });
    expect(meta.title).toBeTruthy();
  });
});
