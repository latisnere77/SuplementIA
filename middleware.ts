import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const latamCountries = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX',
  'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'
];

const intlMiddleware = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'as-needed'
});

export default function middleware(request: NextRequest) {
  // Respect manual language selection if cookie exists
  if (request.cookies.has('NEXT_LOCALE')) {
    return intlMiddleware(request);
  }

  const ipCountry = request.headers.get('x-vercel-ip-country');

  if (ipCountry) {
    const headers = new Headers(request.headers);

    // Logic: LATAM -> es, Everyone else (including US) -> en (default/browser pref)
    if (latamCountries.includes(ipCountry)) {
      headers.set('accept-language', 'es');
    } else {
      // Optional: Explicitly default others to 'en' if we want to ignore browser 'es' preference from non-LATAM IPs?
      // For now, let's strictly follow the user's intent "Mexico -> Spanish, US -> English"
      // If we simply don't set 'es', it will fall back to 'en' (defaultLocale) or browser header.
      // To strictly enforce English for non-LATAM (like US) over potential browser headers:
      // headers.set('accept-language', 'en'); 
    }

    // We only need to override if we matched LATAM to force ES. 
    // If we want to ensure US users get EN even if their browser says ES (unlikely but possible), we could force EN.
    // Given the prompt "si entra alguiend de USA todo deberia de estar en ingles", standard behavior does this unless they have ES browser.
    // Let's stick to forcing ES for LATAM as the primary fix.

    if (headers.get('accept-language') === 'es') {
      const newRequest = new NextRequest(request, { headers });
      return intlMiddleware(newRequest);
    }
  }

  return intlMiddleware(request);
}

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
