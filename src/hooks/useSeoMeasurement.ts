/**
 * SEO Measurement Hook
 *
 * React hook for integrating SEO measurement with page components.
 * This connects the SEO measurement layer with analytics tracking.
 */

'use client';

import { useEffect, useMemo } from 'react';
import {
  buildSeoAnalyticsContext,
  type SeoEntityDimensions,
  type SeoPageClassification,
} from '../growthPages/analytics/seoMeasurement';
import { GrowthSurfaceType } from '../growthPages/types';

/**
 * Hook options for SEO measurement
 */
export interface UseSeoMeasurementOptions {
  /** Surface type of the page */
  surfaceType: GrowthSurfaceType | 'homepage';
  /** URL slug for the entity */
  slug?: string;
  /** Human-readable name for the entity */
  name?: string;
  /** Whether this page is indexable */
  isIndexable?: boolean;
  /** Whether this page is in priority wave */
  isPriority?: boolean;
  /** Priority wave number */
  wave?: number;
  /** Content quality score (0-100) */
  qualityScore?: number;
  /** Last data update timestamp */
  lastUpdated?: Date | null;
  /** Whether entity has voucher data */
  hasVoucherData?: boolean;
  /** Number of products in entity */
  productCount?: number;
  /** Whether to enable automatic page view tracking */
  trackPageView?: boolean;
  /** Custom dimensions to merge */
  customDimensions?: Record<string, unknown>;
}

/**
 * SEO measurement result
 */
export interface UseSeoMeasurementResult {
  /** Page classification */
  classification: SeoPageClassification;
  /** Full entity dimensions */
  dimensions: SeoEntityDimensions;
  /** JSON string for data-layer */
  dataLayerValue: string;
  /** GTM dimensions ready for push */
  gtmDimensions: Record<string, unknown>;
}

/**
 * Hook for integrating SEO measurement into pages
 *
 * @example
 * ```tsx
 * const { classification, dimensions, dataLayerValue } = useSeoMeasurement({
 *   surfaceType: GrowthSurfaceType.SHOP,
 *   slug: 'shopee',
 *   name: 'Shopee',
 *   isIndexable: true,
 *   isPriority: true,
 *   wave: 1,
 *   qualityScore: 85,
 *   hasVoucherData: true,
 *   productCount: 500,
 * });
 * ```
 */
export function useSeoMeasurement(options: UseSeoMeasurementOptions): UseSeoMeasurementResult {
  const {
    surfaceType,
    slug,
    name,
    isIndexable,
    isPriority,
    wave,
    qualityScore,
    lastUpdated,
    hasVoucherData,
    productCount,
    trackPageView = false,
    customDimensions = {},
  } = options;

  // Build analytics context
  const { classification, dimensions } = useMemo(() => {
    return buildSeoAnalyticsContext({
      surfaceType,
      slug,
      name,
      isIndexable,
      isPriority,
      wave,
      qualityScore,
      lastUpdated,
      hasVoucherData,
      productCount,
    });
  }, [
    surfaceType,
    slug,
    name,
    isIndexable,
    isPriority,
    wave,
    qualityScore,
    lastUpdated,
    hasVoucherData,
    productCount,
  ]);

  // Build data layer value
  const dataLayerValue = useMemo(() => {
    return JSON.stringify({
      ...dimensions,
      ...customDimensions,
    });
  }, [dimensions, customDimensions]);

  // Build GTM dimensions
  const gtmDimensions = useMemo(() => {
    return {
      page_type: classification,
      entity_type: dimensions.entityType,
      entity_slug: dimensions.entitySlug,
      indexability_state: dimensions.indexabilityState,
      priority_wave: dimensions.priorityWave,
      content_quality_band: dimensions.contentQualityBand,
      data_freshness: dimensions.dataFreshness,
      has_voucher_data: dimensions.hasVoucherData,
      product_count: dimensions.productCount,
      ...customDimensions,
    };
  }, [classification, dimensions, customDimensions]);

  // Optional: Track page view automatically
  useEffect(() => {
    if (trackPageView && typeof window !== 'undefined') {
      // Push to dataLayer for GTM
      const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
      dataLayer.push({
        event: 'seo_page_view',
        ...gtmDimensions,
      });
    }
  }, [trackPageView, gtmDimensions]);

  return {
    classification,
    dimensions,
    dataLayerValue,
    gtmDimensions,
  };
}

/**
 * Helper to create SEO measurement context from page props
 * Use this in getStaticProps or page components
 *
 * @example
 * ```ts
 * // In a shop page component
 * const seoContext = createSeoMeasurementContext({
 *   surfaceType: GrowthSurfaceType.SHOP,
 *   shopData: shopData, // from props
 *   scoringResult: scoringResult, // from SEO scoring
 * });
 * ```
 */
export interface CreateSeoMeasurementContextOptions {
  surfaceType: GrowthSurfaceType | 'homepage';
  /** Entity data from data service */
  entityData?: {
    slug?: string;
    name?: string;
    productCount?: number;
    category?: string;
    lastUpdated?: Date | null;
  };
  /** SEO scoring result */
  scoringResult?: {
    totalScore: number;
    tier: 'priority' | 'indexable' | 'renderable';
    wave?: number;
  };
  /** Voucher data availability */
  hasVoucherData?: boolean;
}

export function createSeoMeasurementContext(
  options: CreateSeoMeasurementContextOptions
): UseSeoMeasurementOptions {
  const { surfaceType, entityData, scoringResult, hasVoucherData } = options;

  const isIndexable = scoringResult
    ? scoringResult.tier !== 'renderable'
    : undefined;

  const isPriority = scoringResult
    ? scoringResult.tier === 'priority'
    : undefined;

  return {
    surfaceType,
    slug: entityData?.slug,
    name: entityData?.name,
    isIndexable,
    isPriority,
    wave: scoringResult?.wave,
    qualityScore: scoringResult?.totalScore,
    lastUpdated: entityData?.lastUpdated,
    hasVoucherData,
    productCount: entityData?.productCount,
  };
}

/**
 * Server-side helper to generate SEO measurement metadata
 * Can be used in generateMetadata
 */
export function getSeoMeasurementMetadata(options: UseSeoMeasurementOptions) {
  const { classification, dimensions } = buildSeoAnalyticsContext(options);

  return {
    classification,
    dimensions,
    // Useful for debugging
    _debug: {
      indexabilityState: dimensions.indexabilityState,
      contentQualityBand: dimensions.contentQualityBand,
      dataFreshness: dimensions.dataFreshness,
    },
  };
}
