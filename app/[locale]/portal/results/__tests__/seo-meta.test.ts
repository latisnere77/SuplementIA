/**
 * SEO Metadata tests for results and supplement-detail server wrappers.
 * Plan 04-02: Server wrapper pattern — generateMetadata exported from server components.
 *
 * We test generateMetadata in isolation by mocking the client components
 * (which depend on next-intl and browser APIs not available in Node test environment).
 */

// Mock the client components to avoid next-intl ESM issues in test environment
jest.mock('../ResultsClient', () => ({ __esModule: true, default: () => null }));
jest.mock('../../supplement/[slug]/SupplementDetailClient', () => ({ __esModule: true, default: () => null }), { virtual: true });

import { generateMetadata as resultsGenerateMetadata } from '../page';

type ResultsProps = {
  params: { locale: string };
  searchParams: { q?: string; benefit?: string };
};

describe('results/page.tsx — generateMetadata', () => {
  it('returns Spanish title with "Evidencia Científica" for es locale', async () => {
    const props: ResultsProps = {
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    };
    const metadata = await resultsGenerateMetadata(props);
    expect(typeof metadata.title).toBe('string');
    expect(metadata.title as string).toContain('Evidencia Científica');
  });

  it('returns English title with "Scientific Evidence" for en locale', async () => {
    const props: ResultsProps = {
      params: { locale: 'en' },
      searchParams: { q: 'ashwagandha' },
    };
    const metadata = await resultsGenerateMetadata(props);
    expect(typeof metadata.title).toBe('string');
    expect(metadata.title as string).toContain('Scientific Evidence');
  });

  it('returns openGraph object with title, description, url fields', async () => {
    const props: ResultsProps = {
      params: { locale: 'en' },
      searchParams: { q: 'ashwagandha' },
    };
    const metadata = await resultsGenerateMetadata(props);
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph!.title).toBeDefined();
    expect(metadata.openGraph!.description).toBeDefined();
    expect(metadata.openGraph!.url).toBeDefined();
  });

  it('alternates.canonical contains /es/ for es locale and not /en/', async () => {
    const props: ResultsProps = {
      params: { locale: 'es' },
      searchParams: { q: 'ashwagandha' },
    };
    const metadata = await resultsGenerateMetadata(props);
    const canonical = metadata.alternates?.canonical as string;
    expect(canonical).toContain('/es/');
    expect(canonical).not.toContain('/en/');
  });

  it('returns non-empty fallback title when no q param', async () => {
    const props: ResultsProps = {
      params: { locale: 'es' },
      searchParams: {},
    };
    const metadata = await resultsGenerateMetadata(props);
    expect(typeof metadata.title).toBe('string');
    expect((metadata.title as string).length).toBeGreaterThan(0);
  });

  it('capitalises query words in the title', async () => {
    const props: ResultsProps = {
      params: { locale: 'en' },
      searchParams: { q: 'vitamin-d' },
    };
    const metadata = await resultsGenerateMetadata(props);
    expect(metadata.title as string).toContain('Vitamin');
  });
});
