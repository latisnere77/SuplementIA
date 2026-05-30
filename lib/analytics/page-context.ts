export type GAPageContext = {
  locale?: 'es' | 'en';
  page_type: 'portal_home' | 'category_landing' | 'supplement_detail' | 'search_results' | 'site_page';
  category_slug?: string;
  supplement_slug?: string;
  query?: string;
};

export function getGAPageContext(pathname: string, searchParams?: URLSearchParams): GAPageContext {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] === 'en' || segments[0] === 'es' ? segments[0] : undefined;
  const pathSegments = locale ? segments.slice(1) : segments;

  if (pathSegments[0] !== 'portal') {
    return { locale, page_type: 'site_page' };
  }

  if (pathSegments.length === 1) {
    return { locale, page_type: 'portal_home' };
  }

  if (pathSegments[1] === 'results') {
    return {
      locale,
      page_type: 'search_results',
      query: searchParams?.get('q') || searchParams?.get('supplement') || undefined,
    };
  }

  if (pathSegments[1] === 'category' && pathSegments[2]) {
    return {
      locale,
      page_type: 'category_landing',
      category_slug: pathSegments[2],
    };
  }

  if (pathSegments[1] === 'supplement' && pathSegments[2]) {
    return {
      locale,
      page_type: 'supplement_detail',
      supplement_slug: pathSegments[2],
      category_slug: searchParams?.get('benefit') || undefined,
    };
  }

  return { locale, page_type: 'site_page' };
}
