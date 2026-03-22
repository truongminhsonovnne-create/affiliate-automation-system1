/**
 * Analytics Service — typed, high-level tracking API for VoucherFinder.
 *
 * This is the ONLY file components should import tracking functions from.
 *
 * Design principles:
 *   - Zero PII: no URLs, no product names, no user data
 *   - Structured metadata: confidence bucket, source type, result counts
 *   - Graceful no-op: never throws, never blocks the user
 *   - Easy to extend: add new events by adding to AnalyticsEventName in analytics.ts
 *
 * Funnel:
 *   hero_cta_click
 *     → resolve_submit
 *       → resolve_success / resolve_no_result / resolve_low_confidence / resolve_error
 *         → best_result_click / alternative_click
 *         → coupon_copy
 *         → feedback_positive / feedback_negative
 *
 * Additional:
 *   page_view · hero_cta_click · recent_search_open · save_link
 */

'use client';

import {
  trackEvent as rawTrackEvent,
  trackPageView as rawTrackPageView,
  type AnalyticsEventName,
  type EventProperties,
} from './analytics';

// ── Convenience type shortcuts ───────────────────────────────────────────────

type Event<K extends AnalyticsEventName> = Omit<EventProperties[K], keyof BaseEventProps>;
type WithoutBase<T> = Omit<T, keyof BaseEventProps>;

// Re-export for consumers
export type { AnalyticsEventName };

// ── Shared base props (safe, non-PII) ────────────────────────────────────────

interface BaseEventProps {
  path: string;
  referrer: string;
  sessionId: string;
  timestamp: string;
}

// ── Helper: bucket a confidence score ────────────────────────────────────────

/**
 * Convert a numeric confidence score (0–1) into a UI-friendly bucket label.
 * These buckets are what we display in dashboards — not the raw score.
 */
