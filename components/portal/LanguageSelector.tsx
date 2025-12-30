/**
 * Language Selector Component
 * Allows users to switch between English and Spanish
 */

'use client';

import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/src/i18n/navigation';

export default function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = () => {
    const nextLocale = locale === 'en' ? 'es' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="relative">
      <button
        onClick={handleLanguageChange}
        className="flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
        title={locale === 'en' ? 'Cambiar a Español' : 'Switch to English'}
      >
        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <span className="font-medium text-gray-700 dark:text-gray-300 uppercase">{locale === 'en' ? 'EN' : 'ES'}</span>
      </button>
    </div>
  );
}

