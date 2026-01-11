import { redirect } from '@/src/i18n/navigation';

export default function Index({ params: { locale } }: { params: { locale: string } }) {
  redirect({ href: '/portal', locale });
}
