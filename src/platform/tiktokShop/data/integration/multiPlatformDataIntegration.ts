/**
 * Multi-Platform Data Integration
 * Integrates TikTok Shop data readiness into multi-platform foundation
 */

import type { TikTokShopDataReadinessSummary, TikTokShopSourceReadinessResult } from '../types.js';
import { TikTokShopReadinessStatus } from '../types.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Data capability snapshot for multi-platform foundation
 */
export interface TikTokShopDataCapabilitySnapshot {
  platform: string;
  dataLayerReady: boolean;
  contextReady: boolean;
  promotionSourceReady: boolean;
  qualityScore: number;
  freshnessScore: number;
  readinessStatus: TikTokShopReadinessStatus;
  blockers: number;
  warnings: number;
  lastUpdated: Date;
}

/**
 * Data readiness signals for platform registry
 */
export interface TikTokShopDataReadinessSignals {
  platform: string;
  canAcquireProductData: boolean;
  canAcquirePromotionData: boolean;
  contextEnrichmentReady: boolean;
  promotionResolutionReady: boolean;
  signals: Record<string, unknown>;
}

/**
 * Platform registry data update
 */
export interface PlatformRegistryDataUpdate {
  platformKey: string;
  dataCapabilities: {
    productData: boolean;
    promotionData: boolean;
    sellerData: boolean;
    categoryData: boolean;
    priceData: boolean;
  };
  readiness: {
    status: string;
    score: number;
  };
  metadata: Record<string, unknown>;
}

/**
 * Build data capability snapshot
 */
export async function buildTikTokShopDataCapabilitySnapshot(
  readinessSummary: TikTokShopDataReadinessSummary
): Promise<TikTokShopDataCapabilitySnapshot> {
  logger.info({ msg: 'Building TikTok Shop data capability snapshot' });

  return {
    platform: 'tiktok_shop',
    dataLayerReady: readinessSummary.readinessStatus === TikTokShopReadinessStatus.READY,
    contextReady: readinessSummary.contextScore >= 0.5,
    promotionSourceReady: readinessSummary.promotionSourceScore >= 0.5,
    qualityScore: readinessSummary.qualityScore,
    freshnessScore: readinessSummary.freshnessScore,
    readinessStatus: readinessSummary.readinessStatus,
    blockers: readinessSummary.blockers?.length || 0,
    warnings: readinessSummary.warnings?.length || 0,
    lastUpdated: new Date(),
  };
}

/**
 * Build data readiness signals
 */
export async function buildTikTokShopDataReadinessSignals(
  readinessSummary: TikTokShopDataReadinessSummary
): Promise<TikTokShopDataReadinessSignals> {
  logger.info({ msg: 'Building TikTok Shop data readiness signals' });

  return {
    platform: 'tiktok_shop',
    canAcquireProductData: readinessSummary.contextScore >= 0.4,
    canAcquirePromotionData: readinessSummary.promotionSourceScore >= 0.3,
    contextEnrichmentReady: readinessSummary.contextScore >= 0.5,
    promotionResolutionReady: readinessSummary.promotionSourceScore >= 0.5,
    signals: {
      contextScore: readinessSummary.contextScore,
      promotionScore: readinessSummary.promotionSourceScore,
      qualityScore: readinessSummary.qualityScore,
      freshnessScore: readinessSummary.freshnessScore,
      overallScore: readinessSummary.overallScore,
      blockers: readinessSummary.blockers?.length || 0,
      warnings: readinessSummary.warnings?.length || 0,
    },
  };
}

/**
 * Build platform registry data update
 */
export async function buildPlatformRegistryDataUpdate(
  readinessSummary: TikTokShopDataReadinessSummary
): Promise<PlatformRegistryDataUpdate> {
  logger.info({ msg: 'Building platform registry data update' });

  return {
    platformKey: 'tiktok_shop',
    dataCapabilities: {
      productData: readinessSummary.contextScore >= 0.4,
      promotionData: readinessSummary.promotionSourceScore >= 0.3,
      sellerData: readinessSummary.contextScore >= 0.5,
      categoryData: readinessSummary.contextScore >= 0.4,
      priceData: readinessSummary.contextScore >= 0.6,
    },
    readiness: {
      status: readinessSummary.readinessStatus,
      score: readinessSummary.overallScore,
    },
    metadata: {
      contextScore: readinessSummary.contextScore,
      promotionSourceScore: readinessSummary.promotionSourceScore,
      qualityScore: readinessSummary.qualityScore,
      freshnessScore: readinessSummary.freshnessScore,
      blockers: readinessSummary.blockers?.length || 0,
      warnings: readinessSummary.warnings?.length || 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Get platform expansion readiness for TikTok Shop
 */
export function getTikTokShopExpansionReadiness(
  snapshot: TikTokShopDataCapabilitySnapshot
): {
  canExpand: boolean;
  recommendation: 'proceed' | 'hold' | 'not_ready';
  reason: string;
} {
  if (snapshot.readinessStatus === TikTokShopReadinessStatus.NOT_READY) {
    return {
      canExpand: false,
      recommendation: 'not_ready',
      reason: 'Data layer is not ready for platform expansion',
    };
  }

  if (snapshot.readinessStatus === TikTokShopReadinessStatus.HOLD) {
    return {
      canExpand: false,
      recommendation: 'hold',
      reason: 'Data layer has critical blockers - address before expansion',
    };
  }

  if (!snapshot.dataLayerReady || !snapshot.contextReady) {
    return {
      canExpand: false,
      recommendation: 'hold',
      reason: 'Context enrichment not ready for production use',
    };
  }

  return {
    canExpand: true,
    recommendation: 'proceed',
    reason: 'Data foundation is ready for expansion',
  };
}

/**
 * Map TikTok Shop readiness to platform-neutral capability
 */
export function mapToPlatformNeutralCapability(
  snapshot: TikTokShopDataCapabilitySnapshot
): {
  platform: string;
  capabilities: {
    referenceResolution: boolean;
    contextResolution: boolean;
    promotionResolution: boolean;
    commercialAttribution: boolean;
  };
  readiness: {
    score: number;
    status: string;
  };
} {
  return {
    platform: snapshot.platform,
    capabilities: {
      referenceResolution: snapshot.contextReady,
      contextResolution: snapshot.contextReady,
      promotionResolution: snapshot.promotionSourceReady,
      commercialAttribution: snapshot.dataLayerReady,
    },
    readiness: {
      score: snapshot.qualityScore,
      status: snapshot.readinessStatus,
    },
  };
}
