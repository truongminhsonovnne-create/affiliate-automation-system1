/**
 * Growth Surface Analytics
 *
 * Analytics tracking for growth surfaces
 * - Page view tracking
 * - CTA click tracking
 * - Attribution support
 */

import type {
  GrowthSurfaceEvent,
  GrowthSurfaceViewEvent,
  GrowthSurfaceCtaClickEvent,
  GrowthSurfaceType,
  SurfaceCtaType,
  UTMParams,
} from '../types/index.js';
import { ANALYTICS_CONFIG } from '../constants/index.js';

// ============================================================================
// Event Types
// ============================================================================

export type GrowthSurfaceAnalyticsEvent =
  | GrowthSurfaceViewEvent
  | GrowthSurfaceCtaClickEvent
  | GrowthSurfaceRelatedClickEvent
  | GrowthSurfaceConversionEvent;

export interface GrowthSurfaceRelatedClickEvent extends GrowthSurfaceEvent {
  eventType: 'related_clicked';
  targetSurfaceType: GrowthSurfaceType;
  targetSlug: string;
}

export interface GrowthSurfaceConversionEvent extends GrowthSurfaceEvent {
  eventType: 'surface_to_tool_conversion';
  conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied';
  conversionUrl: string;
}

// ============================================================================
// Analytics Service Interface
// ============================================================================

export interface GrowthSurfaceAnalyticsService {
  track(event: GrowthSurfaceAnalyticsEvent): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(params: GrowthSurfacePageViewParams): void;
}

export interface GrowthSurfacePageViewParams {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  path: string;
  referrer?: string;
  utmParams?: UTMParams;
}

// ============================================================================
// Event Builders
// ============================================================================

/**
 * Build surface view event
 */
