/**
 * Unified BI Surface Builder
 * Builds unified Business Intelligence surfaces for cross-platform visibility
 */

import type {
  PlatformKey,
  UnifiedBiSurface,
  CrossPlatformMetricComparison,
  PlatformParityScope,
} from '../types.js';

export interface ExecutiveBiInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  period: 'day' | 'week' | 'month' | 'quarter';
}

export interface OperatorBiInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
}

export interface FounderBiInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  strategicPeriod: 'month' | 'quarter' | 'year';
}

export interface ScorecardData {
  platform: PlatformKey;
  dimension: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  target: number;
  achieved: boolean;
}

export interface BiComparisonInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  comparisonDimensions: string[];
}

/**
 * Build unified executive BI surface
 */
export async function buildUnifiedExecutiveBiSurface(
  input: ExecutiveBiInput
): Promise<UnifiedBiSurface> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics, period } = input;

  const platformData: UnifiedBiSurface['platformData'] = {
    shopee: {
      period,
      revenue: shopeeMetrics.totalRevenue ?? 0,
      conversionRate: shopeeMetrics.conversionRate ?? 0,
      activeProducts: shopeeMetrics.activeProducts ?? 0,
      growthRate: shopeeMetrics.growthRates ?? 0,
      customerSatisfaction: shopeeMetrics.customerSatisfaction ?? 0,
    },
    tiktok_shop: {
      period,
      revenue: tiktokMetrics.totalRevenue ?? 0,
      conversionRate: tiktokMetrics.conversionRate ?? 0,
      activeProducts: tiktokMetrics.activeProducts ?? 0,
      growthRate: tiktokMetrics.growthRates ?? 0,
      customerSatisfaction: tiktokMetrics.customerSatisfaction ?? 0,
    },
  };

  // Calculate key metrics
  const totalRevenue = (shopeeMetrics.totalRevenue ?? 0) + (tiktokMetrics.totalRevenue ?? 0);
  const shopeeRevenueShare = totalRevenue > 0 ? (shopeeMetrics.totalRevenue ?? 0) / totalRevenue : 0;
  const tiktokRevenueShare = totalRevenue > 0 ? (tiktokMetrics.totalRevenue ?? 0) / totalRevenue : 0;

  const totalProducts = (shopeeMetrics.activeProducts ?? 0) + (tiktokMetrics.activeProducts ?? 0);
  const shopeeProductShare = totalProducts > 0 ? (shopeeMetrics.activeProducts ?? 0) / totalProducts : 0;
  const tiktokProductShare = totalProducts > 0 ? (tiktokMetrics.activeProducts ?? 0) / totalProducts : 0;

  // Build cross-platform metrics summary
  const crossPlatformSummary = buildExecutiveCrossPlatformMetrics(shopeeMetrics, tiktokMetrics);

  return {
    surfaceKey: `executive-bi-${period}`,
    surfaceType: 'executive',
    platformData,
    crossPlatformMetrics: crossPlatformSummary,
    generatedAt: new Date(),
  };
}

/**
 * Build unified operator BI surface
 */
export async function buildUnifiedOperatorBiSurface(
  input: OperatorBiInput
): Promise<UnifiedBiSurface> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics } = input;

  const platformData: UnifiedBiSurface['platformData'] = {
    shopee: {
      // Operational metrics
      totalProducts: shopeeMetrics.totalProducts ?? 0,
      activeProducts: shopeeMetrics.activeProducts ?? 0,
      errorRate: shopeeMetrics.errorRate ?? 0,
      crawlSuccessRate: shopeeMetrics.crawlSuccessRate ?? 0,
      avgResponseTime: shopeeMetrics.avgResponseTime ?? 0,
      // Quality metrics
      dataQualityScore: shopeeMetrics.dataQualityScore ?? 0,
      mediaQualityScore: shopeeMetrics.mediaQualityScore ?? 0,
      enrichmentQualityScore: shopeeMetrics.enrichmentQualityScore ?? 0,
      // Pipeline metrics
      discoveredProducts: shopeeMetrics.discoveredProducts ?? 0,
      detailExtractionSuccess: shopeeMetrics.detailExtractionSuccess ?? 0,
      enrichmentSuccessRate: shopeeMetrics.enrichmentSuccessRate ?? 0,
    },
    tiktok_shop: {
      totalProducts: tiktokMetrics.totalProducts ?? 0,
      activeProducts: tiktokMetrics.activeProducts ?? 0,
      errorRate: tiktokMetrics.errorRate ?? 0,
      crawlSuccessRate: tiktokMetrics.crawlSuccessRate ?? 0,
      avgResponseTime: tiktokMetrics.avgResponseTime ?? 0,
      dataQualityScore: tiktokMetrics.dataQualityScore ?? 0,
      mediaQualityScore: tiktokMetrics.mediaQualityScore ?? 0,
      enrichmentQualityScore: tiktokMetrics.enrichmentQualityScore ?? 0,
      discoveredProducts: tiktokMetrics.discoveredProducts ?? 0,
      detailExtractionSuccess: tiktokMetrics.detailExtractionSuccess ?? 0,
      enrichmentSuccessRate: tiktokMetrics.enrichmentSuccessRate ?? 0,
    },
  };

  const crossPlatformSummary = buildOperatorCrossPlatformMetrics(crossPlatformMetrics);

  return {
    surfaceKey: 'operator-bi',
    surfaceType: 'operator',
    platformData,
    crossPlatformMetrics: crossPlatformSummary,
    generatedAt: new Date(),
  };
}

