/**
 * @jest-environment node
 */
import sitemap from './sitemap';
import { localizedPath, siteUrl } from '@/lib/seo';

describe('sitemap', () => {
  it('only publishes canonical, indexable entry points', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).not.toContain(siteUrl);
    expect(urls).not.toContain(localizedPath('es'));
    expect(urls).not.toContain(localizedPath('en'));
    expect(urls).toContain(localizedPath('es', '/portal'));
    expect(urls).toContain(localizedPath('en', '/portal'));
  });

  it('uses non-redirecting localized alternates', () => {
    const portalEntry = sitemap().find((entry) => entry.url === localizedPath('es', '/portal'));

    expect(portalEntry?.alternates?.languages).toMatchObject({
      es: localizedPath('es', '/portal'),
      en: localizedPath('en', '/portal'),
      'x-default': localizedPath('es', '/portal'),
    });
  });
});
