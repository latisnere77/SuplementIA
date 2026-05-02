import { redirect } from '@/src/i18n/navigation';

export default async function Index({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/portal', locale });
}
