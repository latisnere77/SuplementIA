import createMiddleware from 'next-intl/middleware';

// Optimized middleware for Amplify/CloudFront deployment
// Removed Vercel-specific geo-detection to improve performance
const intlMiddleware = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'as-needed'
});

export default intlMiddleware;

export const config = {
  // Match only internationalized pathnames
  matcher: [
    '/',
    '/(es|en)/:path*', // Match all pages under /es or /en
    // Enable a redirect to a locale when there is no locale in the pathname
    // Also exclude all files in the public folder and other Next.js specific files
    // See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Explicitly match portal routes to ensure they are handled by next-intl
    '/portal/:path*'
  ]
};
