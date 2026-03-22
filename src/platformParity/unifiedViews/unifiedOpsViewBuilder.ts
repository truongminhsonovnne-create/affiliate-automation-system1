/**
 * Unified Ops View Builder
 * Builds unified operational surfaces for cross-platform visibility
 */

import type {
  PlatformKey,
  UnifiedOpsViewData,
  CrossPlatformMetricComparison,
  PlatformParityScope,
} from '../types.js';

export interface UnifiedOpsViewBuilderInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  crossPlatformMetrics: CrossPlatformMetricComparison[];
  lastSyncTimes: Record<PlatformKey, Date>;
}

export interface ProductOpsData {
  discovery: {
    shopee: Record<string, unknown>;
    tiktok: Record<string, unknown>;
  };
  detail: {
    shopee: Record<string, unknown>;
    tiktok: Record<string, unknown>;
  };
  enrichment: {
    shopee: Record<string, unknown>;
    tiktok: Record<string, unknown>;
  };
}

export interface CommercialOpsData {
  revenue: Record<PlatformKey, number>;
  conversions: Record<PlatformKey, number>;
  attribution: Record<PlatformKey, Record<string, unknown>>;
}

export interface GrowthOpsData {
  newProducts: Record<PlatformKey, number>;
  trendingProducts: Record<PlatformKey, number>;
  growthRates: Record<PlatformKey, number>;
}

export interface ReleaseOpsData {
  readinessScores: Record<PlatformKey, number>;
  pendingReleases: Record<PlatformKey, number>;
  failedReleases: Record<PlatformKey, number>;
}

/**
 * Build unified product ops view
 */
export async function buildUnifiedProductOpsView(
  input: UnifiedOpsViewBuilderInput
): Promise<{
  data: ProductOpsData;
  summary: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics } = input;

  // Build discovery data
  const discovery: ProductOpsData['discovery'] = {
    shopee: {
      discoveredProducts: shopeeMetrics.discoveredProducts ?? 0,
      discoverySuccessRate: shopeeMetrics.discoverySuccessRate ?? 0,
      uniqueProductsFound: shopeeMetrics.uniqueProductsFound ?? 0,
    },
    tiktok: {
      discoveredProducts: tiktokMetrics.discoveredProducts ?? 0,
      discoverySuccessRate: tiktokMetrics.discoverySuccessRate ?? 0,
      uniqueProductsFound: tiktokMetrics.uniqueProductsFound ?? 0,
    },
  };

  // Build detail data
  const detail: ProductOpsData['detail'] = {
    shopee: {
      detailExtractionSuccess: shopeeMetrics.detailExtractionSuccess ?? 0,
      mediaQualityScore: shopeeMetrics.mediaQualityScore ?? 0,
      attributeCompleteness: shopeeMetrics.attributeCompleteness ?? 0,
    },
    tiktok: {
      detailExtractionSuccess: tiktokMetrics.detailExtractionSuccess ?? 0,
      mediaQualityScore: tiktokMetrics.mediaQualityScore ?? 0,
      attributeCompleteness: tiktokMetrics.attributeCompleteness ?? 0,
    },
  };

  // Build enrichment data
  const enrichment: ProductOpsData['enrichment'] = {
    shopee: {
      enrichmentSuccessRate: shopeeMetrics.enrichmentSuccessRate ?? 0,
      aiProcessingTime: shopeeMetrics.aiProcessingTime ?? 0,
      enrichmentQualityScore: shopeeMetrics.enrichmentQualityScore ?? 0,
    },
    tiktok: {
      enrichmentSuccessRate: tiktokMetrics.enrichmentSuccessRate ?? 0,
      aiProcessingTime: tiktokMetrics.aiProcessingTime ?? 0,
      enrichmentQualityScore: tiktokMetrics.enrichmentQualityScore ?? 0,
    },
  };

  // Determine health status
  const healthStatus = determineProductOpsHealth(crossPlatformMetrics);

  // Build summary
  const summary = buildProductOpsSummary(discovery, detail, enrichment);

  return { data: { discovery, detail, enrichment }, summary, healthStatus };
}

/**
 * Build unified commercial ops view
 */
