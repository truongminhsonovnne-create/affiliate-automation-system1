'use client';

/**
 * Analytics Context — thin wrapper around the analytics core.
 *
 * This file is intentionally separate from analytics.ts so that the SWC parser
 * (Next.js 14.2.x) doesn't have to deal with a large TypeScript file that
 * contains both complex conditional types at the top and JSX at the bottom.
 * Splitting them avoids a known SWC parse error.
 *
 * Import from here (not analytics.ts) when you need useAnalytics() or
 * AnalyticsProvider.
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  initAnalytics,
  trackEvent,
  trackPageView,
  type AnalyticsEventName,
  type EventProperties,
} from './analytics';

interface AnalyticsContextValue {
  trackEvent: (name: string, props?: Record<string, unknown>) => void;
  trackPageView: (url: string, isFirstPageView: boolean) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: trackEvent as (name: string, props?: Record<string, unknown>) => void,
  trackPageView,
});

/**
 * AnalyticsProvider — wrap your app (or just the public layout) with this
 * to auto-initialise tracking on mount.
 *
 * Usage:
 *   // In your root or layout:
 *   <AnalyticsProvider>
 *     {children}
 *   </AnalyticsProvider>
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        trackEvent: trackEvent as (name: string, props?: Record<string, unknown>) => void,
        trackPageView,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

/**
 * useAnalytics — hook to access tracking functions in any component.
 *
 * Usage:
 *   const { trackEvent, trackPageView } = useAnalytics();
 *   trackEvent('voucher_copy', { voucherCode: 'X', discountValue: '50K' });
 */
export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext);
}

// Re-export types for consumers
export type { AnalyticsEventName, EventProperties };
