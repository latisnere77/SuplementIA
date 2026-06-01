import {
  detectLocaleFromCountry,
  pathHasLocale,
  shouldSkipLocaleRedirect
} from './locale-detection';

describe('locale detection', () => {
  it.each(['MX', 'CO', 'ES', 'AR'])('detects %s as Spanish locale', (country) => {
    expect(detectLocaleFromCountry(country)).toBe('es');
  });

  it.each(['US', 'BR', 'FR', 'DE'])('detects %s as English locale', (country) => {
    expect(detectLocaleFromCountry(country)).toBe('en');
  });

  it('uses Spanish accept-language when no country is available', () => {
    expect(detectLocaleFromCountry(undefined, 'es-MX,es;q=0.9,en;q=0.8')).toBe('es');
  });

  it('uses English accept-language when no country is available', () => {
    expect(detectLocaleFromCountry(undefined, 'en-US,en;q=0.9')).toBe('en');
  });

  it('respects explicit English preference over Spanish-speaking country', () => {
    expect(detectLocaleFromCountry('MX', 'es-MX,es;q=0.9', 'en')).toBe('en');
  });

  it('respects explicit Spanish preference over non-Spanish-speaking country', () => {
    expect(detectLocaleFromCountry('US', 'en-US,en;q=0.9', 'es')).toBe('es');
  });

  it('identifies paths that already include a supported locale', () => {
    expect(pathHasLocale('/es/portal')).toBe(true);
    expect(pathHasLocale('/en/portal')).toBe(true);
    expect(pathHasLocale('/portal')).toBe(false);
  });

  it.each([
    '/api',
    '/api/portal/quiz',
    '/_next/static/chunk.js',
    '/assets',
    '/assets/logo',
    '/robots.txt',
    '/sitemap.xml',
  ])(
    'skips locale redirect for %s',
    (pathname) => {
      expect(shouldSkipLocaleRedirect(pathname)).toBe(true);
    }
  );
});