export function confidenceBucket(score?: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (score == null) return 'unknown';
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

// ── Helper: infer source type from matched_source ─────────────────────────────

/**
 * Categorise the matched source into a clean analytics dimension.
 * Users don't know what MasOffer_broad means — we translate it here.
 */
export function sourceType(source?: string): 'exact' | 'fallback' | 'broad' | 'unknown' {
  if (!source) return 'unknown';
  if (source === 'AccessTrade') return 'exact';
  if (source === 'MasOffer') return 'exact';
  if (source.toLowerCase().includes('broad')) return 'broad';
  return 'fallback';
}

// ── Page view ─────────────────────────────────────────────────────────────────

/**
 * Track a page view.
 * isFirstPageView is detected automatically inside rawTrackPageView via sessionStorage.
 *
 * @param path — URL pathname (not the full URL — never send product URLs)
 */
export function trackPageView(path: string): void {
  rawTrackPageView(path);
}

// ── Hero / CTA ─────────────────────────────────────────────────────────────────

/**
 * Track when a user clicks the main CTA (the "Tìm mã" button on the hero).
 *
 * Trigger: user clicks the search button or presses Enter in the search box.
 */
export function trackHeroCtaClick(): void {
  rawTrackEvent('hero_cta_click', {});
}

// ── Resolve: submit ───────────────────────────────────────────────────────────

/**
 * Track when a user submits a link for resolution.
 * This is the primary funnel entry event.
 *
 * @param inputLength        — Length of the submitted URL (not the URL itself)
 * @param passedValidation   — Whether client-side validation passed
 */
export function trackResolveSubmit(inputLength: number, passedValidation: boolean): void {
  rawTrackEvent('resolve_submit', {
    inputLength,
    passedValidation,
  });
}

// ── Resolve: outcome ───────────────────────────────────────────────────────────

/** Outcome of a resolution request — sent with the success or failure event. */
export interface ResolveOutcomeMeta {
  confidenceScore?: number;
  matchedSource?: string;
  hasBestMatch: boolean;
  candidateCount: number;
  resultCount: number; // total = bestMatch + candidates
}

/**
 * Track a successful resolution.
 *
 * @param meta — Outcome metadata (no PII, no URLs)
 */
export function trackResolveSuccess(meta: ResolveOutcomeMeta): void {
  rawTrackEvent('resolve_success', {
    hasVoucher: meta.hasBestMatch,
    candidateCount: meta.candidateCount,
    confidenceBucket: confidenceBucket(meta.confidenceScore),
    sourceType: sourceType(meta.matchedSource),
    resultCount: meta.resultCount,
  });
}

/**
 * Track a resolution that returned zero vouchers (not an error — just no match).
 *
 * @param meta       — Outcome metadata (confidence, source, etc.)
 * @param errorCode  — Low-level error code if available
 */
export function trackResolveNoResult(meta: ResolveOutcomeMeta, errorCode?: string): void {
  rawTrackEvent('resolve_no_result', {
    confidenceBucket: confidenceBucket(meta.confidenceScore),
    sourceType: sourceType(meta.matchedSource),
    errorCode: errorCode ?? 'NO_MATCH',
  });
}

/**
 * Track a resolution that succeeded but with low confidence (fallback used).
 *
 * @param meta — Outcome metadata
 */
export function trackResolveLowConfidence(meta: ResolveOutcomeMeta): void {
  rawTrackEvent('resolve_low_confidence', {
    confidenceScore: meta.confidenceScore,
    confidenceBucket: confidenceBucket(meta.confidenceScore),
    sourceType: sourceType(meta.matchedSource),
    hasVoucher: meta.hasBestMatch,
  });
}

/**
 * Track a resolution error (network, timeout, service unavailable, etc.).
 *
 * @param errorCode   — Machine-readable error code
 * @param errorMessage — Short user-facing message (no stack traces)
 */
export function trackResolveError(errorCode: string, errorMessage: string): void {
  rawTrackEvent('resolve_error', {
    errorCode,
    errorMessage,
  });
}

// ── Result interaction ─────────────────────────────────────────────────────────

/** Which result card was clicked */
export type ResultTarget = 'best' | 'alternative';

/**
 * Track when a user clicks on a result card (best match or alternative).
 *
 * @param target       — Which card was clicked
 * @param voucherCode  — The voucher code on the card (safe — coupon codes are public)
 * @param discountValue — Discount display text (e.g. "50%", "Miễn phí ship")
 */
export function trackBestResultClick(
  target: ResultTarget,
  voucherCode: string,
  discountValue: string
): void {
  rawTrackEvent('best_result_click', {
    target,
    voucherCode,
    discountValue,
  });
}

/**
 * Track when a user clicks an alternative (not the primary result).
 * Alias of trackBestResultClick(target='alternative', ...) for semantic clarity.
 */
export function trackAlternativeClick(
  voucherCode: string,
  discountValue: string
): void {
  trackBestResultClick('alternative', voucherCode, discountValue);
}

// ── Copy ──────────────────────────────────────────────────────────────────────

/** Where the copy action was triggered from */
export type CopySource = 'best_result' | 'alternative' | 'history';

/**
 * Track when a user copies a voucher code.
 *
 * @param source        — Where the copy was initiated
 * @param voucherCode   — The copied code (public data — coupon codes)
 * @param discountValue — Discount value string
 */
export function trackCouponCopy(
  source: CopySource,
  voucherCode: string,
  discountValue: string
): void {
  rawTrackEvent('coupon_copy', {
    source,
    voucherCode,
    discountValue,
  });
}

// ── Feedback ───────────────────────────────────────────────────────────────────

/**
 * Track positive feedback (thumbs up / "Hữu ích" button).
 *
 * @param context — Where the feedback was given: 'result', 'alternative', 'page'
 */
export function trackFeedbackPositive(context: 'result' | 'alternative' | 'page' = 'result'): void {
  rawTrackEvent('feedback_positive', { context });
}

/**
 * Track negative feedback (thumbs down / "Không hữu ích" button).
 *
 * @param context — Where the feedback was given
 * @param reason  — Short reason (e.g. 'wrong_code', 'expired', 'unhelpful')
 */
export function trackFeedbackNegative(
  context: 'result' | 'alternative' | 'page' = 'result',
  reason?: string
): void {
  rawTrackEvent('feedback_negative', { context, reason });
}

// ── History / recent searches ─────────────────────────────────────────────────

/**
 * Track when the history panel is opened (expanded).
 */
export function trackRecentSearchOpen(): void {
  rawTrackEvent('recent_search_open', {});
}

/**
 * Track when a user saves/pins a lookup result to history.
 *
 * @param fromHistory — Whether the action started from the history panel
 */
export function trackSaveLink(fromHistory = false): void {
  rawTrackEvent('save_link', { fromHistory });
}
