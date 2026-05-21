import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  // Ensure locale is valid, or fallback to the SEO default locale if middleware has not resolved one.
  if (!locale) {
    locale = 'es';
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
