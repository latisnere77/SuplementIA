type GAEventParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type GAEventName = 'search_started' | 'category_clicked' | 'supplement_viewed' | 'cta_clicked';

export function trackGAEvent(eventName: GAEventName, params: GAEventParams = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  const sendEvent = (attempt = 0) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, cleanParams);
      return;
    }

    if (attempt < 5) {
      window.setTimeout(() => sendEvent(attempt + 1), 750);
    }
  };

  sendEvent();
}
