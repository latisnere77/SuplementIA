import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import {
  detectLocaleFromCountry,
  pathHasLocale,
  shouldSkipLocaleRedirect
} from './lib/i18n/locale-detection';

// Optimized proxy for Amplify/CloudFront deployment.
// Using 'always' prefix keeps routing consistent and avoids redirect delays.
const intlProxy = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localeDetection: false,
  localePrefix: 'always',
  // Next metadata owns canonical/hreflang tags for SEO pages. The middleware
  // x-default header points to unprefixed paths even with localePrefix: always.
  alternateLinks: false
});

function getPreferredLocale(request: NextRequest): string | undefined {
  return (
    request.cookies.get('NEXT_LOCALE')?.value ||
    request.cookies.get('locale')?.value ||
    request.cookies.get('preferredLocale')?.value ||
    request.cookies.get('portal-language')?.value
  );
}

function getCountryHeader(request: NextRequest): string | undefined {
  return (
    request.headers.get('cloudfront-viewer-country') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    undefined
  );
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkipLocaleRedirect(pathname)) {
    return NextResponse.next();
  }

  if (pathHasLocale(pathname)) {
    return intlProxy(request);
  }

  const locale = detectLocaleFromCountry(
    getCountryHeader(request),
    request.headers.get('accept-language') || undefined,
    getPreferredLocale(request)
  );

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    '/',
    '/(es|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/portal/:path*'
  ]
};
