/**
 * Product Ops Parity Integration
 * Integrates Product Ops data into unified parity surfaces
 */

import type {
  PlatformKey,
  PlatformParityScope,
  CrossPlatformMetricComparison,
} from '../types.js';

export interface ProductOpsInput {
  shopeeDiscoveryMetrics: Record<string, number>;
  tiktokDiscoveryMetrics: Record<string, number>;
  shopeeDetailMetrics: Record<string, number>;
  tiktokDetailMetrics: Record<string, number>;
  shopeeEnrichmentMetrics: Record<string, number>;
  tiktokEnrichmentMetrics: Record<string, number>;
}

export interface CrossPlatformReviewLoad {
  platform: PlatformKey;
  totalItems: number;
  pendingItems: number;
  inProgressItems: number;
  completedItems: number;
  errorItems: number;
}

export interface CrossPlatformRemediationPressure {
  platform: PlatformKey;
  criticalItems: number;
  highPriorityItems: number;
  mediumPriorityItems: number;
  lowPriorityItems: number;
  estimatedResolutionDays: number;
}

/**
 * Build unified product ops inputs
 */
export async function buildUnifiedProductOpsInputs(
  input: ProductOpsInput
): Promise<{
  discovery: Record<PlatformKey, Record<string, number>>;
  detail: Record<PlatformKey, Record<string, number>>;
  enrichment: Record<PlatformKey, Record<string, number>>;
  overallHealth: 'healthy' | 'warning' | 'critical';
}> {
  const discovery = {
    shopee: input.shopeeDiscoveryMetrics,
    tiktok_shop: input.tiktokDiscoveryMetrics,
  };

  const detail = {
    shopee: input.shopeeDetailMetrics,
    tiktok_shop: input.tiktokDetailMetrics,
  };

  const enrichment = {
    shopee: input.shopeeEnrichmentMetrics,
    tiktok_shop: input.tiktokEnrichmentMetrics,
  };

  // Calculate overall health
  const overallHealth = calculateProductOpsHealth(discovery, detail, enrichment);

  return { discovery, detail, enrichment, overallHealth };
}

/**
 * Build cross-platform review load summary
 */
export async function buildCrossPlatformReviewLoadSummary(
  shopeeReviewData: {
    totalItems: number;
    pendingItems: number;
    inProgressItems: number;
    completedItems: number;
    errorItems: number;
  },
  tiktokReviewData: {
    totalItems: number;
    pendingItems: number;
    inProgressItems: number;
    completedItems: number;
    errorItems: number;
  }
): Promise<{
  shopee: CrossPlatformReviewLoad;
  tiktok: CrossPlatformReviewLoad;
  comparison: {
    totalItems: number;
    pendingItems: number;
    errorItems: number;
    loadBalanceRatio: number;
  };
}> {
  const shopee: CrossPlatformReviewLoad = {
    platform: 'shopee',
    ...shopeeReviewData,
  };

  const tiktok: CrossPlatformReviewLoad = {
    platform: 'tiktok_shop',
    ...tiktokReviewData,
  };

  const totalItems = shopee.totalItems + tiktok.totalItems;
  const pendingItems = shopee.pendingItems + tiktok.pendingItems;
  const errorItems = shopee.errorItems + tiktok.errorItems;

  // Calculate load balance (0 = perfectly balanced, higher = imbalanced)
  const shopeeRatio = shopee.totalItems / Math.max(totalItems, 1);
  const tiktokRatio = tiktok.totalItems / Math.max(totalItems, 1);
  const loadBalanceRatio = Math.abs(shopeeRatio - tiktokRatio);

  return {
    shopee,
    tiktok,
    comparison: {
      totalItems,
      pendingItems,
      errorItems,
      loadBalanceRatio,
    },
  };
}

/**
 * Build cross-platform remediation pressure summary
 */