/**
 * Build unified founder BI surface
 */
export async function buildUnifiedFounderBiSurface(
  input: FounderBiInput
): Promise<UnifiedBiSurface> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics, strategicPeriod } = input;

  // Calculate strategic metrics
  const totalRevenue = (shopeeMetrics.totalRevenue ?? 0) + (tiktokMetrics.totalRevenue ?? 0);
  const shopeeRevenueShare = totalRevenue > 0 ? (shopeeMetrics.totalRevenue ?? 0) / totalRevenue : 0;
  const tiktokRevenueShare = totalRevenue > 0 ? (tiktokMetrics.totalRevenue ?? 0) / totalRevenue : 0;

  // Growth analysis
  const shopeeGrowth = shopeeMetrics.growthRates ?? 0;
  const tiktokGrowth = tiktokMetrics.growthRates ?? 0;
  const avgGrowthRate = (shopeeGrowth + tiktokGrowth) / 2;

  // Market position
  const marketPosition = analyzeMarketPosition(shopeeRevenueShare, tiktokRevenueShare);

  // Risk assessment
  const riskAssessment = assessPlatformRisks(shopeeMetrics, tiktokMetrics);

  const platformData: UnifiedBiSurface['platformData'] = {
    shopee: {
      strategicPeriod,
      revenue: shopeeMetrics.totalRevenue ?? 0,
      revenueShare: shopeeRevenueShare,
      growthRate: shopeeGrowth,
      marketPosition: marketPosition.shopee,
      riskLevel: riskAssessment.shopee,
    },
    tiktok_shop: {
      strategicPeriod,
      revenue: tiktokMetrics.totalRevenue ?? 0,
      revenueShare: tiktokRevenueShare,
      growthRate: tiktokGrowth,
      marketPosition: marketPosition.tiktok,
      riskLevel: riskAssessment.tiktok,
    },
  };

  // Build strategic cross-platform metrics
  const crossPlatformSummary = buildFounderCrossPlatformMetrics(
    shopeeMetrics,
    tiktokMetrics,
    avgGrowthRate
  );

  return {
    surfaceKey: `founder-bi-${strategicPeriod}`,
    surfaceType: 'founder',
    platformData,
    crossPlatformMetrics: crossPlatformSummary,
    generatedAt: new Date(),
  };
}

/**
 * Build cross-platform BI comparison surface
 */
export async function buildCrossPlatformBiComparisonSurface(
  input: BiComparisonInput
): Promise<UnifiedBiSurface> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics, comparisonDimensions } = input;

  // Build comparison data for each dimension
  const platformData: UnifiedBiSurface['platformData'] = {
    shopee: {
      dimensions: comparisonDimensions.map((dim) => ({
        name: dim,
        value: shopeeMetrics[dim] ?? 0,
      })),
    },
    tiktok_shop: {
      dimensions: comparisonDimensions.map((dim) => ({
        name: dim,
        value: tiktokMetrics[dim] ?? 0,
      })),
    },
  };

  // Filter metrics relevant to comparison dimensions
  const relevantMetrics = crossPlatformMetrics.filter((m) =>
    comparisonDimensions.includes(m.metricKey)
  );

  return {
    surfaceKey: 'bi-comparison',
    surfaceType: 'comparison',
    platformData,
    crossPlatformMetrics: relevantMetrics,
    generatedAt: new Date(),
  };
}

/**
 * Build scorecard data for a platform
 */
export function buildScorecard(
  platform: PlatformKey,
  metrics: Record<string, number>,
  targets: Record<string, number>
): ScorecardData[] {
  const dimensions = Object.keys(targets);

  return dimensions.map((dimension) => {
    const value = metrics[dimension] ?? 0;
    const target = targets[dimension] ?? 0;

    // Calculate trend (simplified - would need historical data)
    const trend: 'up' | 'down' | 'stable' = 'stable';

    return {
      platform,
      dimension,
      score: value,
      trend,
      target,
      achieved: value >= target,
    };
  });
}

