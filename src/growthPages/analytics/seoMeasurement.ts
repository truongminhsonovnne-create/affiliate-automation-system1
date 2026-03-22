/**
 * SEO Measurement & Analytics Context
 *
 * Provides standardized analytics context for SEO pages:
 * - Page type classification
 * - Entity dimensions (tier, wave, indexability)
 * - SEO-to-tool funnel tracking
 *
 * This layer connects SEO scoring/policy with analytics.
 */

import { GrowthSurfaceType, type GrowthSurfaceEvent } from '../types/index.js';

// ============================================================================
// Page Type Classification
// ============================================================================

/**
 * Page classification for analytics/reporting
 */
export type SeoPageClassification =
  | 'seo_home'
  | 'seo_tool_explainer'
  | 'seo_category'
  | 'seo_shop'
  | 'seo_static_support';

/**
 * Get page classification from surface type
 */
export function getPageClassification(
  surfaceType: GrowthSurfaceType | 'homepage'
): SeoPageClassification {
  switch (surfaceType) {
    case 'homepage':
      return 'seo_home';
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return 'seo_tool_explainer';
    case GrowthSurfaceType.CATEGORY:
      return 'seo_category';
    case GrowthSurfaceType.SHOP:
      return 'seo_shop';
    default:
      return 'seo_static_support';
  }
}

// ============================================================================
// Entity Dimensions for Analytics
// ============================================================================

/**
 * SEO entity dimensions for analytics context
 */
export interface SeoEntityDimensions {
  pageType: SeoPageClassification;
  entityType?: 'shop' | 'category' | 'tool' | 'homepage';
  entitySlug?: string;
  entityName?: string;

  // SEO Quality Dimensions
  indexabilityState: 'renderable' | 'indexable' | 'priority-indexable' | 'noindex';
  priorityWave?: number;
  contentQualityBand?: 'high' | 'medium' | 'low';

  // Data Quality
  dataFreshness?: 'fresh' | 'stale' | 'unknown';
  hasVoucherData?: boolean;
  productCount?: number;
}

/**
 * Build entity dimensions from page data
 */
export function buildSeoEntityDimensions(params: {
  surfaceType: GrowthSurfaceType | 'homepage';
  slug?: string;
  name?: string;
  isIndexable?: boolean;
  isPriority?: boolean;
  wave?: number;
  qualityScore?: number;
  lastUpdated?: Date | null;
  hasVoucherData?: boolean;
  productCount?: number;
}): SeoEntityDimensions {
  const { surfaceType, slug, name, isIndexable, isPriority, wave, qualityScore, lastUpdated, hasVoucherData, productCount } = params;

  // Determine indexability state
  let indexabilityState: SeoEntityDimensions['indexabilityState'] = 'renderable';
  if (isPriority) {
    indexabilityState = 'priority-indexable';
  } else if (isIndexable) {
    indexabilityState = 'indexable';
  }

  // Determine content quality band
  let contentQualityBand: SeoEntityDimensions['contentQualityBand'] | undefined;
  if (qualityScore !== undefined) {
    if (qualityScore >= 70) {
      contentQualityBand = 'high';
    } else if (qualityScore >= 50) {
      contentQualityBand = 'medium';
    } else {
      contentQualityBand = 'low';
    }
  }

  // Determine data freshness
  let dataFreshness: SeoEntityDimensions['dataFreshness'] = 'unknown';
  if (lastUpdated) {
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 7) {
      dataFreshness = 'fresh';
    } else if (daysSinceUpdate > 30) {
      dataFreshness = 'stale';
    }
  }

  // Determine entity type
  let entityType: SeoEntityDimensions['entityType'];
  switch (surfaceType) {
    case GrowthSurfaceType.SHOP:
      entityType = 'shop';
      break;
    case GrowthSurfaceType.CATEGORY:
      entityType = 'category';
      break;
    case GrowthSurfaceType.TOOL_EXPLAINER:
      entityType = 'tool';
      break;
    case 'homepage':
      entityType = 'homepage';
      break;
    default:
      entityType = undefined;
  }

  return {
    pageType: getPageClassification(surfaceType),
    entityType,
    entitySlug: slug,
    entityName: name,
    indexabilityState,
    priorityWave: wave,
    contentQualityBand,
    dataFreshness,
    hasVoucherData,
    productCount,
  };
}

