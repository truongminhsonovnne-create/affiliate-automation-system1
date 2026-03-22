/**
 * Cross-Platform Comparison Service
 * Builds cross-platform comparisons for various metrics and dimensions
 */

import type {
  PlatformKey,
  PlatformParityScope,
  CrossPlatformMetricComparison,
  CrossPlatformComparisonInput,
  CrossPlatformComparisonResult,
} from '../types.js';

import {
  QUALITY_DRIFT_THRESHOLD,
  COMMERCIAL_DRIFT_THRESHOLD,
  OPS_DRIFT_THRESHOLD,
  GOVERNANCE_DRIFT_THRESHOLD,
  CROSS_PLATFORM_METRICS,
} from '../constants.js';

export interface ComparisonConfig {
  scope: PlatformParityScope;
  driftThresholds?: Record<string, number>;
  includeHistoricalComparison?: boolean;
  historicalWindowDays?: number;
}

export interface QualityComparisonResult {
  platform: PlatformKey;
  discoveryScore: number;
  detailExtractionScore: number;
  enrichmentScore: number;
  overallQualityScore: number;
  issues: string[];
}

export interface CommercialComparisonResult {
  platform: PlatformKey;
  revenue: number;
  conversionRate: number;
  avgOrderValue: number;
  attributedSales: number;
  attributionModel: string;
}

export interface OpsLoadComparisonResult {
  platform: PlatformKey;
  activeProducts: number;
  errorRate: number;
  avgResponseTime: number;
  crawlSuccessRate: number;
  operationalLoad: 'low' | 'medium' | 'high';
}

