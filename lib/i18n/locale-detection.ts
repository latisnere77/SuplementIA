export type SupportedLocale = 'es' | 'en';

const SUPPORTED_LOCALES = new Set<SupportedLocale>(['es', 'en']);

const SPANISH_SPEAKING_COUNTRIES = new Set([
  'AR',
  'BO',
  'CL',
  'CO',
  'CR',
  'CU',
  'DO',
  'EC',
  'SV',
  'GQ',
  'GT',
  'HN',
  'MX',
  'NI',
  'PA',
  'PY',
  'PE',
  'PR',
  'ES',
  'UY',
  'VE',
]);

function normalizeLocale(value?: string | null): SupportedLocale | undefined {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  return undefined;
}

function parseAcceptedLanguages(acceptLanguage?: string): Array<{ locale: SupportedLocale; q: number; index: number }> {
  return String(acceptLanguage || '')
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const locale = normalizeLocale(tag);
      const qParam = params.find((param) => param.trim().startsWith('q='));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return locale ? { locale, q: Number.isFinite(q) ? q : 1, index } : null;
    })
    .filter((item): item is { locale: SupportedLocale; q: number; index: number } => Boolean(item))
    .sort((a, b) => b.q - a.q || a.index - b.index);
}

export function detectLocaleFromCountry(
  country?: string,
  acceptLanguage?: string,
  preferredLocale?: string
): SupportedLocale {
  const explicitLocale = normalizeLocale(preferredLocale);
  if (explicitLocale && SUPPORTED_LOCALES.has(explicitLocale)) {
    return explicitLocale;
  }

  const normalizedCountry = String(country || '').trim().toUpperCase();
  if (normalizedCountry) {
    return SPANISH_SPEAKING_COUNTRIES.has(normalizedCountry) ? 'es' : 'en';
  }

  return parseAcceptedLanguages(acceptLanguage)[0]?.locale || 'en';
}

export function pathHasLocale(pathname: string): boolean {
  return /^\/(?:es|en)(?:\/|$)/.test(pathname);
}

export function shouldSkipLocaleRedirect(pathname: string): boolean {
  if (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/_next' ||
    pathname.startsWith('/_next/') ||
    pathname === '/_vercel' ||
    pathname.startsWith('/_vercel/') ||
    pathname === '/assets' ||
    pathname.startsWith('/assets/') ||
    pathname === '/images' ||
    pathname.startsWith('/images/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.ico'
  ) {
    return true;
  }

  return /\.[^/]+$/.test(pathname);
}
