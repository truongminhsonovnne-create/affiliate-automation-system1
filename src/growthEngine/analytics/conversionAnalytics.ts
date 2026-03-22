/**
 * Conversion Analytics
 *
 * Tracks tool conversion metrics and ROI for governance decisions.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceMetricAggregate,
} from '../types';

export interface ConversionMetrics {
  toolCtaClicks: number;
  toolEntryConversions: number;
  ctaClickRate: number;
  conversionRate: number;
  revenue?: number;
  leads?: number;
}

export interface ConversionSummary {
  surfaceId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: ConversionMetrics;
  attribution: AttributionInfo[];
  roi?: number;
}

export interface AttributionInfo {
  surfaceId: string;
  surfaceType: string;
  routeKey: string;
  conversions: number;
  revenue?: number;
  contribution: number; // 0-1
}

export interface ConversionPortfolioSummary {
  totalCtaClicks: number;
  totalConversions: number;
  avgConversionRate: number;
  topConvertingSurfaces: ConversionSummary[];
  surfacesNeedingOptimization: ConversionSummary[];
  totalRevenue?: number;
  generatedAt: Date;
}

/**
 * Get conversion metrics for a surface
 */
export async function getSurfaceConversionMetrics(
  surfaceId: string,
  startDate: Date,
  endDate: Date
): Promise<ConversionSummary | null> {
  const metrics = await getConversionMetricsFromStore(surfaceId, startDate, endDate);

  if (!metrics) {
    return null;
  }

  // Calculate rates
  const ctaClickRate = metrics.pageViews > 0
    ? metrics.toolCtaClicks / metrics.pageViews
    : 0;
  const conversionRate = metrics.pageViews > 0
    ? metrics.toolEntryConversions / metrics.pageViews
    : 0;

  const fullMetrics: ConversionMetrics = {
    toolCtaClicks: metrics.toolCtaClicks,
    toolEntryConversions: metrics.toolEntryConversions,
    ctaClickRate,
    conversionRate,
  };

  return {
    surfaceId,
    periodStart: startDate,
    periodEnd: endDate,
    metrics: fullMetrics,
    attribution: [],
  };
}

/**
 * Get portfolio-wide conversion summary
 */
export async function getPortfolioConversionSummary(
  surfaces: GrowthSurfaceInventoryRecord[],
  startDate: Date,
  endDate: Date
): Promise<ConversionPortfolioSummary> {
  const summaries: ConversionSummary[] = [];

  for (const surface of surfaces) {
    const summary = await getSurfaceConversionMetrics(surface.id, startDate, endDate);
    if (summary) {
      summaries.push(summary);
    }
  }

  // Calculate totals
  const totalCtaClicks = summaries.reduce((sum, s) => sum + s.metrics.toolCtaClicks, 0);
  const totalConversions = summaries.reduce((sum, s) => sum + s.metrics.toolEntryConversions, 0);
  const avgConversionRate = summaries.length > 0
    ? summaries.reduce((sum, s) => sum + s.metrics.conversionRate, 0) / summaries.length
    : 0;

  // Get top converters
  const sortedByConversions = [...summaries].sort(
    (a, b) => b.metrics.toolEntryConversions - a.metrics.toolEntryConversions
  );
  const topConvertingSurfaces = sortedByConversions.slice(0, 10);

  // Get surfaces needing optimization (high clicks, low conversions)
  const surfacesNeedingOptimization = summaries
    .filter(s => s.metrics.toolCtaClicks > 50 && s.metrics.conversionRate < 0.02)
    .sort((a, b) => a.metrics.conversionRate - b.metrics.conversionRate)
    .slice(0, 10);

  return {
    totalCtaClicks,
    totalConversions,
    avgConversionRate,
    topConvertingSurfaces,
    surfacesNeedingOptimization,
    generatedAt: new Date(),
  };
}

/**
 * Track a conversion event
 */
export async function trackConversionEvent(
  surfaceId: string,
  eventType: 'cta_click' | 'tool_entry' | 'conversion',
  eventData: Record<string, unknown>
): Promise<void> {
  // In production, this would write to the metrics table
  console.log(`Conversion event: ${eventType} for surface ${surfaceId}`, eventData);
}

/**
 * Calculate conversion ROI for a surface
 */
export function calculateConversionRoi(
  summary: ConversionSummary,
  revenuePerConversion: number,
  costPerClick?: number
): number {
  const revenue = summary.metrics.toolEntryConversions * revenuePerConversion;
  const clicks = summary.metrics.toolCtaClicks;
  const cost = costPerClick ? clicks * costPerClick : 0;

  if (cost === 0) {
    return revenue > 0 ? Infinity : 0;
  }

  return (revenue - cost) / cost;
}

