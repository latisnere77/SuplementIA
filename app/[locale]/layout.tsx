import "./globals.css";
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import SeoStructuredData from '@/components/SeoStructuredData';
import { globalSeo, localeAlternates, mexicanSeoKeywords, siteUrl } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seoLocale = locale === 'en' ? 'en' : 'es';
  const seo = globalSeo[seoLocale];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.title,
      template: `%s | SuplementAI`,
    },
    description: seo.description,
    keywords: seoLocale === 'es' ? mexicanSeoKeywords : [
      'evidence based supplements',
      'supplement evidence',
      'best supplements for sleep',
      'best supplements for anxiety',
      'best supplements for energy',
      'supplements backed by studies',
    ],
    applicationName: 'SuplementAI',
    authors: [{ name: 'SuplementAI' }],
    creator: 'SuplementAI',
    publisher: 'SuplementAI',
    category: 'Health',
    alternates: {
      languages: localeAlternates,
    },
    openGraph: {
      type: 'website',
      siteName: 'SuplementAI',
      locale: seoLocale === 'es' ? 'es_MX' : 'en_US',
      url: siteUrl,
      title: seo.title,
      description: seo.description,
      images: [
        {
          url: '/icon.svg',
          width: 512,
          height: 512,
          alt: 'SuplementAI',
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: seo.title,
      description: seo.description,
      images: ['/icon.svg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/icon.svg',
    },
    other: {
      'geo.region': 'MX',
      'geo.placename': 'Mexico',
      'content-language': seoLocale === 'es' ? 'es-MX' : 'en',
      audience: seoLocale === 'es' ? 'Mexico' : 'Global',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className="light">
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <SeoStructuredData locale={locale} />
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
