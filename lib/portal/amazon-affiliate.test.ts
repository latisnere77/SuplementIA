import { addAmazonAssociateTag, buildAmazonAffiliateSearchUrl } from './amazon-affiliate';

describe('buildAmazonAffiliateSearchUrl', () => {
  it('builds Amazon Mexico search links without a tag when none is configured', () => {
    expect(buildAmazonAffiliateSearchUrl('magnesium suplemento')).toBe(
      'https://www.amazon.com.mx/s?k=magnesium+suplemento'
    );
  });

  it('adds the configured Amazon Associate tag', () => {
    expect(buildAmazonAffiliateSearchUrl('bacopa monnieri', 'suplementai-20')).toBe(
      'https://www.amazon.com.mx/s?k=bacopa+monnieri&tag=suplementai-20'
    );
  });

  it('ignores blank tags', () => {
    expect(buildAmazonAffiliateSearchUrl('vitamina d', '   ')).toBe(
      'https://www.amazon.com.mx/s?k=vitamina+d'
    );
  });
});

describe('addAmazonAssociateTag', () => {
  it('adds a tag to Amazon Mexico URLs', () => {
    expect(addAmazonAssociateTag('https://www.amazon.com.mx/s?k=magnesium', 'suplementai-20')).toBe(
      'https://www.amazon.com.mx/s?k=magnesium&tag=suplementai-20'
    );
  });

  it('replaces stale tags on Amazon Mexico URLs', () => {
    expect(addAmazonAssociateTag('https://amazon.com.mx/search?k=omega&tag=old-20', 'new-20')).toBe(
      'https://amazon.com.mx/search?k=omega&tag=new-20'
    );
  });

  it('does not modify non-Amazon URLs', () => {
    expect(addAmazonAssociateTag('https://example.com/product', 'suplementai-20')).toBe('https://example.com/product');
  });
});
