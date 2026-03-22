'use client';

/**
 * Analytics Context — provides typed tracking functions to child components.
 *
 * Architecture:
 *   Components import { useAnalytics } from here.
 *   The context exposes a `track` object — a clean facade over the raw
 *   analytics-service.ts functions.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track.resolveSuccess({ hasVoucher: true, candidateCount: 2, ... });
 *   track.couponCopy('best_result', 'SUMMER50', '50%');
 *
 * The context value is always defined — useAnalytics() returns a no-op stub
 * during SSR/static generation so components never crash at build time.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  initAnalytics,
  trackEvent as rawTrackEvent,
  trackPageView as rawTrackPageView,
} from './analytics';
import {
  confidenceBucket,
  sourceType,
  type ResolveOutcomeMeta,
} from './analytics-service';

// Extend ResolveOutcomeMeta at runtime by spreading — avoids circular import
// (analytics-service imports from analytics, not vice versa)
// The field is always provided by callers, so undefined is safe here.
type ResolveOutcomeMetaFull = ResolveOutcomeMeta & { resultCount: number };

// ── Track facade ───────────────────────────────────────────────────────────────

interface AnalyticsTrack {
  /** Track a page view */
  pageView: (path?: string) => void;

  // ── Funnel: Hero / CTA ─────────────────────────────────────────────────
  /** Hero CTA click (Tìm mã button or Enter key) */
  heroCtaClick: () => void;

  // ── Fun─l: Resolution ───────────────────────────────────────────────────
  /** User submitted a link for resolution */
  resolveSubmit: (inputLength: number, passedValidation: boolean) => void;
  /** Resolution succeeded (with or without a voucher) */
  resolveSuccess: (meta: ResolveOutcomeMeta) => void;
  /** Resolution returned no voucher */
  resolveNoResult: (meta: ResolveOutcomeMeta, errorCode?: string) => void;
  /** Resolution succeeded but confidence is low */
  resolveLowConfidence: (meta: ResolveOutcomeMeta) => void;
  /** Resolution failed (network, service error, etc.) */
  resolveError: (errorCode: string, errorMessage: string) => void;

  // ── Funnel: Result interaction ───────────────────────────────────────────
  /** User clicked on a result card (best or alternative) */
  bestResultClick: (target: 'best' | 'alternative', voucherCode: string, discountValue: string) => void;
  /** User clicked an alternative voucher card */
  alternativeClick: (voucherCode: string, discountValue: string) => void;
  /** User copied a voucher code */
  couponCopy: (source: 'best_result' | 'alternative' | 'history', voucherCode: string, discountValue: string) => void;
  /** User clicked through to Shopee */
  outboundClick: (productUrl: string) => void;

  // ── Feedback ────────────────────────────────────────────────────────────
  /** User gave positive feedback */
  feedbackPositive: (context?: 'result' | 'alternative' | 'page') => void;
  /** User gave negative feedback */
  feedbackNegative: (context?: 'result' | 'alternative' | 'page', reason?: string) => void;

  // ── History ─────────────────────────────────────────────────────────────
  /** User opened the recent searches panel */
  recentSearchOpen: () => void;
  /** User saved/pinned a lookup result */
  saveLink: (fromHistory?: boolean) => void;
}

function makeTrack(): AnalyticsTrack {
  return {
    pageView: (path?: string) => {
      // rawTrackPageView uses window.location.href as fallback, so passing undefined
      // is fine — the path is included via window.location.pathname in trackEvent
      rawTrackPageView(path ? `${window.location.origin}${path}` : undefined);
    },

    heroCtaClick: () => {
      rawTrackEvent('hero_cta_click', {});
    },

    resolveSubmit: (inputLength, passedValidation) => {
      rawTrackEvent('resolve_submit', { inputLength, passedValidation });
    },

    resolveSuccess: (meta) => {
      rawTrackEvent('resolve_success', {
        hasVoucher: meta.hasBestMatch,
        candidateCount: meta.candidateCount,
        confidenceBucket: confidenceBucket(meta.confidenceScore),
        sourceType: sourceType(meta.matchedSource),
        resultCount: meta.resultCount,
      });
    },

    resolveNoResult: (meta, errorCode = 'NO_MATCH') => {
      rawTrackEvent('resolve_no_result', {
        confidenceBucket: confidenceBucket(meta.confidenceScore),
        sourceType: sourceType(meta.matchedSource),
        errorCode,
      });
    },

    resolveLowConfidence: (meta) => {
      rawTrackEvent('resolve_low_confidence', {
        confidenceScore: meta.confidenceScore,
        confidenceBucket: confidenceBucket(meta.confidenceScore),
        sourceType: sourceType(meta.matchedSource),
        hasVoucher: meta.hasBestMatch,
      });
    },

    resolveError: (errorCode, errorMessage) => {
      rawTrackEvent('resolve_error', { errorCode, errorMessage });
    },

    bestResultClick: (target, voucherCode, discountValue) => {
      rawTrackEvent('best_result_click', { target, voucherCode, discountValue });
    },

    alternativeClick: (voucherCode, discountValue) => {
      rawTrackEvent('alternative_click', { voucherCode, discountValue });
    },

    couponCopy: (source, voucherCode, discountValue) => {
      rawTrackEvent('coupon_copy', { source, voucherCode, discountValue });
    },

    outboundClick: (productUrl) => {
      rawTrackEvent('outbound_shopee_click', { productUrl });
    },

    feedbackPositive: (context = 'result') => {
      rawTrackEvent('feedback_positive', { context });
    },

    feedbackNegative: (context = 'result', reason) => {
      rawTrackEvent('feedback_negative', { context, reason });
    },

    recentSearchOpen: () => {
      rawTrackEvent('recent_search_open', {});
    },

    saveLink: (fromHistory = false) => {
      rawTrackEvent('save_link', { fromHistory });
    },
  };
}

interface AnalyticsContextValue {
  track: AnalyticsTrack;
  /** @deprecated Use `track` instead. Kept for backward compatibility with existing components. */
  trackEvent: (name: string, props?: Record<string, unknown>) => void;
}

// No-op stub for SSR / static generation
const noopTrack = makeTrack();
const noopTrackEvent = () => { /* noop */ };

const AnalyticsContext = createContext<AnalyticsContextValue>({
  track: noopTrack,
  trackEvent: noopTrackEvent,
});

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * AnalyticsProvider — wrap your app (or just the public layout) with this
 * to auto-initialise tracking on mount.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  const track = useMemo(makeTrack, []);

  return (
    <AnalyticsContext.Provider value={{ track, trackEvent: rawTrackEvent as (name: string, props?: Record<string, unknown>) => void }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAnalytics — hook to access tracking functions in any component.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track.heroCtaClick();
 *   track.resolveSuccess({ hasVoucher: true, ... });
 *   track.couponCopy('best_result', 'SUMMER50', '50%');
 */
export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  // Return noop stub during SSR so components never crash at build time
  return ctx ?? { track: noopTrack, trackEvent: noopTrackEvent };
}

// ── Types re-export ───────────────────────────────────────────────────────────

export type { AnalyticsEventName } from './analytics';
export type { EventProperties } from './analytics';
export type { ResolveOutcomeMeta } from './analytics-service';
