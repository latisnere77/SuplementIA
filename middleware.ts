import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const latamCountries = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX',
  'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'
];

export default createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',

  // Custom locale detection logic
  // localeDetection: (request: NextRequest) => { ... }, // Custom detection is not supported in config object directly in this version.
  localeDetection: true,

  localePrefix: 'as-needed'
});

export const config = {
  // Match only internationalized pathnames
  matcher: [
    '/',
    '/(es|en)/:path*', // Match all pages under /es or /en
    // Enable a redirect to a locale when there is no locale in the pathname
    // Also exclude all files in the public folder and other Next.js specific files
    // See https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    '/((?!_next|_vercel|.*\..*).*)'
  ]
};
