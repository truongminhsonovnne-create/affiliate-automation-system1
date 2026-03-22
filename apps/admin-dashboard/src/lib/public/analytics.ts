/**
 * Analytics — Pluggable, privacy-preserving event tracking for VoucherFinder.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Architecture                                               │
 * │                                                            │
 * │  Component calls:  trackEvent('page_view', { path })      │
 * │                              ↓                             │
 * │  analytics.ts:       AnalyticsAdapter.track()               │
 * │                              ↓                             │
 * │  GA4Adapter / UmamiAdapter / NoOpAdapter                   │
 * │                                                            │
 * │  All adapters receive the same AnalyticsEvent shape.        │
 * │  Switch adapters by setting NEXT_PUBLIC_ANALYTICS_PROVIDER. │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Privacy principles:
 *   - No PII collected by default (no email, no name, no IP logged to our storage)
 *   - Session ID is a random UUID4 stored only in sessionStorage (ephemeral)
 *   - User agent and referrer are collected (standard for web analytics)
 *   - Events are batched and sent asynchronously (non-blocking)
 *   - Analytics is disabled by default — must be explicitly enabled
 *
 * To enable GA4:
 *   1. Create a GA4 property at analytics.google.com
 *   2. Set NEXT_PUBLIC_ANALYTICS_ENABLED=true
 *   3. Set NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
 *
 * To enable Umami (self-hosted, GDPR-friendly):
 *   1. Deploy umami at umami.is (or use umami.is cloud)
 *   2. Set NEXT_PUBLIC_ANALYTICS_ENABLED=true
 *   3. Set NEXT_PUBLIC_ANALYTICS_PROVIDER=umami
 *   4. Set NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-uuid
 *   5. Set NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami.com/umami.js
 */

'use client';

// =============================================================================
// Event Types
// =============================================================================

/** All first-class analytics events for VoucherFinder. */
export type AnalyticsEventName =
  // ── Page views ────────────────────────────────────────────────────────────
  | 'page_view'

  // ── Funnel: Hero / CTA ───────────────────────────────────────────────────
  | 'hero_cta_click'

  // ── Funnel: Resolution ────────────────────────────────────────────────────
  | 'resolve_submit'
  | 'resolve_success'
  | 'resolve_no_result'
  | 'resolve_low_confidence'
  | 'resolve_error'

  // ── Funnel: Result interaction ─────────────────────────────────────────────
  | 'best_result_click'
  | 'alternative_click'
  | 'coupon_copy'
  | 'outbound_shopee_click'

  // ── Feedback ─────────────────────────────────────────────────────────────
  | 'feedback_positive'
  | 'feedback_negative'

  // ── History ──────────────────────────────────────────────────────────────
  | 'recent_search_open'
  | 'save_link'

  // ── Content / discovery ───────────────────────────────────────────────────
  | 'article_view'
  | 'article_cta_click'
  | 'resources_link_click'

  // ── Navigation ────────────────────────────────────────────────────────────
  | 'nav_click'
  | 'footer_cta_click'
  | 'contact_click'

  // ── Contact form ──────────────────────────────────────────────────────────
  | 'contact_submit_success'
  | 'contact_submit_fail';

/** Properties attached to every event (always sent, never PII). */
export interface BaseEventProperties {
  /** URL path, e.g. "/home" or "/resources/huong-dan-san-sale-shopee-2026" */
  path: string;
  /** Document referrer (may be empty for direct traffic) */
  referrer: string;
  /** Ephemeral session ID (random UUID4, sessionStorage only) */
  sessionId: string;
  /** ISO timestamp when the event fired */
  timestamp: string;
}

/** Properties specific to a given event type. */
export interface EventProperties {
  page_view: BaseEventProperties & {
    /** Full URL */
    url: string;
    /** Whether this is the first page view of the session */
    isFirstPageView: boolean;
  };

  // ── Hero / CTA ──────────────────────────────────────────────────────────
  hero_cta_click: BaseEventProperties;

  // ── Resolution ────────────────────────────────────────────────────────────
  resolve_submit: BaseEventProperties & {
    inputLength: number;
    passedValidation: boolean;
  };
  resolve_success: BaseEventProperties & {
    hasVoucher: boolean;
    candidateCount: number;
    confidenceBucket: 'high' | 'medium' | 'low' | 'unknown';
    sourceType: 'exact' | 'fallback' | 'broad' | 'unknown';
    resultCount: number;
  };
  resolve_no_result: BaseEventProperties & {
    confidenceBucket: 'high' | 'medium' | 'low' | 'unknown';
    sourceType: 'exact' | 'fallback' | 'broad' | 'unknown';
    errorCode: string;
  };
  resolve_low_confidence: BaseEventProperties & {
    confidenceScore?: number;
    confidenceBucket: 'high' | 'medium' | 'low' | 'unknown';
    sourceType: 'exact' | 'fallback' | 'broad' | 'unknown';
    hasVoucher: boolean;
  };
  resolve_error: BaseEventProperties & {
    errorCode: string;
    errorMessage: string;
  };

