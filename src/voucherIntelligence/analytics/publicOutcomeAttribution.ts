/**
 * Public Outcome Attribution
 *
 * Handles attribution between growth surfaces and resolution outcomes
 */

import {
  VoucherOutcomeAttributionContext,
  UTMParams,
} from '../types/index.js';

// ============================================================================
// Attribution Builders
// ============================================================================

/**
 * Build outcome attribution context
 */
export function buildOutcomeAttributionContext(params: {
  growthSurfaceType?: string;
  growthSurfaceSlug?: string;
  utmParams?: UTMParams;
  referrer?: string;
}): VoucherOutcomeAttributionContext {
  return {
    growthSurfaceType: params.growthSurfaceType,
    growthSurfaceSlug: params.growthSurfaceSlug,
    utmParams: params.utmParams,
    referrer: params.referrer,
  };
}

/**
 * Resolve growth surface to resolution attribution
 */
export function resolveGrowthSurfaceToResolutionAttribution(params: {
  growthSurfaceType: string;
  growthSurfaceSlug: string;
  utmParams?: UTMParams;
}): VoucherOutcomeAttributionContext {
  return {
    growthSurfaceType: params.growthSurfaceType,
    growthSurfaceSlug: params.growthSurfaceSlug,
    utmParams: params.utmParams,
  };
}

/**
 * Resolve resolution to conversion attribution
 */
export function resolveResolutionToConversionAttribution(params: {
  outcomeId: string;
  voucherId?: string;
  conversionType: 'copy' | 'open' | 'fallback';
}): {
  outcomeId: string;
  voucherId?: string;
  conversionType: string;
  timestamp: number;
} {
  return {
    outcomeId: params.outcomeId,
    voucherId: params.voucherId,
    conversionType: params.conversionType,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Attribution Helpers
// ============================================================================

/**
 * Parse UTM parameters from URL
 */
export function parseUtmParams(url: string): UTMParams | undefined {
  try {
    const urlObj = new URL(url);
    const utmSource = urlObj.searchParams.get('utm_source');
    const utmMedium = urlObj.searchParams.get('utm_medium');
    const utmCampaign = urlObj.searchParams.get('utm_campaign');
    const utmContent = urlObj.searchParams.get('utm_content');
    const utmTerm = urlObj.searchParams.get('utm_term');

    if (!utmSource && !utmMedium && !utmCampaign) {
      return undefined;
    }

    return {
      source: utmSource || undefined,
      medium: utmMedium || undefined,
      campaign: utmCampaign || undefined,
      content: utmContent || undefined,
      term: utmTerm || undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Determine attribution source from referrer
 */
export function determineAttributionSource(referrer: string): {
  source: string;
  medium: string;
} | null {
  if (!referrer) return null;

  try {
    const url = new URL(referrer);
    const hostname = url.hostname;

    // Internal referrer
    if (hostname.includes('affiliate-automation')) {
      return { source: 'internal', medium: 'referral' };
    }

    // Search
    if (hostname.includes('google') || hostname.includes('bing') || hostname.includes('yahoo')) {
      return { source: 'search', medium: 'organic' };
    }

    // Social
    if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('instagram')) {
      return { source: 'social', medium: 'social' };
    }

    return { source: hostname, medium: 'referral' };
  } catch {
    return null;
  }
}

/**
 * Check if attribution is valid
 */
export function isAttributionValid(
  context: VoucherOutcomeAttributionContext,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  // Attribution is valid if we have surface information
  return !!context.growthSurfaceType;
}
