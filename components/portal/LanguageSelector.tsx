/**
 * Language Selector Component
 * Allows users to switch between English and Spanish
 */

'use client';

import { Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="relative">
      <button
        onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
        title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
      >
        <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="font-medium text-gray-700 dark:text-gray-300 uppercase">{language === 'en' ? 'EN' : 'ES'}</span>
      </button>
    </div>
  );
}