export function buildSurfaceViewEvent(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  path: string;
  referrer?: string;
  utmParams?: UTMParams;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceViewEvent {
  return {
    eventType: 'surface_viewed',
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    path: params.path,
    referrer: params.referrer,
    utmParams: params.utmParams,
    timestamp: Date.now(),
    sessionId: params.sessionId,
    userId: params.userId,
  };
}

/**
 * Build CTA click event
 */
export function buildSurfaceCtaClickEvent(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  ctaType: SurfaceCtaType;
  ctaUrl: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceCtaClickEvent {
  return {
    eventType: 'surface_cta_clicked',
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    ctaType: params.ctaType,
    ctaUrl: params.ctaUrl,
    timestamp: Date.now(),
    sessionId: params.sessionId,
    userId: params.userId,
  };
}

/**
 * Build related surface click event
 */
export function buildRelatedSurfaceClickEvent(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  targetSurfaceType: GrowthSurfaceType;
  targetSlug: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceRelatedClickEvent {
  return {
    eventType: 'related_clicked',
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    targetSurfaceType: params.targetSurfaceType,
    targetSlug: params.targetSlug,
    timestamp: Date.now(),
    sessionId: params.sessionId,
    userId: params.userId,
  };
}

/**
 * Build surface to tool conversion event
 */
export function buildSurfaceToToolConversionEvent(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied';
  conversionUrl: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceConversionEvent {
  return {
    eventType: 'surface_to_tool_conversion',
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    conversionType: params.conversionType,
    conversionUrl: params.conversionUrl,
    timestamp: Date.now(),
    sessionId: params.sessionId,
    userId: params.userId,
  };
}

// ============================================================================
// Tracking Functions
// ============================================================================

/**
 * Track growth surface viewed
 */
export function trackGrowthSurfaceViewed(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  path: string;
  referrer?: string;
  utmParams?: UTMParams;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceViewEvent {
  const event = buildSurfaceViewEvent(params);

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] Surface viewed:', event);

  return event;
}

/**
 * Track growth surface CTA clicked
 */
export function trackGrowthSurfaceCtaClicked(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  ctaType: SurfaceCtaType;
  ctaUrl: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceCtaClickEvent {
  const event = buildSurfaceCtaClickEvent(params);

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] CTA clicked:', event);

  return event;
}

/**
 * Track related surface clicked
 */
export function trackRelatedSurfaceClicked(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  targetSurfaceType: GrowthSurfaceType;
  targetSlug: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceRelatedClickEvent {
  const event = buildRelatedSurfaceClickEvent(params);

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] Related surface clicked:', event);

  return event;
}

/**
 * Track paste link started from growth surface
 */
export function trackPasteLinkStartedFromGrowthSurface(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceConversionEvent {
  const event = buildSurfaceToToolConversionEvent({
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    conversionType: 'paste_link_started',
    conversionUrl: '/paste-link-find-voucher',
    sessionId: params.sessionId,
    userId: params.userId,
  });

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] Paste link started:', event);

  return event;
}

/**
 * Track voucher checked from growth surface
 */
export function trackVoucherCheckedFromGrowthSurface(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceConversionEvent {
  const event = buildSurfaceToToolConversionEvent({
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    conversionType: 'voucher_checked',
    conversionUrl: '/voucher-checker',
    sessionId: params.sessionId,
    userId: params.userId,
  });

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] Voucher checked:', event);

  return event;
}

/**
 * Track voucher copied from growth surface
 */
export function trackVoucherCopiedFromGrowthSurface(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  sessionId: string;
  userId?: string;
}): GrowthSurfaceConversionEvent {
  const event = buildSurfaceToToolConversionEvent({
    surfaceType: params.surfaceType,
    surfaceSlug: params.surfaceSlug,
    conversionType: 'voucher_copied',
    conversionUrl: '/voucher-checker',
    sessionId: params.sessionId,
    userId: params.userId,
  });

  // In production, this would send to analytics service
  // analytics.track(event);

  console.log('[GrowthAnalytics] Voucher copied:', event);

  return event;
}

// ============================================================================
// Analytics Client (Production Implementation)
// ============================================================================

/**
 * Create analytics client for growth surfaces
 */
export function createGrowthSurfaceAnalyticsClient(
  analyticsService: GrowthSurfaceAnalyticsService
) {
  return {
    trackSurfaceViewed: (params: Omit<Parameters<typeof trackGrowthSurfaceViewed>[0], 'sessionId' | 'userId'> & { sessionId: string; userId?: string }) => {
      const event = trackGrowthSurfaceViewed(params);
      analyticsService.track(event);
      return event;
    },

    trackCtaClicked: (params: Omit<Parameters<typeof trackGrowthSurfaceCtaClicked>[0], 'sessionId' | 'userId'> & { sessionId: string; userId?: string }) => {
      const event = trackGrowthSurfaceCtaClickEvent(params);
      analyticsService.track(event);
      return event;
    },

    trackRelatedClicked: (params: Omit<Parameters<typeof trackRelatedSurfaceClicked>[0], 'sessionId' | 'userId'> & { sessionId: string; userId?: string }) => {
      const event = trackRelatedSurfaceClicked(params);
      analyticsService.track(event);
      return event;
    },

    trackConversion: (params: Omit<Parameters<typeof trackPasteLinkStartedFromGrowthSurface>[0], 'sessionId' | 'userId'> & { sessionId: string; userId?: string; conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied' }) => {
      let event: GrowthSurfaceConversionEvent;

      switch (params.conversionType) {
        case 'paste_link_started':
          event = trackPasteLinkStartedFromGrowthSurface(params as Parameters<typeof trackPasteLinkStartedFromGrowthSurface>[0]);
          break;
        case 'voucher_checked':
          event = trackVoucherCheckedFromGrowthSurface(params as Parameters<typeof trackVoucherCheckedFromGrowthSurface>[0]);
          break;
        case 'voucher_copied':
          event = trackVoucherCopiedFromGrowthSurface(params as Parameters<typeof trackVoucherCopiedFromGrowthSurface>[0]);
          break;
      }

      analyticsService.track(event);
      return event;
    },
  };
}
