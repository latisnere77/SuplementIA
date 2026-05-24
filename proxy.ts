import createMiddleware from 'next-intl/middleware';

// Optimized proxy for Amplify/CloudFront deployment.
// Using 'always' prefix keeps routing consistent and avoids redirect delays.
const intlProxy = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localeDetection: true,
  localePrefix: 'always',
  // Next metadata owns canonical/hreflang tags for SEO pages. The middleware
  // x-default header points to unprefixed paths even with localePrefix: always.
  alternateLinks: false
});

export default intlProxy;

export const config = {
  matcher: [
    '/',
    '/(es|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/portal/:path*'
  ]
};
