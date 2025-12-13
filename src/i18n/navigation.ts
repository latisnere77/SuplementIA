import { createNavigation } from 'next-intl/navigation';
import {locales, pathnames} from './routing';

export const {Link, redirect, usePathname, useRouter} =
  createNavigation({
    locales,
    pathnames,
  });
