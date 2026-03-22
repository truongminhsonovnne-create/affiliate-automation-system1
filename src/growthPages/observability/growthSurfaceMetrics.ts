/**
 * Growth Surface Metrics
 *
 * Metrics collection for growth surfaces
 * - Page view counts
 * - CTA click-through
 * - Surface-to-tool conversion
 * - Bounce-like signals
 */

import type { GrowthSurfaceType, SurfaceCtaType } from '../types/index.js';

// ============================================================================
// Metric Types
// ============================================================================

export interface GrowthSurfaceMetrics {
  surfaceType: GrowthSurfaceType;
  slug: string;
  views: number;
  uniqueViews: number;
  ctaClicks: Record<SurfaceCtaType, number>;
  conversions: number;
  bounces: number;
  avgTimeOnPage: number;
}

// ============================================================================
// In-Memory Metrics Store
// ============================================================================

const metricsStore = new Map<string, GrowthSurfaceMetrics>();

// ============================================================================
// Metrics Functions
// ============================================================================

/**
 * Get or create metrics for a surface
 */
function getOrCreateMetrics(surfaceType: GrowthSurfaceType, slug: string): GrowthSurfaceMetrics {
  const key = `${surfaceType}:${slug}`;

  if (!metricsStore.has(key)) {
    metricsStore.set(key, {
      surfaceType,
      slug,
      views: 0,
      uniqueViews: 0,
      ctaClicks: {
        [SurfaceCtaType.PASTE_LINK]: 0,
        [SurfaceCtaType.RESOLVE_VOUCHER]: 0,
        [SurfaceCtaType.COPY_VOUCHER]: 0,
        [SurfaceCtaType.OPEN_SHOPEE]: 0,
        [SurfaceCtaType.BROWSE_CATEGORY]: 0,
        [SurfaceCtaType.VIEW_SHOP]: 0,
      },
      conversions: 0,
      bounces: 0,
      avgTimeOnPage: 0,
    });
  }

  return metricsStore.get(key)!;
}

/**
 * Record a page view
 */
export function recordPageView(
  surfaceType: GrowthSurfaceType,
  slug: string,
  isUnique: boolean = false
): void {
  const metrics = getOrCreateMetrics(surfaceType, slug);
  metrics.views += 1;
  if (isUnique) {
    metrics.uniqueViews += 1;
  }
}

/**
 * Record a CTA click
 */
export function recordCtaClick(
  surfaceType: GrowthSurfaceType,
  slug: string,
  ctaType: SurfaceCtaType
): void {
  const metrics = getOrCreateMetrics(surfaceType, slug);
  metrics.ctaClicks[ctaType] = (metrics.ctaClicks[ctaType] || 0) + 1;
}

/**
 * Record a conversion
 */
export function recordConversion(
  surfaceType: GrowthSurfaceType,
  slug: string
): void {
  const metrics = getOrCreateMetrics(surfaceType, slug);
  metrics.conversions += 1;
}

/**
 * Record a bounce (quick exit)
 */
export function recordBounce(
  surfaceType: GrowthSurfaceType,
  slug: string
): void {
  const metrics = getOrCreateMetrics(surfaceType, slug);
  metrics.bounces += 1;
}

/**
 * Update average time on page
 */
export function updateAvgTimeOnPage(
  surfaceType: GrowthSurfaceType,
  slug: string,
  timeSpent: number
): void {
  const metrics = getOrCreateMetrics(surfaceType, slug);

  // Running average calculation
  const currentTotal = metrics.avgTimeOnPage * (metrics.views - 1);
  metrics.avgTimeOnPage = (currentTotal + timeSpent) / metrics.views;
}

// ============================================================================
// Metrics Retrieval
// ============================================================================

/**
 * Get metrics for a surface
 */
export function getMetrics(
  surfaceType: GrowthSurfaceType,
  slug: string
): GrowthSurfaceMetrics | null {
  const key = `${surfaceType}:${slug}`;
  return metricsStore.get(key) || null;
}

