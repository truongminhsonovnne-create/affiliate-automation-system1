/**
 * Measurement Analytics
 *
 * Tracks and aggregates surface performance metrics for governance and insights.
 */

import {
  GrowthSurfaceInventoryRecord,
  GrowthSurfaceMetricAggregate,
} from '../types';

export interface MeasurementMetrics {
  pageViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
  scrollDepth: number;
  sessions: number;
}

export interface MeasurementSummary {
  surfaceId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: MeasurementMetrics;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface PortfolioMeasurementSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  avgTimeOnPage: number;
  avgBounceRate: number;
  topPerformingSurfaces: MeasurementSummary[];
  underperformingSurfaces: MeasurementSummary[];
  generatedAt: Date;
}

/**
 * Get measurement metrics for a surface
 */
export async function getSurfaceMeasurementMetrics(
  surfaceId: string,
  startDate: Date,
  endDate: Date
): Promise<MeasurementSummary | null> {
  // Aggregate metrics from database
  const metrics = await aggregateSurfaceMetrics(surfaceId, startDate, endDate);

  if (!metrics) {
    return null;
  }

  // Calculate trend by comparing to previous period
  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 14); // Compare to previous 2 weeks
  const previousMetrics = await aggregateSurfaceMetrics(surfaceId, previousPeriodStart, startDate);

  const trend = calculateTrend(metrics.pageViews, previousMetrics?.pageViews ?? 0);
  const trendPercentage = calculateTrendPercentage(metrics.pageViews, previousMetrics?.pageViews ?? 0);

  return {
    surfaceId,
    periodStart: startDate,
    periodEnd: endDate,
    metrics,
    trend,
    trendPercentage,
  };
}

/**
 * Get portfolio-wide measurement summary
 */
export async function getPortfolioMeasurementSummary(
  surfaces: GrowthSurfaceInventoryRecord[],
  startDate: Date,
  endDate: Date
): Promise<PortfolioMeasurementSummary> {
  const summaries: MeasurementSummary[] = [];

  for (const surface of surfaces) {
    const summary = await getSurfaceMeasurementMetrics(surface.id, startDate, endDate);
    if (summary) {
      summaries.push(summary);
    }
  }

  // Calculate totals
  const totalPageViews = summaries.reduce((sum, s) => sum + s.metrics.pageViews, 0);
  const totalUniqueVisitors = summaries.reduce((sum, s) => sum + s.metrics.uniqueVisitors, 0);
  const avgTimeOnPage = summaries.length > 0
    ? summaries.reduce((sum, s) => sum + s.metrics.avgTimeOnPage, 0) / summaries.length
    : 0;
  const avgBounceRate = summaries.length > 0
    ? summaries.reduce((sum, s) => sum + s.metrics.bounceRate, 0) / summaries.length
    : 0;

  // Get top performers (by page views)
  const sortedByViews = [...summaries].sort((a, b) => b.metrics.pageViews - a.metrics.pageViews);
  const topPerformingSurfaces = sortedByViews.slice(0, 10);

  // Get underperformers (low views, high bounce)
  const underperformingSurfaces = summaries
    .filter(s => s.metrics.pageViews < 100 && s.metrics.bounceRate > 70)
    .sort((a, b) => a.metrics.bounceRate - b.metrics.bounceRate) // Highest bounce first
    .slice(0, 10);

  return {
    totalPageViews,
    totalUniqueVisitors,
    avgTimeOnPage,
    avgBounceRate,
    topPerformingSurfaces,
    underperformingSurfaces,
    generatedAt: new Date(),
  };
}

/**
 * Track a measurement event
 */
export async function trackMeasurementEvent(
  surfaceId: string,
  eventType: 'page_view' | 'session' | 'engagement',
  eventData: Record<string, unknown>
): Promise<void> {
  // In production, this would write to the metrics table
  console.log(`Measurement event: ${eventType} for surface ${surfaceId}`, eventData);
}

/**
 * Calculate engagement score based on measurement metrics
 */
export function calculateEngagementScore(metrics: MeasurementMetrics): number {
  let score = 50; // Base

  // Time on page contribution (0-20)
  if (metrics.avgTimeOnPage >= 120) { // 2+ min
    score += 20;
  } else if (metrics.avgTimeOnPage >= 60) { // 1+ min
    score += 15;
  } else if (metrics.avgTimeOnPage >= 30) { // 30+ sec
    score += 10;
  } else if (metrics.avgTimeOnPage < 10) {
    score -= 15;
  }

  // Bounce rate contribution (0-20)
  if (metrics.bounceRate < 30) {
    score += 20;
  } else if (metrics.bounceRate < 50) {
    score += 10;
  } else if (metrics.bounceRate > 80) {
    score -= 20;
  }

  // Scroll depth contribution (0-10)
  score += Math.round((metrics.scrollDepth / 100) * 10);

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Simulated Database Operations
// ============================================================================

const metricStore: Map<string, GrowthSurfaceMetricAggregate[]> = new Map();

async function aggregateSurfaceMetrics(
  surfaceId: string,
  startDate: Date,
  endDate: Date
): Promise<MeasurementMetrics | null> {
  const metrics = metricStore.get(surfaceId) ?? [];

  // Filter by date range
  const filtered = metrics.filter(m =>
    m.metricWindowStart >= startDate && m.metricWindowEnd <= endDate
  );

  if (filtered.length === 0) {
    // Return simulated data for demo
    return {
      pageViews: Math.floor(Math.random() * 1000),
      uniqueVisitors: Math.floor(Math.random() * 500),
      avgTimeOnPage: Math.floor(Math.random() * 120),
      bounceRate: Math.floor(Math.random() * 50) + 20,
      exitRate: Math.floor(Math.random() * 30) + 10,
      scrollDepth: Math.floor(Math.random() * 40) + 60,
      sessions: Math.floor(Math.random() * 400),
    };
  }

  // Aggregate
  const pageViews = filtered.reduce((sum, m) => sum + m.pageViews, 0);
  // Simulate other metrics
  const uniqueVisitors = Math.floor(pageViews * 0.6);
  const avgTimeOnPage = Math.floor(Math.random() * 120);
  const bounceRate = Math.floor(Math.random() * 50) + 20;
  const exitRate = Math.floor(Math.random() * 30) + 10;
  const scrollDepth = Math.floor(Math.random() * 40) + 60;
  const sessions = Math.floor(pageViews * 0.7);

  return {
    pageViews,
    uniqueVisitors,
    avgTimeOnPage,
    bounceRate,
    exitRate,
    scrollDepth,
    sessions,
  };
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const change = (current - previous) / previous;
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'stable';
}

function calculateTrendPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Store metrics for testing
 */
export function storeTestMetrics(
  surfaceId: string,
  metrics: GrowthSurfaceMetricAggregate[]
): void {
  const existing = metricStore.get(surfaceId) ?? [];
  metricStore.set(surfaceId, [...existing, ...metrics]);
}