export async function buildCrossPlatformRemediationPressureSummary(
  shopeeRemediationData: {
    criticalItems: number;
    highPriorityItems: number;
    mediumPriorityItems: number;
    lowPriorityItems: number;
  },
  tiktokRemediationData: {
    criticalItems: number;
    highPriorityItems: number;
    mediumPriorityItems: number;
    lowPriorityItems: number;
  }
): Promise<{
  shopee: CrossPlatformRemediationPressure;
  tiktok: CrossPlatformRemediationPressure;
  totalPressure: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}> {
  const calculateEstDays = (data: typeof shopeeRemediationData): number => {
    const weightedItems =
      data.criticalItems * 1 +
      data.highPriorityItems * 2 +
      data.mediumPriorityItems * 3 +
      data.lowPriorityItems * 5;
    return Math.ceil(weightedItems / 8); // Assuming 8 items per day capacity
  };

  const shopee: CrossPlatformRemediationPressure = {
    platform: 'shopee',
    ...shopeeRemediationData,
    estimatedResolutionDays: calculateEstDays(shopeeRemediationData),
  };

  const tiktok: CrossPlatformRemediationPressure = {
    platform: 'tiktok_shop',
    ...tiktokRemediationData,
    estimatedResolutionDays: calculateEstDays(tiktokRemediationData),
  };

  // Calculate total pressure
  const totalCritical = shopee.criticalItems + tiktok.criticalItems;
  const totalHigh = shopee.highPriorityItems + tiktok.highPriorityItems;
  const totalItems =
    totalCritical +
    totalHigh +
    shopee.mediumPriorityItems +
    tiktok.mediumPriorityItems;

  let totalPressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (totalCritical > 5 || totalItems > 50) {
    totalPressure = 'critical';
  } else if (totalCritical > 2 || totalHigh > 10 || totalItems > 30) {
    totalPressure = 'high';
  } else if (totalHigh > 5 || totalItems > 15) {
    totalPressure = 'medium';
  }

  // Generate recommendation
  let recommendation = '';
  if (totalPressure === 'critical') {
    recommendation = 'Immediate action required. Consider escalating to leadership.';
  } else if (totalPressure === 'high') {
    recommendation = 'Prioritize remediation in current sprint.';
  } else if (totalPressure === 'medium') {
    recommendation = 'Schedule remediation for upcoming sprint.';
  } else {
    recommendation = 'Remediation load is manageable.';
  }

  return { shopee, tiktok, totalPressure, recommendation };
}

// Helper functions

function calculateProductOpsHealth(
  discovery: Record<PlatformKey, Record<string, number>>,
  detail: Record<PlatformKey, Record<string, number>>,
  enrichment: Record<PlatformKey, Record<string, number>>
): 'healthy' | 'warning' | 'critical' {
  // Check discovery health
  const shopeeDiscoveryRate = discovery.shopee.discoverySuccessRate ?? 0;
  const tiktokDiscoveryRate = discovery.tiktok_shop?.discoverySuccessRate ?? 0;

  // Check detail health
  const shopeeDetailRate = detail.shopee.detailExtractionSuccess ?? 0;
  const tiktokDetailRate = detail.tiktok_shop?.detailExtractionSuccess ?? 0;

  // Check enrichment health
  const shopeeEnrichRate = enrichment.shopee.enrichmentSuccessRate ?? 0;
  const tiktokEnrichRate = enrichment.tiktok_shop?.enrichmentSuccessRate ?? 0;

  // Calculate average rates
  const shopeeAvg = (shopeeDiscoveryRate + shopeeDetailRate + shopeeEnrichRate) / 3;
  const tiktokAvg =
    (tiktokDiscoveryRate + tiktokDetailRate + tiktokEnrichRate) / 3;

  // Determine health
  if (shopeeAvg < 0.6 || tiktokAvg < 0.5) {
    return 'critical';
  }
  if (shopeeAvg < 0.75 || tiktokAvg < 0.65) {
    return 'warning';
  }

  return 'healthy';
}