export async function buildUnifiedCommercialOpsView(
  input: UnifiedOpsViewBuilderInput
): Promise<{
  data: CommercialOpsData;
  summary: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, crossPlatformMetrics } = input;

  const revenue: CommercialOpsData['revenue'] = {
    shopee: shopeeMetrics.totalRevenue ?? 0,
    tiktok_shop: tiktokMetrics.totalRevenue ?? 0,
  };

  const conversions: CommercialOpsData['conversions'] = {
    shopee: shopeeMetrics.conversionRate ?? 0,
    tiktok_shop: tiktokMetrics.conversionRate ?? 0,
  };

  const attribution: CommercialOpsData['attribution'] = {
    shopee: {
      attributedSales: shopeeMetrics.attributedSales ?? 0,
      avgOrderValue: shopeeMetrics.avgOrderValue ?? 0,
      attributionModel: 'production',
    },
    tiktok_shop: {
      attributedSales: tiktokMetrics.attributedSales ?? 0,
      avgOrderValue: tiktokMetrics.avgOrderValue ?? 0,
      attributionModel: 'preview',
    },
  };

  // Determine health status
  const healthStatus = determineCommercialOpsHealth(crossPlatformMetrics);

  // Build summary
  const totalRevenue = revenue.shopee + revenue.tiktok_shop;
  const shopeeShare = totalRevenue > 0 ? (revenue.shopee / totalRevenue) * 100 : 0;
  const tiktokShare = totalRevenue > 0 ? (revenue.tiktok_shop / totalRevenue) * 100 : 0;

  const summary = `Total revenue: $${totalRevenue.toLocaleString()}. Shopee: $${revenue.shopee.toLocaleString()} (${shopeeShare.toFixed(1)}%), TikTok: $${revenue.tiktok_shop.toLocaleString()} (${tiktokShare.toFixed(1)}%).`;

  return { data: { revenue, conversions, attribution }, summary, healthStatus };
}

/**
 * Build unified growth ops view
 */
export async function buildUnifiedGrowthOpsView(
  input: UnifiedOpsViewBuilderInput
): Promise<{
  data: GrowthOpsData;
  summary: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const newProducts: GrowthOpsData['newProducts'] = {
    shopee: shopeeMetrics.newProducts ?? 0,
    tiktok_shop: tiktokMetrics.newProducts ?? 0,
  };

  const trendingProducts: GrowthOpsData['trendingProducts'] = {
    shopee: shopeeMetrics.trendingProducts ?? 0,
    tiktok_shop: tiktokMetrics.trendingProducts ?? 0,
  };

  const growthRates: GrowthOpsData['growthRates'] = {
    shopee: shopeeMetrics.growthRates ?? 0,
    tiktok_shop: tiktokMetrics.growthRates ?? 0,
  };

  // Determine health status based on growth rates
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (growthRates.shopee < 0 || growthRates.tiktok_shop < 0) {
    healthStatus = 'critical';
  } else if (growthRates.shopee < 0.05 || growthRates.tiktok_shop < 0.05) {
    healthStatus = 'warning';
  }

  // Build summary
  const totalNewProducts = newProducts.shopee + newProducts.tiktok_shop;
  const summary = `New products: ${totalNewProducts.toLocaleString()}. Shopee growth: ${(growthRates.shopee * 100).toFixed(1)}%, TikTok growth: ${(growthRates.tiktok_shop * 100).toFixed(1)}%.`;

  return { data: { newProducts, trendingProducts, growthRates }, summary, healthStatus };
}

/**
 * Build unified release ops view
 */
export async function buildUnifiedReleaseOpsView(
  input: UnifiedOpsViewBuilderInput
): Promise<{
  data: ReleaseOpsData;
  summary: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics } = input;

  const readinessScores: ReleaseOpsData['readinessScores'] = {
    shopee: shopeeMetrics.releaseReadinessScore ?? 1.0,
    tiktok_shop: tiktokMetrics.releaseReadinessScore ?? 0.5,
  };

  const pendingReleases: ReleaseOpsData['pendingReleases'] = {
    shopee: shopeeMetrics.pendingReleases ?? 0,
    tiktok_shop: tiktokMetrics.pendingReleases ?? 0,
  };

  const failedReleases: ReleaseOpsData['failedReleases'] = {
    shopee: shopeeMetrics.failedReleases ?? 0,
    tiktok_shop: tiktokMetrics.failedReleases ?? 0,
  };

  // Determine health status
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (readinessScores.tiktok_shop < 0.5 || failedReleases.tiktok_shop > 3) {
    healthStatus = 'critical';
  } else if (readinessScores.tiktok_shop < 0.7 || failedReleases.tiktok_shop > 1) {
    healthStatus = 'warning';
  }

  // Build summary
  const totalPending = pendingReleases.shopee + pendingReleases.tiktok_shop;
  const summary = `Pending releases: ${totalPending}. Shopee readiness: ${(readinessScores.shopee * 100).toFixed(0)}%, TikTok readiness: ${(readinessScores.tiktok_shop * 100).toFixed(0)}%.`;

  return { data: { readinessScores, pendingReleases, failedReleases }, summary, healthStatus };
}

/**
 * Build unified platform ops overview
 */
