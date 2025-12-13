import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Index() {
  const t = useTranslations('Index');
  return (
    <div>
      <h1>{t('title')}</h1>
      <LanguageSwitcher />
    </div>
  );
}
