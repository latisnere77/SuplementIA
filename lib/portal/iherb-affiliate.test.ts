import { buildIHerbAffiliateUrl, buildIHerbSearchUrl, findIHerbAffiliateMatch } from './iherb-affiliate';

describe('findIHerbAffiliateMatch', () => {
  it('matches clear English supplement names', () => {
    expect(findIHerbAffiliateMatch(['Bacopa monnieri'])?.canonicalName).toBe('Bacopa Monnieri');
  });

  it('matches clear Spanish supplement names', () => {
    expect(findIHerbAffiliateMatch(['magnesio'])?.canonicalName).toBe('Magnesium');
  });

  it('matches scientific names', () => {
    expect(findIHerbAffiliateMatch(['Withania somnifera'])?.canonicalName).toBe('Ashwagandha');
  });

  it('matches uncommon Spanish and scientific supplement aliases', () => {
    expect(findIHerbAffiliateMatch(['sábila'])?.canonicalName).toBe('Aloe Vera');
    expect(findIHerbAffiliateMatch(['Hericium erinaceus'])?.canonicalName).toBe("Lion's Mane");
    expect(findIHerbAffiliateMatch(['aceite de comino negro'])?.canonicalName).toBe('Black Seed Oil');
  });

  it('does not match broad health goals', () => {
    expect(findIHerbAffiliateMatch(['sleep', 'energy', 'stress'])).toBeNull();
  });

  it('does not match very short ambiguous queries', () => {
    expect(findIHerbAffiliateMatch(['d'])).toBeNull();
  });
});

describe('buildIHerbAffiliateUrl', () => {
  it('builds direct iHerb Mexico search URLs by default', () => {
    expect(buildIHerbSearchUrl('magnesium glycinate')).toBe('https://mx.iherb.com/search?kw=magnesium+glycinate');
  });

  it('supports externally generated affiliate tracking templates', () => {
    expect(buildIHerbAffiliateUrl('bacopa monnieri', 'https://track.example/click?u={url}&q={query}')).toBe(
      'https://track.example/click?u=https%3A%2F%2Fmx.iherb.com%2Fsearch%3Fkw%3Dbacopa%2Bmonnieri&q=bacopa%20monnieri'
    );
  });

  it('falls back to direct iHerb URLs for unsafe or incomplete templates', () => {
    expect(buildIHerbAffiliateUrl('magnesium', 'http://track.example/click?u={url}')).toBe('https://mx.iherb.com/search?kw=magnesium');
    expect(buildIHerbAffiliateUrl('magnesium', 'https://track.example/click?q={query}')).toBe('https://mx.iherb.com/search?kw=magnesium');
    expect(buildIHerbAffiliateUrl('magnesium', 'not-a-url-{url}')).toBe('https://mx.iherb.com/search?kw=magnesium');
  });
});
