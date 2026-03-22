/**
 * BI Parity Integration
 * Integrates BI/commercial/founder surfaces into parity layer
 */

import type {
  PlatformKey,
  CrossPlatformMetricComparison,
} from '../types.js';

export interface BiInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
}

export interface ScorecardInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  targets: Record<string, number>;
  dimensions: string[];
}

export interface MetricLineageInput {
  shopeeMetricDefinitions: Record<string, MetricDefinition>;
  tiktokMetricDefinitions: Record<string, MetricDefinition>;
}

export interface MetricDefinition {
  name: string;
  source: string;
  calculation: string;
  updateFrequency: string;
}

/**
 * Build unified BI inputs
 */
export async function buildUnifiedBiInputs(
  input: BiInput
): Promise<{
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics } = input;

  // Calculate health status
  const healthStatus = calculateBiHealth(crossPlatformMetrics);

  return {
    shopeeMetrics,
    tiktokMetrics,
    crossPlatformMetrics,
    healthStatus,
  };
}

/**
 * Build cross-platform scorecard inputs
 */
export async function buildCrossPlatformScorecardInputs(
  input: ScorecardInput
): Promise<{
  shopeeScorecard: ScorecardRow[];
  tiktokScorecard: ScorecardRow[];
  comparison: ScorecardComparison[];
}> {
  const { shopeeMetrics, tiktokMetrics, targets, dimensions } = input;

  // Build shopee scorecard
  const shopeeScorecard = buildScorecardRows('shopee', shopeeMetrics, targets, dimensions);

  // Build tiktok scorecard
  const tiktokScorecard = buildScorecardRows('tiktok_shop', tiktokMetrics, targets, dimensions);

  // Build comparison
  const comparison = buildScorecardComparison(shopeeMetrics, tiktokMetrics, targets, dimensions);

  return { shopeeScorecard, tiktokScorecard, comparison };
}

export interface ScorecardRow {
  dimension: string;
  value: number;
  target: number;
  achieved: boolean;
  achievementPercent: number;
}

export interface ScorecardComparison {
  dimension: string;
  shopeeValue: number;
  tiktokValue: number;
  target: number;
  shopeeAchieved: boolean;
  tiktokAchieved: boolean;
  drift: number;
}

/**
 * Build unified metric lineage summary
 */
export async function buildUnifiedMetricLineageSummary(
  input: MetricLineageInput
): Promise<{
  commonMetrics: string[];
  shopeeOnlyMetrics: string[];
  tiktokOnlyMetrics: string[];
  lineageSummary: Record<string, MetricLineageComparison>;
}> {
  const { shopeeMetricDefinitions, tiktokMetricDefinitions } = input;

  const shopeeMetricKeys = new Set(Object.keys(shopeeMetricDefinitions));
  const tiktokMetricKeys = new Set(Object.keys(tiktokMetricDefinitions));

  // Find common metrics
  const commonMetrics = [...shopeeMetricKeys].filter((k) => tiktokMetricKeys.has(k));

  // Find platform-specific metrics
  const shopeeOnlyMetrics = [...shopeeMetricKeys].filter((k) => !tiktokMetricKeys.has(k));
  const tiktokOnlyMetrics = [...tiktokMetricKeys].filter((k) => !shopeeMetricKeys.has(k));

  // Build lineage comparison for common metrics
  const lineageSummary: Record<string, MetricLineageComparison> = {};
  for (const metric of commonMetrics) {
    const shopeeDef = shopeeMetricDefinitions[metric];
    const tiktokDef = tiktokMetricDefinitions[metric];

    lineageSummary[metric] = {
      shopee: {
        source: shopeeDef.source,
        calculation: shopeeDef.calculation,
        updateFrequency: shopeeDef.updateFrequency,
      },
      tiktok: {
        source: tiktokDef.source,
        calculation: tiktokDef.calculation,
        updateFrequency: tiktokDef.updateFrequency,
      },
      isAligned: isLineageAligned(shopeeDef, tiktokDef),
    };
  }

  return { commonMetrics, shopeeOnlyMetrics, tiktokOnlyMetrics, lineageSummary };
}

export interface MetricLineageComparison {
  shopee: {
    source: string;
    calculation: string;
    updateFrequency: string;
  };
  tiktok: {
    source: string;
    calculation: string;
    updateFrequency: string;
  };
  isAligned: boolean;
}

// Helper functions

function calculateBiHealth(metrics: CrossPlatformMetricComparison[]): 'healthy' | 'warning' | 'critical' {
  if (metrics.length === 0) return 'healthy';

  const driftingCount = metrics.filter((m) => m.isDrift).length;
  const driftRatio = driftingCount / metrics.length;

  if (driftRatio > 0.5) return 'critical';
  if (driftRatio > 0.25) return 'warning';

  return 'healthy';
}

function buildScorecardRows(
  platform: PlatformKey,
  metrics: Record<string, number>,
  targets: Record<string, number>,
  dimensions: string[]
): ScorecardRow[] {
  return dimensions.map((dim) => {
    const value = metrics[dim] ?? 0;
    const target = targets[dim] ?? 0;
    const achieved = value >= target;
    const achievementPercent = target > 0 ? (value / target) * 100 : 0;

    return {
      dimension: dim,
      value,
      target,
      achieved,
      achievementPercent,
    };
  });
}

function buildScorecardComparison(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>,
  targets: Record<string, number>,
  dimensions: string[]
): ScorecardComparison[] {
  return dimensions.map((dim) => {
    const shopeeValue = shopeeMetrics[dim] ?? 0;
    const tiktokValue = tiktokMetrics[dim] ?? 0;
    const target = targets[dim] ?? 0;

    return {
      dimension: dim,
      shopeeValue,
      tiktokValue,
      target,
      shopeeAchieved: shopeeValue >= target,
      tiktokAchieved: tiktokValue >= target,
      drift: shopeeValue - tiktokValue,
    };
  });
}

function isLineageAligned(def1: MetricDefinition, def2: MetricDefinition): boolean {
  return (
    def1.source === def2.source &&
    def1.calculation === def2.calculation &&
    def1.updateFrequency === def2.updateFrequency
  );
}