/**
 * Get all metrics
 */
export function getAllMetrics(): GrowthSurfaceMetrics[] {
  return Array.from(metricsStore.values());
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(): {
  totalSurfaces: number;
  totalViews: number;
  totalCtaClicks: number;
  totalConversions: number;
  totalBounces: number;
} {
  let totalViews = 0;
  let totalCtaClicks = 0;
  let totalConversions = 0;
  let totalBounces = 0;

  for (const metrics of metricsStore.values()) {
    totalViews += metrics.views;
    totalConversions += metrics.conversions;
    totalBounces += metrics.bounces;

    for (const count of Object.values(metrics.ctaClicks)) {
      totalCtaClicks += count;
    }
  }

  return {
    totalSurfaces: metricsStore.size,
    totalViews,
    totalCtaClicks,
    totalConversions,
    totalBounces,
  };
}

// ============================================================================
// Derived Metrics
// ============================================================================

/**
 * Calculate click-through rate
 */
export function calculateCtr(
  surfaceType: GrowthSurfaceType,
  slug: string
): number {
  const metrics = getMetrics(surfaceType, slug);
  if (!metrics || metrics.views === 0) return 0;

  const totalCtaClicks = Object.values(metrics.ctaClicks).reduce((a, b) => a + b, 0);
  return totalCtaClicks / metrics.views;
}

/**
 * Calculate conversion rate
 */
export function calculateConversionRate(
  surfaceType: GrowthSurfaceType,
  slug: string
): number {
  const metrics = getMetrics(surfaceType, slug);
  if (!metrics || metrics.views === 0) return 0;

  return metrics.conversions / metrics.views;
}

/**
 * Calculate bounce rate
 */
export function calculateBounceRate(
  surfaceType: GrowthSurfaceType,
  slug: string
): number {
  const metrics = getMetrics(surfaceType, slug);
  if (!metrics || metrics.views === 0) return 0;

  return metrics.bounces / metrics.views;
}

// ============================================================================
// Alerting
// ============================================================================

/**
 * Check for stale page warnings
 */
export function checkStalePageWarnings(): Array<{
  surfaceType: GrowthSurfaceType;
  slug: string;
  warning: string;
}> {
  const warnings: Array<{
    surfaceType: GrowthSurfaceType;
    slug: string;
    warning: string;
  }> = [];

  for (const metrics of metricsStore.values()) {
    // Check for high bounce rate
    const bounceRate = calculateBounceRate(metrics.surfaceType, metrics.slug);
    if (bounceRate > 0.7) {
      warnings.push({
        surfaceType: metrics.surfaceType,
        slug: metrics.slug,
        warning: `High bounce rate: ${(bounceRate * 100).toFixed(1)}%`,
      });
    }

    // Check for low CTR
    const ctr = calculateCtr(metrics.surfaceType, metrics.slug);
    if (ctr < 0.05 && metrics.views > 100) {
      warnings.push({
        surfaceType: metrics.surfaceType,
        slug: metrics.slug,
        warning: `Low CTA click-through rate: ${(ctr * 100).toFixed(1)}%`,
      });
    }

    // Check for no conversions
    if (metrics.conversions === 0 && metrics.views > 500) {
      warnings.push({
        surfaceType: metrics.surfaceType,
        slug: metrics.slug,
        warning: 'No conversions recorded despite significant traffic',
      });
    }
  }

  return warnings;
}

// ============================================================================
// Reset
// ============================================================================

/**
 * Reset metrics for a surface
 */
export function resetMetrics(surfaceType: GrowthSurfaceType, slug: string): void {
  const key = `${surfaceType}:${slug}`;
  metricsStore.delete(key);
}

/**
 * Reset all metrics
 */
export function resetAllMetrics(): void {
  metricsStore.clear();
}
