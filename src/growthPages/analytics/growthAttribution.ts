/**
 * Growth Attribution
 *
 * Attribution model for tracking user journey from growth surfaces to tool flow
 * - Know which surface users come from
 * - Track if they return to paste-link flow
 * - Don't over-collect data
 */

import type {
  GrowthAttributionContext,
  SurfaceToToolConversion,
  GrowthSurfaceType,
  UTMParams,
} from '../types/index.js';
import { ANALYTICS_CONFIG } from '../constants/index.js';

// ============================================================================
// Attribution Context
// ============================================================================

/**
 * Build growth attribution context from request
 */
export function buildGrowthAttributionContext(params: {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  referrer?: string;
  utmParams?: UTMParams;
}): GrowthAttributionContext {
  return {
    entrySurface: params.surfaceType,
    entrySlug: params.surfaceSlug,
    entryTimestamp: Date.now(),
    clickTimestamp: undefined,
    conversionTimestamp: undefined,
    hasConverted: false,
  };
}

/**
 * Update attribution context with click timestamp
 */
export function recordAttributionClick(
  context: GrowthAttributionContext
): GrowthAttributionContext {
  return {
    ...context,
    clickTimestamp: Date.now(),
  };
}

/**
 * Mark conversion in attribution context
 */
export function recordAttributionConversion(
  context: GrowthAttributionContext
): GrowthAttributionContext {
  return {
    ...context,
    conversionTimestamp: Date.now(),
    hasConverted: true,
  };
}

// ============================================================================
// Attribution Storage (Simplified - use cookies/localStorage in production)
// ============================================================================

const attributionStorage = new Map<string, GrowthAttributionContext>();

/**
 * Store attribution context
 */
export function storeAttributionContext(
  sessionId: string,
  context: GrowthAttributionContext
): void {
  attributionStorage.set(sessionId, context);
}

/**
 * Get attribution context
 */
export function getAttributionContext(
  sessionId: string
): GrowthAttributionContext | undefined {
  return attributionStorage.get(sessionId);
}

/**
 * Clear attribution context
 */
export function clearAttributionContext(sessionId: string): void {
  attributionStorage.delete(sessionId);
}

// ============================================================================
// Attribution Window Check
// ============================================================================

/**
 * Check if attribution is still valid (within window)
 */
export function isAttributionValid(context: GrowthAttributionContext): boolean {
  const now = Date.now();
  const windowMs = ANALYTICS_CONFIG.ATTRIBUTION_WINDOW_MS;

  // Check if entry is within attribution window
  const timeSinceEntry = now - context.entryTimestamp;
  return timeSinceEntry <= windowMs;
}

/**
 * Check if user has converted within attribution window
 */
export function hasConvertedWithinWindow(context: GrowthAttributionContext): boolean {
  if (!context.conversionTimestamp) {
    return false;
  }

  const now = Date.now();
  const windowMs = ANALYTICS_CONFIG.ATTRIBUTION_WINDOW_MS;
  const timeSinceConversion = now - context.conversionTimestamp;

  return timeSinceConversion <= windowMs;
}

// ============================================================================
// Surface to Tool Attribution
// ============================================================================

/**
 * Build surface to tool conversion record
 */
export function buildSurfaceToToolAttribution(
  context: GrowthAttributionContext,
  conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied'
): SurfaceToToolConversion | null {
  // Check if attribution is valid
  if (!isAttributionValid(context)) {
    return null;
  }

  const conversion: SurfaceToToolConversion = {
    surfaceType: context.entrySurface,
    surfaceSlug: context.entrySlug,
    entryTime: context.entryTimestamp,
    ctaClickTime: context.clickTimestamp,
    toolUseTime: context.conversionTimestamp,
    isAttributed: context.hasConverted && context.conversionTimestamp !== undefined,
  };

  return conversion;
}

/**
 * Record surface to tool conversion
 */
