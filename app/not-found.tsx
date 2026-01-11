/**
 * Root Not Found Page
 * Required by next-intl with localePrefix: 'as-needed'
 * Redirects to localized 404 page
 */

import { redirect } from 'next/navigation';

export default function RootNotFound() {
  // Redirect to the default locale's not-found page
  redirect('/en');
}