/**
 * Identify surfaces contributing to conversions (attribution)
 */
export async function analyzeConversionAttribution(
  targetSurfaceId: string,
  surfaces: GrowthSurfaceInventoryRecord[],
  startDate: Date,
  endDate: Date
): Promise<AttributionInfo[]> {
  // Get conversion data for all surfaces
  const attribution: AttributionInfo[] = [];

  for (const surface of surfaces) {
    const metrics = await getConversionMetricsFromStore(surface.id, startDate, endDate);

    if (metrics && metrics.toolEntryConversions > 0) {
      attribution.push({
        surfaceId: surface.id,
        surfaceType: surface.surfaceType,
        routeKey: surface.routeKey,
        conversions: metrics.toolEntryConversions,
        contribution: 0, // Would calculate based on touchpoints
      });
    }
  }

  // Calculate contribution percentages
  const total = attribution.reduce((sum, a) => sum + a.conversions, 0);
  for (const a of attribution) {
    a.contribution = total > 0 ? a.conversions / total : 0;
  }

  // Sort by contribution
  attribution.sort((a, b) => b.contribution - a.contribution);

  return attribution;
}

/**
 * Get surfaces with best conversion performance
 */
export async function getBestConvertingSurfaces(
  surfaces: GrowthSurfaceInventoryRecord[],
  minConversions: number = 5,
  startDate?: Date,
  endDate?: Date
): Promise<{
  surface: GrowthSurfaceInventoryRecord;
  conversionRate: number;
  totalConversions: number;
}[]> {
  const results: {
    surface: GrowthSurfaceInventoryRecord;
    conversionRate: number;
    totalConversions: number;
  }[] = [];

  const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  const end = endDate ?? new Date();

  for (const surface of surfaces) {
    const metrics = await getConversionMetricsFromStore(surface.id, start, end);

    if (metrics && metrics.toolEntryConversions >= minConversions) {
      const conversionRate = metrics.pageViews > 0
        ? metrics.toolEntryConversions / metrics.pageViews
        : 0;

      results.push({
        surface,
        conversionRate,
        totalConversions: metrics.toolEntryConversions,
      });
    }
  }

  // Sort by conversion rate
  results.sort((a, b) => b.conversionRate - a.conversionRate);

  return results;
}

// ============================================================================
// Simulated Database Operations
// ============================================================================

const conversionMetricsStore: Map<string, GrowthSurfaceMetricAggregate[]> = new Map();

async function getConversionMetricsFromStore(
  surfaceId: string,
  startDate: Date,
  endDate: Date
): Promise<GrowthSurfaceMetricAggregate | null> {
  const metrics = conversionMetricsStore.get(surfaceId) ?? [];

  // Filter by date range
  const filtered = metrics.filter(m =>
    m.metricWindowStart >= startDate && m.metricWindowEnd <= endDate
  );

  if (filtered.length === 0) {
    // Return simulated data for demo
    return {
      id: crypto.randomUUID(),
      surfaceInventoryId: surfaceId,
      metricWindowStart: startDate,
      metricWindowEnd: endDate,
      pageViews: Math.floor(Math.random() * 1000) + 100,
      toolCtaClicks: Math.floor(Math.random() * 100) + 10,
      toolEntryConversions: Math.floor(Math.random() * 20) + 1,
      weakEngagementSignals: Math.floor(Math.random() * 10),
      createdAt: new Date(),
    };
  }

  // Aggregate
  return filtered.reduce((acc, m) => ({
    id: acc.id,
    surfaceInventoryId: surfaceId,
    metricWindowStart: startDate,
    metricWindowEnd: endDate,
    pageViews: acc.pageViews + m.pageViews,
    toolCtaClicks: acc.toolCtaClicks + m.toolCtaClicks,
    toolEntryConversions: acc.toolEntryConversions + m.toolEntryConversions,
    weakEngagementSignals: acc.weakEngagementSignals + m.weakEngagementSignals,
    createdAt: new Date(),
  }));
}

/**
 * Store metrics for testing
 */
export function storeTestConversionMetrics(
  surfaceId: string,
  metrics: GrowthSurfaceMetricAggregate[]
): void {
  const existing = conversionMetricsStore.get(surfaceId) ?? [];
  conversionMetricsStore.set(surfaceId, [...existing, ...metrics]);
}
