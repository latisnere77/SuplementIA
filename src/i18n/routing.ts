// import {Pathnames} from 'next-intl/navigation';

export const locales = ['en', 'es'] as const;

export const pathnames = {
  '/': '/',
  '/portal': {
    en: '/portal',
    es: '/portal',
  },
};

export type AppPathnames = keyof typeof pathnames;
