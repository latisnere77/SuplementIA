/**
 * Translation Hook
 * Simple i18n hook for portal translations
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { translations, type Language, type TranslationKey } from './translations';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const routeLanguage: Language = locale === 'es' ? 'es' : 'en';
  const [language, setLanguageState] = useState<Language>(routeLanguage);

  // Keep the portal UI aligned with the route locale. The language selector changes
  // the route, so route locale is the source of truth for fixed UI labels.
  useEffect(() => {
    setLanguageState(routeLanguage);
  }, [routeLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Only save to localStorage in browser
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('portal-language', lang);
      } catch (error) {
        console.error('Error saving language:', error);
      }
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations.en[key] || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}