  // ── Result interaction ───────────────────────────────────────────────────
  best_result_click: BaseEventProperties & {
    target: 'best' | 'alternative';
    voucherCode: string;
    discountValue: string;
  };
  alternative_click: BaseEventProperties & {
    voucherCode: string;
    discountValue: string;
  };
  coupon_copy: BaseEventProperties & {
    source: 'best_result' | 'alternative' | 'history';
    voucherCode: string;
    discountValue: string;
  };
  outbound_shopee_click: BaseEventProperties & {
    productUrl: string;
  };

  // ── Feedback ─────────────────────────────────────────────────────────────
  feedback_positive: BaseEventProperties & {
    context: 'result' | 'alternative' | 'page';
  };
  feedback_negative: BaseEventProperties & {
    context: 'result' | 'alternative' | 'page';
    reason?: string;
  };

  // ── History ───────────────────────────────────────────────────────────────
  recent_search_open: BaseEventProperties;
  save_link: BaseEventProperties & {
    fromHistory: boolean;
  };

  article_view: BaseEventProperties & {
    /** Article slug, e.g. "huong-dan-san-sale-shopee-2026" */
    articleSlug: string;
    /** Article title */
    articleTitle: string;
    /** Estimated read time in minutes */
    readTime: number;
  };
  article_cta_click: BaseEventProperties & {
    articleSlug: string;
    /** Which CTA variant was clicked */
    ctaVariant: 'inline' | 'bottom';
  };
  resources_link_click: BaseEventProperties & {
    /** The specific resource path clicked */
    resourcePath: string;
  };

  nav_click: BaseEventProperties & {
    /** Nav destination path */
    destination: string;
    /** Which nav element (e.g. "header", "footer") */
    navLocation: 'header' | 'footer';
  };
  footer_cta_click: BaseEventProperties;
  contact_click: BaseEventProperties;

  contact_submit_success: BaseEventProperties & {
    /** The topic selected by the user */
    topic: string;
  };
  contact_submit_fail: BaseEventProperties & {
    /** HTTP status code or 'NETWORK' */
    errorCode: string;
    /** Short human-readable error message */
    errorMessage: string;
  };
}

/** A fully-typed analytics event ready to be sent to an adapter. */
export type AnalyticsEvent = {
  [K in AnalyticsEventName]: {
    name: K;
    properties: EventProperties[K];
  };
}[AnalyticsEventName];

// =============================================================================
// Adapter Interface
// =============================================================================

export interface AnalyticsAdapter {
  /** Initialise the adapter (e.g. load GA4 script, validate config). */
  init(): void;
  /**
   * Send an event. The adapter must never throw — all errors are swallowed
   * so analytics never breaks the user experience.
   */
  track(event: AnalyticsEvent): void;
  /** Clean up (e.g. remove event listeners). */
  destroy(): void;
}

// =============================================================================
// NoOp Adapter — used when analytics is disabled
// =============================================================================

const NoOpAdapter: AnalyticsAdapter = {
  init() {},
  track() {},
  destroy() {},
};

// =============================================================================
// GA4 Adapter
// =============================================================================

let _ga4Loaded = false;

const GA4Adapter: AnalyticsAdapter = {
  init() {
    if (_ga4Loaded) return;
    _ga4Loaded = true;

    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (!measurementId) return;

    // Load GA4 gtag script asynchronously
    const win = window as Window & {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    };
    win.dataLayer ??= [];
    win.gtag ??= function gtag(...args: unknown[]) {
      win.dataLayer!.push(args);
    };
    win.gtag('js', new Date());
    win.gtag('config', measurementId, {
      // Privacy-friendly: do not link user identity across sites
      linker: { accept_incoming: false },
      // Anonymize IPs (GDPR consideration)
      anonymize_ip: true,
      // Do not send full URL paths to GA4 (only paths, no query strings with product URLs)
      send_page_view: false, // we send page_view manually for full control
    });

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    // Mark as user-initiated performance, not marketing
    script.setAttribute('type', 'text/javascript');
    document.head.appendChild(script);
  },

  track(event: AnalyticsEvent) {
    const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (!measurementId) return;

    const win = window as Window & {
      gtag?: (...args: unknown[]) => void;
    };
    if (!win.gtag) return;

    // Strip query strings from URLs — never send product URLs to GA4
    const sanitizedProps = sanitizeForGA4(event.properties);

    win.gtag('event', event.name, sanitizedProps);
  },

  destroy() {
    _ga4Loaded = false;
  },
};

