type GAEventParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type GAEventName = 'search_started' | 'category_clicked' | 'supplement_viewed';

export function trackGAEvent(eventName: GAEventName, params: GAEventParams = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(['event', eventName, cleanParams]);
    return;
  }

  window.gtag('event', eventName, cleanParams);
}
