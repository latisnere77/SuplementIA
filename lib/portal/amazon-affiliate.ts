export function buildAmazonAffiliateSearchUrl(searchTerm: string, associateTag?: string) {
  const params = new URLSearchParams({ k: searchTerm });
  const normalizedTag = associateTag?.trim();

  if (normalizedTag) {
    params.set('tag', normalizedTag);
  }

  return `https://www.amazon.com.mx/s?${params.toString()}`;
}

export function addAmazonAssociateTag(url: string | undefined, associateTag?: string) {
  const normalizedTag = associateTag?.trim();

  if (!url || !normalizedTag) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'amazon.com.mx' || hostname.endsWith('.amazon.com.mx')) {
      parsedUrl.searchParams.set('tag', normalizedTag);
      return parsedUrl.toString();
    }
  } catch {
    return url;
  }

  return url;
}