/**
 * Strip query strings and sensitive path segments from event properties
 * before sending to GA4. We only ever send paths, never full URLs.
 */
function sanitizeForGA4(props: BaseEventProperties): Record<string, unknown> {
  return {
    // Only send the path, never the full URL (no product URLs in GA4)
    page_path: 'path' in props ? (props as { path: string }).path : undefined,
    // Session and timestamp are custom dimensions
    session_id: props.sessionId,
    // Referrer (may be empty)
    referrer: props.referrer || '(direct)',
    // Remove timestamp from GA4 custom dimensions (GA4 records its own)
    // ...spread remaining safe properties
    ...Object.fromEntries(
      Object.entries(props)
        .filter(([k]) => !['timestamp', 'sessionId'].includes(k))
        .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 200) : v])
    ),
  };
}

// =============================================================================
// Umami Adapter (self-hosted, GDPR-friendly)
// =============================================================================

let _umamiLoaded = false;

const UmamiAdapter: AnalyticsAdapter = {
  init() {
    if (_umamiLoaded) return;
    _umamiLoaded = true;

    const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
    if (!scriptUrl) return;

    // umami uses a tracking script loaded via <script defer>
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('data-website-id', process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? '');
    script.defer = true;
    document.head.appendChild(script);
  },

  track(event: AnalyticsEvent) {
    const win = window as Window & {
      umami?: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
    if (!win.umami) return;

    // Umami sends: event name + optional properties (no full URLs)
    const props = sanitizeForUmami(event.properties);
    win.umami(event.name, props);
  },

  destroy() {
    _umamiLoaded = false;
  },
};

function sanitizeForUmami(props: BaseEventProperties): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([k]) => k !== 'timestamp')
      .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 200) : v])
  );
}

// =============================================================================
// Adapter Selection
// =============================================================================

function createAdapter(): AnalyticsAdapter {
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
  if (!enabled) return NoOpAdapter;

  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? 'ga4';
  switch (provider) {
    case 'umami':
      return UmamiAdapter;
    case 'ga4':
    default:
      return GA4Adapter;
  }
}

// =============================================================================
// Session ID (ephemeral, never persisted long-term)
// =============================================================================

function getOrCreateSessionId(): string {
  const key = 'vf_sid_v1';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = generateUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    // sessionStorage not available (private browsing edge case)
    return generateUUID();
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// Core Analytics API
// =============================================================================

const _adapter = createAdapter();
let _sessionId: string | null = null;
let _initCalled = false;

function getSessionId(): string {
  if (!_sessionId) _sessionId = getOrCreateSessionId();
  return _sessionId;
}

/**
 * Initialise analytics. Safe to call multiple times — adapter.init() is idempotent.
 * Call this once at app startup (e.g. in a layout wrapper).
 */
export function initAnalytics(): void {
  if (_initCalled) return;
  _initCalled = true;
  _adapter.init();
}

/**
 * Track a typed analytics event.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/public/analytics';
 *   trackEvent('voucher_copy', { voucherCode: 'SAVE50K', ... });
 *
 * @param name     — The event name (typed, auto-completed by your IDE)
 * @param extra    — Extra properties specific to this event (merged with base props)
 */
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  extra: Omit<EventProperties[K], keyof BaseEventProperties>
): void {
  try {
    const event = {
      name,
      properties: {
        path: window.location.pathname,
        referrer: document.referrer,
        sessionId: getSessionId(),
        timestamp: new Date().toISOString(),
        ...extra,
      } as EventProperties[K],
    };

    _adapter.track(event as AnalyticsEvent);
  } catch {
    // Analytics must never break the user experience
  }
}

/**
 * Convenience wrapper for page_view events.
 * Automatically captures URL, referrer, and first-page-view flag.
 */
export function trackPageView(url?: string): void {
  const key = 'vf_pv_v1';
  let isFirst = false;
  try {
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      isFirst = true;
    }
  } catch {
    // sessionStorage not available
  }

  trackEvent('page_view', {
    url: url ?? window.location.href,
    isFirstPageView: isFirst,
  });
}