export interface GovernanceRiskComparisonResult {
  platform: PlatformKey;
  releaseReadinessScore: number;
  enablementRiskScore: number;
  backlogCount: number;
  governanceCompliance: number;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Build cross-platform comparison
 */
export async function buildCrossPlatformComparison(
  input: CrossPlatformComparisonInput
): Promise<CrossPlatformComparisonResult> {
  const { comparisonScope, shopeeMetrics, tiktokMetrics, driftThresholds } = input;

  const metrics: CrossPlatformMetricComparison[] = [];

  // Get threshold based on scope
  const defaultThreshold = getDefaultThresholdForScope(comparisonScope);

  // Build comparisons for each metric
  const allMetricKeys = new Set([...Object.keys(shopeeMetrics), ...Object.keys(tiktokMetrics)]);

  for (const metricKey of allMetricKeys) {
    const shopeeValue = shopeeMetrics[metricKey] ?? 0;
    const tiktokValue = tiktokMetrics[metricKey] ?? 0;
    const threshold = driftThresholds?.[metricKey] ?? defaultThreshold;

    const comparison = buildMetricComparison(
      metricKey,
      shopeeValue,
      tiktokValue,
      threshold
    );

    metrics.push(comparison);
  }

  // Determine overall parity level
  const overallParityLevel = determineOverallParityLevel(metrics, comparisonScope);

  // Get significant drifts
  const significantDrifts = metrics.filter((m) => m.isDrift);

  return {
    comparisonId: generateComparisonId(),
    comparisonScope,
    comparisonTimestamp: new Date(),
    metrics,
    overallParityLevel,
    significantDrifts,
    summary: buildComparisonSummary(metrics, overallParityLevel),
  };
}

/**
 * Compare platform quality metrics
 */
export async function comparePlatformQuality(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): Promise<{
  shopeeQuality: QualityComparisonResult;
  tiktokQuality: QualityComparisonResult;
  comparison: CrossPlatformComparisonResult;
}> {
  const shopeeQuality = buildQualityResult('shopee', shopeeMetrics);
  const tiktokQuality = buildQualityResult('tiktok_shop', tiktokMetrics);

  const comparison = await buildCrossPlatformComparison({
    comparisonScope: 'technical',
    shopeeMetrics,
    tiktokMetrics,
    driftThresholds: {
      dataQualityScore: QUALITY_DRIFT_THRESHOLD,
      mediaQualityScore: QUALITY_DRIFT_THRESHOLD,
      enrichmentQualityScore: QUALITY_DRIFT_THRESHOLD,
    },
  });

  return {
    shopeeQuality,
    tiktokQuality,
    comparison,
  };
}

/**
 * Compare platform commercial performance
 */
export async function comparePlatformCommercialPerformance(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): Promise<{
  shopeeCommercial: CommercialComparisonResult;
  tiktokCommercial: CommercialComparisonResult;
  comparison: CrossPlatformComparisonResult;
}> {
  const shopeeCommercial = buildCommercialResult('shopee', shopeeMetrics);
  const tiktokCommercial = buildCommercialResult('tiktok_shop', tiktokMetrics);

  const comparison = await buildCrossPlatformComparison({
    comparisonScope: 'commercial',
    shopeeMetrics,
    tiktokMetrics,
    driftThresholds: {
      totalRevenue: COMMERCIAL_DRIFT_THRESHOLD,
      conversionRate: COMMERCIAL_DRIFT_THRESHOLD,
      avgOrderValue: COMMERCIAL_DRIFT_THRESHOLD,
      attributedSales: COMMERCIAL_DRIFT_THRESHOLD,
    },
  });

  return {
    shopeeCommercial,
    tiktokCommercial,
    comparison,
  };
}

/**
 * Compare platform operational load
 */
export async function comparePlatformOpsLoad(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): Promise<{
  shopeeOps: OpsLoadComparisonResult;
  tiktokOps: OpsLoadComparisonResult;
  comparison: CrossPlatformComparisonResult;
}> {
  const shopeeOps = buildOpsLoadResult('shopee', shopeeMetrics);
  const tiktokOps = buildOpsLoadResult('tiktok_shop', tiktokMetrics);

  const comparison = await buildCrossPlatformComparison({
    comparisonScope: 'operational',
    shopeeMetrics,
    tiktokMetrics,
    driftThresholds: {
      totalProducts: OPS_DRIFT_THRESHOLD,
      activeProducts: OPS_DRIFT_THRESHOLD,
      errorRate: OPS_DRIFT_THRESHOLD,
      crawlSuccessRate: OPS_DRIFT_THRESHOLD,
      avgResponseTime: OPS_DRIFT_THRESHOLD,
    },
  });

  return {
    shopeeOps,
    tiktokOps,
    comparison,
  };
}

/**
 * Compare platform governance risk
 */
export async function comparePlatformGovernanceRisk(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): Promise<{
  shopeeGovernance: GovernanceRiskComparisonResult;
  tiktokGovernance: GovernanceRiskComparisonResult;
  comparison: CrossPlatformComparisonResult;
}> {
  const shopeeGovernance = buildGovernanceRiskResult('shopee', shopeeMetrics);
  const tiktokGovernance = buildGovernanceRiskResult('tiktok_shop', tiktokMetrics);

  const comparison = await buildCrossPlatformComparison({
    comparisonScope: 'governance',
    shopeeMetrics,
    tiktokMetrics,
    driftThresholds: {
      releaseReadinessScore: GOVERNANCE_DRIFT_THRESHOLD,
      enablementRiskScore: GOVERNANCE_DRIFT_THRESHOLD,
      backlogCount: GOVERNANCE_DRIFT_THRESHOLD,
      governanceCompliance: GOVERNANCE_DRIFT_THRESHOLD,
    },
  });

  return {
    shopeeGovernance,
    tiktokGovernance,
    comparison,
  };
}

// Helper functions

function buildMetricComparison(
  metricKey: string,
  shopeeValue: number,
  tiktokValue: number,
  driftThreshold: number
): CrossPlatformMetricComparison {
  const metricDef = CROSS_PLATFORM_METRICS[metricKey as keyof typeof CROSS_PLATFORM_METRICS];
  const metricLabel = metricDef?.label ?? metricKey;

  const difference = shopeeValue - tiktokValue;
  const avgValue = (Math.abs(shopeeValue) + Math.abs(tiktokValue)) / 2;
  const differencePercent = avgValue > 0 ? difference / avgValue : 0;

  // For metrics where lower is better (like error rate), invert the logic
  const isLowerBetter = metricDef?.lowerIsBetter ?? false;

  let isDrift = false;
  if (isLowerBetter) {
    // For lower-is-better metrics, drift is when one is significantly worse
    isDrift = Math.abs(differencePercent) > driftThreshold && difference !== 0;
  } else {
    isDrift = Math.abs(differencePercent) > driftThreshold && difference !== 0;
  }

  return {
    metricKey,
    metricLabel,
    shopeeValue,
    tiktokValue,
    difference,
    differencePercent,
    isDrift,
    driftThreshold,
  };
}

function buildQualityResult(
  platform: PlatformKey,
  metrics: Record<string, number>
): QualityComparisonResult {
  const discoveryScore = metrics.discoverySuccessRate ?? metrics.discoveredProducts ?? 0;
  const detailScore = metrics.detailExtractionSuccess ?? metrics.mediaQualityScore ?? 0;
  const enrichmentScore = metrics.enrichmentSuccessRate ?? metrics.enrichmentQualityScore ?? 0;

  const overallScore = (discoveryScore + detailScore + enrichmentScore) / 3;

  const issues: string[] = [];
  if (discoveryScore < 0.7) issues.push('Discovery quality below threshold');
  if (detailScore < 0.7) issues.push('Detail extraction quality below threshold');
  if (enrichmentScore < 0.7) issues.push('Enrichment quality below threshold');

  return {
    platform,
    discoveryScore,
    detailExtractionScore: detailScore,
    enrichmentScore,
    overallQualityScore: overallScore,
    issues,
  };
}

function buildCommercialResult(
  platform: PlatformKey,
  metrics: Record<string, number>
): CommercialComparisonResult {
  return {
    platform,
    revenue: metrics.totalRevenue ?? 0,
    conversionRate: metrics.conversionRate ?? 0,
    avgOrderValue: metrics.avgOrderValue ?? 0,
    attributedSales: metrics.attributedSales ?? 0,
    attributionModel: 'platform_specific', // Would be configurable
  };
}

function buildOpsLoadResult(
  platform: PlatformKey,
  metrics: Record<string, number>
): OpsLoadComparisonResult {
  const errorRate = metrics.errorRate ?? 0;
  const activeProducts = metrics.activeProducts ?? metrics.totalProducts ?? 0;

  let operationalLoad: 'low' | 'medium' | 'high' = 'low';
  if (errorRate > 0.1 || activeProducts > 10000) {
    operationalLoad = 'high';
  } else if (errorRate > 0.05 || activeProducts > 5000) {
    operationalLoad = 'medium';
  }

  return {
    platform,
    activeProducts,
    errorRate,
    avgResponseTime: metrics.avgResponseTime ?? 0,
    crawlSuccessRate: metrics.crawlSuccessRate ?? 0,
    operationalLoad,
  };
}

function buildGovernanceRiskResult(
  platform: PlatformKey,
  metrics: Record<string, number>
): GovernanceRiskComparisonResult {
  const releaseReadiness = metrics.releaseReadinessScore ?? 0;
  const riskScore = metrics.enablementRiskScore ?? 0;
  const backlog = metrics.backlogCount ?? 0;
  const compliance = metrics.governanceCompliance ?? 0;

  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (releaseReadiness < 0.5 || riskScore > 0.7 || compliance < 0.6) {
    overallRisk = 'critical';
  } else if (releaseReadiness < 0.7 || riskScore > 0.5 || compliance < 0.75) {
    overallRisk = 'high';
  } else if (releaseReadiness < 0.8 || riskScore > 0.3 || compliance < 0.85) {
    overallRisk = 'medium';
  }

  return {
    platform,
    releaseReadinessScore: releaseReadiness,
    enablementRiskScore: riskScore,
    backlogCount: backlog,
    governanceCompliance: compliance,
    overallRiskLevel: overallRisk,
  };
}

function getDefaultThresholdForScope(scope: PlatformParityScope): number {
  switch (scope) {
    case 'operational':
    case 'product_ops':
      return OPS_DRIFT_THRESHOLD;
    case 'commercial':
      return COMMERCIAL_DRIFT_THRESHOLD;
    case 'governance':
      return GOVERNANCE_DRIFT_THRESHOLD;
    case 'technical':
    case 'consumer_experience':
    case 'discovery':
    case 'detail':
    case 'enrichment':
      return QUALITY_DRIFT_THRESHOLD;
    default:
      return QUALITY_DRIFT_THRESHOLD;
  }
}

function determineOverallParityLevel(
  metrics: CrossPlatformMetricComparison[],
  scope: PlatformParityScope
): string {
  if (metrics.length === 0) return 'unknown';

  const driftingCount = metrics.filter((m) => m.isDrift).length;
  const driftRatio = driftingCount / metrics.length;

  const threshold = getDefaultThresholdForScope(scope);

  if (driftRatio <= threshold * 0.5) return 'full_parity';
  if (driftRatio <= threshold) return 'operational_parity';
  if (driftRatio <= threshold * 1.5) return 'reporting_parity';
  if (driftRatio <= threshold * 2) return 'partial_parity';

  return 'hardening_required';
}

function buildComparisonSummary(
  metrics: CrossPlatformMetricComparison[],
  overallParityLevel: string
): string {
  const driftingMetrics = metrics.filter((m) => m.isDrift);
  const totalMetrics = metrics.length;

  if (driftingMetrics.length === 0) {
    return `All ${totalMetrics} metrics are within acceptable drift thresholds.`;
  }

  const metricNames = driftingMetrics.map((m) => m.metricLabel).join(', ');

  return `${driftingMetrics.length} of ${totalMetrics} metrics show significant drift: ${metricNames}. Overall parity level: ${overallParityLevel}.`;
}

function generateComparisonId(): string {
  return `cmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