// ============================================================================
// Analytics Event Enhancement
// ============================================================================

/**
 * Extend base event with SEO dimensions
 * This adds SEO context to analytics events for better tracking
 */
export function enrichEventWithSeoDimensions(
  event: GrowthSurfaceEvent,
  seoDimensions: SeoEntityDimensions
): GrowthSurfaceEvent {
  return {
    ...event,
    metadata: {
      ...event.metadata,
      seo: seoDimensions,
    },
  };
}

// ============================================================================
// Funnel Tracking Types
// ============================================================================

/**
 * SEO-to-tool funnel steps
 */
export type SeoFunnelStep =
  | 'organic_landing'
  | 'cta_click'
  | 'tool_page_view'
  | 'link_submitted'
  | 'voucher_result'
  | 'voucher_copied';

/**
 * SEO funnel event
 */
export interface SeoFunnelEvent {
  step: SeoFunnelStep;
  pageClassification: SeoPageClassification;
  entityDimensions: SeoEntityDimensions;
  sessionId: string;
  timestamp: number;
  referrer?: string;
  url: string;
}

// ============================================================================
// Tracking Helpers
// ============================================================================

/**
 * Build SEO analytics context for a page
 */
export function buildSeoAnalyticsContext(params: {
  surfaceType: GrowthSurfaceType | 'homepage';
  slug?: string;
  name?: string;
  isIndexable?: boolean;
  isPriority?: boolean;
  wave?: number;
  qualityScore?: number;
  lastUpdated?: Date | null;
  hasVoucherData?: boolean;
  productCount?: number;
}): {
  classification: SeoPageClassification;
  dimensions: SeoEntityDimensions;
} {
  const dimensions = buildSeoEntityDimensions(params);

  return {
    classification: dimensions.pageType,
    dimensions,
  };
}

/**
 * Validate SEO dimensions are properly set
 */
export function validateSeoDimensions(
  dimensions: SeoEntityDimensions
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check required fields based on page type
  if (dimensions.pageType === 'seo_shop' || dimensions.pageType === 'seo_category') {
    if (!dimensions.entitySlug) {
      warnings.push('Missing entitySlug for shop/category page');
    }
    if (!dimensions.entityName) {
      warnings.push('Missing entityName for shop/category page');
    }
  }

  // Check indexability consistency
  if (dimensions.indexabilityState === 'priority-indexable' && !dimensions.priorityWave) {
    warnings.push('Priority-indexable but no wave specified');
  }

  // Check data quality for priority pages
  if (dimensions.indexabilityState === 'priority-indexable') {
    if (dimensions.contentQualityBand === 'low') {
      warnings.push('Priority-indexable but low quality band');
    }
    if (dimensions.dataFreshness === 'stale') {
      warnings.push('Priority-indexable but stale data');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ============================================================================
// Search Console Readiness Helpers
// ============================================================================

/**
 * URL pattern classification for Search Console
 */
export function classifyUrlForSearchConsole(url: string): {
  pageType: SeoPageClassification;
  entityType?: string;
  isDynamic: boolean;
} {
  const path = new URL(url).pathname;

  if (path === '/' || path === '') {
    return { pageType: 'seo_home', isDynamic: false };
  }

  if (path.startsWith('/shop/')) {
    return { pageType: 'seo_shop', entityType: 'shop', isDynamic: true };
  }

  if (path.startsWith('/category/')) {
    return { pageType: 'seo_category', entityType: 'category', isDynamic: true };
  }

  if (path.includes('-find-voucher') || path.includes('-checker') || path === '/how-it-works') {
    return { pageType: 'seo_tool_explainer', isDynamic: false };
  }

  return { pageType: 'seo_static_support', isDynamic: false };
}

/**
 * Sitemap priority mapping for Search Console analysis
 */
export function getSitemapPriorityForPageType(
  pageType: SeoPageClassification
): number {
  switch (pageType) {
    case 'seo_home':
      return 1.0;
    case 'seo_tool_explainer':
      return 0.9;
    case 'seo_category':
    case 'seo_shop':
      return 0.6;
    default:
      return 0.5;
  }
}
