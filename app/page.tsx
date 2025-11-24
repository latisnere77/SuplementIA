/**
 * Root page - redirects to portal
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/portal');
}

