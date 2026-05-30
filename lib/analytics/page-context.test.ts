import { getGAPageContext } from './page-context';

describe('getGAPageContext', () => {
  it('classifies localized portal home pages', () => {
    expect(getGAPageContext('/es/portal')).toEqual({
      locale: 'es',
      page_type: 'portal_home',
    });
  });

  it('classifies category landing pages with category slugs', () => {
    expect(getGAPageContext('/en/portal/category/sleep')).toEqual({
      locale: 'en',
      page_type: 'category_landing',
      category_slug: 'sleep',
    });
  });

  it('classifies supplement detail pages with benefit context', () => {
    expect(getGAPageContext(
      '/es/portal/supplement/coenzyme-q10',
      new URLSearchParams('benefit=heart-health')
    )).toEqual({
      locale: 'es',
      page_type: 'supplement_detail',
      supplement_slug: 'coenzyme-q10',
      category_slug: 'heart-health',
    });
  });

  it('classifies search result pages with the visible query', () => {
    expect(getGAPageContext(
      '/en/portal/results',
      new URLSearchParams('q=magnesium&supplement=magnesium')
    )).toEqual({
      locale: 'en',
      page_type: 'search_results',
      query: 'magnesium',
    });
  });
});
