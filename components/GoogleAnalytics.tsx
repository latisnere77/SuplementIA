'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { getGAPageContext } from '@/lib/analytics/page-context';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function PageViewTracker({
  isReady,
  measurementId,
}: {
  isReady: boolean;
  measurementId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !pathname || typeof window.gtag !== 'function') {
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    const pageLocation = window.location.href;
    const pageContext = getGAPageContext(pathname, searchParams);

    if (lastPageViewRef.current === pageLocation) {
      return;
    }

    lastPageViewRef.current = pageLocation;

    window.gtag('config', measurementId, {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: document.title,
      ...pageContext,
      send_page_view: false,
    });

    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: pageLocation,
      page_title: document.title,
      ...pageContext,
      send_to: measurementId,
    });
  }, [isReady, measurementId, pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  const [isReady, setIsReady] = useState(false);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onReady={() => setIsReady(true)}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker isReady={isReady} measurementId={measurementId} />
      </Suspense>
    </>
  );
}
