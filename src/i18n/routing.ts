// import {Pathnames} from 'next-intl/navigation';

export const locales = ['en', 'es'] as const;

// Strict pathname mapping is causing 404s on dynamic routes.
// We allow all paths to be handled by the App Router.
export const pathnames = {
  '/': '/',
  // Allow all other paths to be passed through
} as const;

export type AppPathnames = keyof typeof pathnames;
