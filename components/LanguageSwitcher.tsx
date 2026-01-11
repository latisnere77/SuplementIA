"use client";

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

export default function LanguageSwitcher() {
  const t = useTranslations('Index');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    router.push(pathname, { locale: newLocale });
  };

  return (
    <div>
      <button onClick={() => handleLocaleChange('en')} disabled={locale === 'en'}>
        English
      </button>
      <button onClick={() => handleLocaleChange('es')} disabled={locale === 'es'}>
        Español
      </button>
    </div>
  );
}