export function recordGrowthSurfaceAttribution(params: {
  sessionId: string;
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  conversionType: 'paste_link_started' | 'voucher_checked' | 'voucher_copied';
}): {
  attribution: SurfaceToToolConversion | null;
  attributed: boolean;
} {
  const context = getAttributionContext(params.sessionId);

  if (!context) {
    return {
      attribution: null,
      attributed: false,
    };
  }

  // Verify this is the same surface
  if (context.entrySurface !== params.surfaceType || context.entrySlug !== params.surfaceSlug) {
    return {
      attribution: null,
      attributed: false,
    };
  }

  // Check if within attribution window
  if (!isAttributionValid(context)) {
    return {
      attribution: null,
      attributed: false,
    };
  }

  // Record conversion
  const updatedContext = recordAttributionConversion(context);
  storeAttributionContext(params.sessionId, updatedContext);

  const attribution = buildSurfaceToToolAttribution(updatedContext, params.conversionType);

  return {
    attribution,
    attributed: attribution?.isAttributed || false,
  };
}

// ============================================================================
// URL Attribution Parameters
// ============================================================================

/**
 * Build attribution URL parameters
 */
export function buildAttributionParams(
  context: GrowthAttributionContext
): Record<string, string> {
  return {
    at_surface: context.entrySurface,
    at_slug: context.entrySlug,
    at_time: context.entryTimestamp.toString(),
  };
}

/**
 * Parse attribution from URL
 */
export function parseAttributionFromUrl(url: string): Partial<GrowthAttributionContext> | null {
  try {
    const urlObj = new URL(url);
    const surface = urlObj.searchParams.get('at_surface');
    const slug = urlObj.searchParams.get('at_slug');
    const time = urlObj.searchParams.get('at_time');

    if (!surface || !slug || !time) {
      return null;
    }

    return {
      entrySurface: surface as GrowthSurfaceType,
      entrySlug: slug,
      entryTimestamp: parseInt(time, 10),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Cookie-based Attribution (for client-side)
// ============================================================================

const ATTRIBUTION_COOKIE_NAME = 'grwth_at';

/**
 * Set attribution cookie
 */
export function setAttributionCookie(context: GrowthAttributionContext): string {
  const value = JSON.stringify(context);

  // In production, set actual cookie with appropriate expiry
  // document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=${24 * 60 * 60}`;

  return value;
}

/**
 * Get attribution cookie
 */
export function getAttributionCookie(): GrowthAttributionContext | null {
  // In production, read from document.cookie
  // const match = document.cookie.match(new RegExp(`(^| )${ATTRIBUTION_COOKIE_NAME}=([^;]+)`));
  // if (match) { return JSON.parse(decodeURIComponent(match[2])); }

  return null;
}

// ============================================================================
// Attribution Reporting
// ============================================================================

/**
 * Attribution report for a surface
 */
export interface AttributionReport {
  surfaceType: GrowthSurfaceType;
  surfaceSlug: string;
  totalSessions: number;
  clickedSessions: number;
  convertedSessions: number;
  conversionRate: number;
  avgTimeToConversion: number;
}

/**
 * Generate attribution report (simplified)
 */
export function generateAttributionReport(
  surfaceType: GrowthSurfaceType,
  surfaceSlug: string
): AttributionReport {
  // In production, this would aggregate from analytics data
  const sessions = Array.from(attributionStorage.entries())
    .filter(([, ctx]) => ctx.entrySurface === surfaceType && ctx.entrySlug === surfaceSlug);

  const clickedSessions = sessions.filter(([, ctx]) => ctx.clickTimestamp !== undefined);
  const convertedSessions = sessions.filter(([, ctx]) => ctx.hasConverted);

  const totalSessions = sessions.length;
  const conversionRate = totalSessions > 0 ? convertedSessions.length / totalSessions : 0;

  const avgTimeToConversion = convertedSessions.length > 0
    ? convertedSessions.reduce((sum, [, ctx]) => {
        if (ctx.conversionTimestamp && ctx.entryTimestamp) {
          return sum + (ctx.conversionTimestamp - ctx.entryTimestamp);
        }
        return sum;
      }, 0) / convertedSessions.length
    : 0;

  return {
    surfaceType,
    surfaceSlug,
    totalSessions,
    clickedSessions: clickedSessions.length,
    convertedSessions: convertedSessions.length,
    conversionRate,
    avgTimeToConversion,
  };
}
