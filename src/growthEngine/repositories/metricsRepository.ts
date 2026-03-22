/**
 * Metrics Repository
 *
 * Data access layer for surface metrics.
 */

import { GrowthSurfaceMetricAggregate } from '../types';

export interface MetricsFilter {
  surfaceInventoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create metrics record
 */
export async function createMetrics(
  data: Omit<GrowthSurfaceMetricAggregate, 'id' | 'createdAt'>
): Promise<GrowthSurfaceMetricAggregate> {
  const id = crypto.randomUUID();
  const now = new Date();

  const record: GrowthSurfaceMetricAggregate = {
    id,
    ...data,
    createdAt: now,
  };

  await saveMetrics(record);
  return record;
}

/**
 * Get metrics by ID
 */
export async function getMetricsById(id: string): Promise<GrowthSurfaceMetricAggregate | null> {
  return findMetricsById(id);
}

/**
 * Get metrics for a surface within date range
 */
export async function getMetricsBySurface(
  surfaceInventoryId: string,
  startDate?: Date,
  endDate?: Date
): Promise<GrowthSurfaceMetricAggregate[]> {
  const all = await getAllMetrics();

  return all.filter(m => {
    if (m.surfaceInventoryId !== surfaceInventoryId) return false;
    if (startDate && m.metricWindowStart < startDate) return false;
    if (endDate && m.metricWindowEnd > endDate) return false;
    return true;
  }).sort((a, b) => a.metricWindowStart.getTime() - b.metricWindowStart.getTime());
}

/**
 * Get latest metrics for a surface
 */
export async function getLatestMetrics(
  surfaceInventoryId: string
): Promise<GrowthSurfaceMetricAggregate | null> {
  const metrics = await getMetricsBySurface(surfaceInventoryId);
  if (metrics.length === 0) return null;
  return metrics[metrics.length - 1];
}

/**
 * Aggregate metrics for a surface
 */
export async function aggregateSurfaceMetrics(
  surfaceInventoryId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  pageViews: number;
  toolCtaClicks: number;
  toolEntryConversions: number;
  weakEngagementSignals: number;
}> {
  const metrics = await getMetricsBySurface(surfaceInventoryId, startDate, endDate);

  return metrics.reduce(
    (acc, m) => ({
      pageViews: acc.pageViews + m.pageViews,
      toolCtaClicks: acc.toolCtaClicks + m.toolCtaClicks,
      toolEntryConversions: acc.toolEntryConversions + m.toolEntryConversions,
      weakEngagementSignals: acc.weakEngagementSignals + m.weakEngagementSignals,
    }),
    { pageViews: 0, toolCtaClicks: 0, toolEntryConversions: 0, weakEngagementSignals: 0 }
  );
}

/**
 * List metrics with filters
 */
export async function listMetrics(
  filter: MetricsFilter = {},
  limit: number = 100,
  offset: number = 0
): Promise<{
  data: GrowthSurfaceMetricAggregate[];
  total: number;
}> {
  let metrics = await getAllMetrics();

  // Apply filters
  if (filter.surfaceInventoryId) {
    metrics = metrics.filter(m => m.surfaceInventoryId === filter.surfaceInventoryId);
  }
  if (filter.startDate) {
    metrics = metrics.filter(m => m.metricWindowStart >= filter.startDate!);
  }
  if (filter.endDate) {
    metrics = metrics.filter(m => m.metricWindowEnd <= filter.endDate!);
  }

  // Sort by window start descending
  metrics.sort((a, b) => b.metricWindowStart.getTime() - a.metricWindowStart.getTime());

  const total = metrics.length;
  const data = metrics.slice(offset, offset + limit);

  return { data, total };
}

// ============================================================================
// In-Memory Storage
// ============================================================================

const metricsStore: Map<string, GrowthSurfaceMetricAggregate> = new Map();

async function saveMetrics(record: GrowthSurfaceMetricAggregate): Promise<void> {
  metricsStore.set(record.id, record);
}

async function findMetricsById(id: string): Promise<GrowthSurfaceMetricAggregate | null> {
  return metricsStore.get(id) ?? null;
}

async function getAllMetrics(): Promise<GrowthSurfaceMetricAggregate[]> {
  return Array.from(metricsStore.values());
}

/**
 * Seed test data
 */
export function seedTestMetrics(metrics: GrowthSurfaceMetricAggregate[]): void {
  for (const m of metrics) {
    metricsStore.set(m.id, m);
  }
}