// Helper functions

function buildExecutiveCrossPlatformMetrics(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): CrossPlatformMetricComparison[] {
  const metrics: CrossPlatformMetricComparison[] = [];

  const metricPairs = [
    { key: 'totalRevenue', label: 'Total Revenue' },
    { key: 'conversionRate', label: 'Conversion Rate' },
    { key: 'activeProducts', label: 'Active Products' },
    { key: 'growthRates', label: 'Growth Rate' },
  ];

  for (const { key, label } of metricPairs) {
    const shopeeValue = shopeeMetrics[key] ?? 0;
    const tiktokValue = tiktokMetrics[key] ?? 0;
    const difference = shopeeValue - tiktokValue;
    const avgValue = (Math.abs(shopeeValue) + Math.abs(tiktokValue)) / 2;
    const differencePercent = avgValue > 0 ? difference / avgValue : 0;

    metrics.push({
      metricKey: key,
      metricLabel: label,
      shopeeValue,
      tiktokValue,
      difference,
      differencePercent,
      isDrift: Math.abs(differencePercent) > 0.2,
      driftThreshold: 0.2,
    });
  }

  return metrics;
}

function buildOperatorCrossPlatformMetrics(
  metrics: CrossPlatformMetricComparison[]
): CrossPlatformMetricComparison[] {
  // Filter for operator-relevant metrics
  const operatorMetrics = [
    'totalProducts',
    'activeProducts',
    'errorRate',
    'crawlSuccessRate',
    'dataQualityScore',
    'discoverySuccessRate',
    'detailExtractionSuccess',
    'enrichmentSuccessRate',
  ];

  return metrics.filter((m) => operatorMetrics.includes(m.metricKey));
}

function buildFounderCrossPlatformMetrics(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>,
  avgGrowthRate: number
): CrossPlatformMetricComparison[] {
  const metrics: CrossPlatformMetricComparison[] = [];

  // Revenue comparison
  const totalRevenue = (shopeeMetrics.totalRevenue ?? 0) + (tiktokMetrics.totalRevenue ?? 0);
  const shopeeRevenue = shopeeMetrics.totalRevenue ?? 0;
  const tiktokRevenue = tiktokMetrics.totalRevenue ?? 0;

  if (totalRevenue > 0) {
    metrics.push({
      metricKey: 'revenue_share',
      metricLabel: 'Revenue Share',
      shopeeValue: shopeeRevenue / totalRevenue,
      tiktokValue: tiktokRevenue / totalRevenue,
      difference: (shopeeRevenue - tiktokRevenue) / totalRevenue,
      differencePercent: (shopeeRevenue - tiktokRevenue) / totalRevenue,
      isDrift: Math.abs(shopeeRevenue - tiktokRevenue) / totalRevenue > 0.3,
      driftThreshold: 0.3,
    });
  }

  // Growth comparison
  metrics.push({
    metricKey: 'growth_rate',
    metricLabel: 'Growth Rate',
    shopeeValue: shopeeMetrics.growthRates ?? 0,
    tiktokValue: tiktokMetrics.growthRates ?? 0,
    difference: (shopeeMetrics.growthRates ?? 0) - (tiktokMetrics.growthRates ?? 0),
    differencePercent: avgGrowthRate > 0
      ? ((shopeeMetrics.growthRates ?? 0) - (tiktokMetrics.growthRates ?? 0)) / avgGrowthRate
      : 0,
    isDrift: Math.abs((shopeeMetrics.growthRates ?? 0) - (tiktokMetrics.growthRates ?? 0)) > 0.1,
    driftThreshold: 0.1,
  });

  return metrics;
}

function analyzeMarketPosition(
  shopeeShare: number,
  tiktokShare: number
): { shopee: string; tiktok: string } {
  return {
    shopee: shopeeShare > 0.7 ? 'dominant' : shopeeShare > 0.4 ? 'strong' : 'emerging',
    tiktok: tiktokShare > 0.3 ? 'emerging' : 'nascent',
  };
}

function assessPlatformRisks(
  shopeeMetrics: Record<string, number>,
  tiktokMetrics: Record<string, number>
): { shopee: string; tiktok: string } {
  // Simplified risk assessment
  const shopeeRisk = (shopeeMetrics.errorRate ?? 0) > 0.1 ? 'high' : 'low';
  const tiktokRisk = (tiktokMetrics.errorRate ?? 0) > 0.15 ? 'high'
    : (tiktokMetrics.errorRate ?? 0) > 0.1 ? 'medium' : 'low';

  return {
    shopee: shopeeRisk,
    tiktok: tiktokRisk,
  };
}
