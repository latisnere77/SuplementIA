import createMiddleware from 'next-intl/middleware';

// Optimized proxy for Amplify/CloudFront deployment.
// Using 'always' prefix keeps routing consistent and avoids redirect delays.
const intlProxy = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localeDetection: true,
  localePrefix: 'always'
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