export async function buildUnifiedPlatformOpsOverview(
  input: UnifiedOpsViewBuilderInput
): Promise<{
  data: UnifiedOpsViewData['overview'];
  summary: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, lastSyncTimes } = input;

  const totalProducts: UnifiedOpsViewData['overview']['totalProducts'] = {
    shopee: shopeeMetrics.totalProducts ?? 0,
    tiktok_shop: tiktokMetrics.totalProducts ?? 0,
  };

  const activeProducts: UnifiedOpsViewData['overview']['activeProducts'] = {
    shopee: shopeeMetrics.activeProducts ?? 0,
    tiktok_shop: tiktokMetrics.activeProducts ?? 0,
  };

  const errorRates: UnifiedOpsViewData['overview']['errorRates'] = {
    shopee: shopeeMetrics.errorRate ?? 0,
    tiktok_shop: tiktokMetrics.errorRate ?? 0,
  };

  const lastSync: UnifiedOpsViewData['overview']['lastSyncTimes'] = {
    shopee: lastSyncTimes.shopee ?? new Date(),
    tiktok_shop: lastSyncTimes.tiktok_shop ?? new Date(),
  };

  // Determine health status
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (errorRates.shopee > 0.1 || errorRates.tiktok_shop > 0.15) {
    healthStatus = 'critical';
  } else if (errorRates.shopee > 0.05 || errorRates.tiktok_shop > 0.1) {
    healthStatus = 'warning';
  }

  // Build summary
  const totalActive = activeProducts.shopee + activeProducts.tiktok_shop;
  const avgErrorRate = (errorRates.shopee + errorRates.tiktok_shop) / 2;
  const summary = `Total active products: ${totalActive.toLocaleString()}. Avg error rate: ${(avgErrorRate * 100).toFixed(2)}%. Shopee last sync: ${lastSync.shopee.toISOString()}, TikTok last sync: ${lastSync.tiktok_shop.toISOString()}.`;

  return {
    data: {
      totalProducts,
      activeProducts,
      errorRates,
      lastSyncTimes: lastSync,
    },
    summary,
    healthStatus,
  };
}

// Helper functions

function determineProductOpsHealth(metrics: CrossPlatformMetricComparison[]): 'healthy' | 'warning' | 'critical' {
  const relevantMetrics = metrics.filter((m) =>
    ['discoverySuccessRate', 'detailExtractionSuccess', 'enrichmentSuccessRate'].includes(m.metricKey)
  );

  if (relevantMetrics.length === 0) return 'healthy';

  const failingCount = relevantMetrics.filter((m) => m.isDrift).length;
  const failingRatio = failingCount / relevantMetrics.length;

  if (failingRatio > 0.5) return 'critical';
  if (failingRatio > 0.25) return 'warning';

  return 'healthy';
}

function determineCommercialOpsHealth(metrics: CrossPlatformMetricComparison[]): 'healthy' | 'warning' | 'critical' {
  const relevantMetrics = metrics.filter((m) =>
    ['totalRevenue', 'conversionRate', 'attributedSales'].includes(m.metricKey)
  );

  if (relevantMetrics.length === 0) return 'healthy';

  const driftingCount = relevantMetrics.filter((m) => m.isDrift).length;
  const driftingRatio = driftingCount / relevantMetrics.length;

  if (driftingRatio > 0.5) return 'critical';
  if (driftingRatio > 0.25) return 'warning';

  return 'healthy';
}

function buildProductOpsSummary(
  discovery: ProductOpsData['discovery'],
  detail: ProductOpsData['detail'],
  enrichment: ProductOpsData['enrichment']
): string {
  const shopeeDiscoveryRate = (discovery.shopee.discoverySuccessRate as number) ?? 0;
  const tiktokDiscoveryRate = (discovery.tiktok.discoverySuccessRate as number) ?? 0;
  const shopeeDetailRate = (detail.shopee.detailExtractionSuccess as number) ?? 0;
  const tiktokDetailRate = (detail.tiktok.detailExtractionSuccess as number) ?? 0;
  const shopeeEnrichRate = (enrichment.shopee.enrichmentSuccessRate as number) ?? 0;
  const tiktokEnrichRate = (enrichment.tiktok.enrichmentSuccessRate as number) ?? 0;

  return `Discovery: Shopee ${(shopeeDiscoveryRate * 100).toFixed(0)}%, TikTok ${(tiktokDiscoveryRate * 100).toFixed(0)}%. Detail: Shopee ${(shopeeDetailRate * 100).toFixed(0)}%, TikTok ${(tiktokDetailRate * 100).toFixed(0)}%. Enrichment: Shopee ${(shopeeEnrichRate * 100).toFixed(0)}%, TikTok ${(tiktokEnrichRate * 100).toFixed(0)}%.`;
}
