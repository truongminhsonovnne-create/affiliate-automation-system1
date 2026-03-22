/**
 * TikTok Shop Data Freshness Service
 * Evaluates data freshness and staleness for TikTok Shop data
 */

import type {
  TikTokShopProductSnapshot,
  TikTokShopFreshnessStatus,
} from '../types.js';
import { TikTokShopFreshnessStatus as FreshnessStatusEnum } from '../types.js';
import { TIKTOK_SHOP_FRESHNESS_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Freshness evaluation result
 */
export interface TikTokShopFreshnessResult {
  referenceKey: string;
  freshnessStatus: TikTokShopFreshnessStatus;
  ageSeconds: number;
  isFresh: boolean;
  isStale: boolean;
  isExpired: boolean;
  shouldRefresh: boolean;
  refreshPriority: 'high' | 'medium' | 'low' | 'none';
}

/**
 * Freshness summary
 */
export interface TikTokShopFreshnessSummary {
  totalSnapshots: number;
  freshSnapshots: number;
  staleSnapshots: number;
  expiredSnapshots: number;
  unknownSnapshots: number;
  averageAgeSeconds: number;
  refreshRecommendations: string[];
}

/**
 * Evaluate freshness for a single snapshot
 */
export function evaluateTikTokShopDataFreshness(snapshot: TikTokShopProductSnapshot): TikTokShopFreshnessResult {
  const now = new Date();
  const snapshotTime = snapshot.snapshotTime || snapshot.createdAt;
  const ageSeconds = (now.getTime() - snapshotTime.getTime()) / 1000;

  const isFresh = ageSeconds <= TIKTOK_SHOP_FRESHNESS_CONFIG.FRESH_THRESHOLD_SECONDS;
  const isStale = ageSeconds > TIKTOK_SHOP_FRESHNESS_CONFIG.STALE_THRESHOLD_SECONDS;
  const isExpired = ageSeconds > TIKTOK_SHOP_FRESHNESS_CONFIG.EXPIRED_THRESHOLD_SECONDS;

  let freshnessStatus: TikTokShopFreshnessStatus;
  if (isExpired) {
    freshnessStatus = FreshnessStatusEnum.EXPIRED;
  } else if (isStale) {
    freshnessStatus = FreshnessStatusEnum.STALE;
  } else if (isFresh) {
    freshnessStatus = FreshnessStatusEnum.FRESH;
  } else {
    freshnessStatus = FreshnessStatusEnum.UNKNOWN;
  }

  let shouldRefresh = false;
  let refreshPriority: 'high' | 'medium' | 'low' | 'none' = 'none';

  if (isExpired) {
    shouldRefresh = true;
    refreshPriority = 'high';
  } else if (isStale) {
    shouldRefresh = true;
    refreshPriority = 'medium';
  } else if (!isFresh && ageSeconds > TIKTOK_SHOP_FRESHNESS_CONFIG.AUTO_REFRESH_THRESHOLD_SECONDS) {
    if (TIKTOK_SHOP_FRESHNESS_CONFIG.AUTO_REFRESH_ENABLED) {
      shouldRefresh = true;
      refreshPriority = 'low';
    }
  }

  return {
    referenceKey: snapshot.canonicalReferenceKey,
    freshnessStatus,
    ageSeconds,
    isFresh,
    isStale,
    isExpired,
    shouldRefresh,
    refreshPriority,
  };
}

/**
 * Detect stale snapshots
 */
export function detectStaleTikTokShopSnapshots(
  snapshots: TikTokShopProductSnapshot[]
): {
  staleSnapshots: TikTokShopFreshnessResult[];
  expiredSnapshots: TikTokShopFreshnessResult[];
  shouldRefreshSnapshots: TikTokShopFreshnessResult[];
} {
  const staleSnapshots: TikTokShopFreshnessResult[] = [];
  const expiredSnapshots: TikTokShopFreshnessResult[] = [];
  const shouldRefreshSnapshots: TikTokShopFreshnessResult[] = [];

  for (const snapshot of snapshots) {
    const freshness = evaluateTikTokShopDataFreshness(snapshot);

    if (freshness.isStale) {
      staleSnapshots.push(freshness);
    }

    if (freshness.isExpired) {
      expiredSnapshots.push(freshness);
    }

    if (freshness.shouldRefresh) {
      shouldRefreshSnapshots.push(freshness);
    }
  }

  return {
    staleSnapshots,
    expiredSnapshots,
    shouldRefreshSnapshots,
  };
}

/**
 * Build freshness summary
 */
export function buildTikTokShopFreshnessSummary(
  snapshots: TikTokShopProductSnapshot[]
): TikTokShopFreshnessSummary {
  logger.info({ msg: 'Building freshness summary', count: snapshots.length });

  const freshnessResults = snapshots.map(evaluateTikTokShopDataFreshness);

  const freshSnapshots = freshnessResults.filter((r) => r.isFresh).length;
  const staleSnapshots = freshnessResults.filter((r) => r.isStale).length;
  const expiredSnapshots = freshnessResults.filter((r) => r.isExpired).length;
  const unknownSnapshots = freshnessResults.filter(
    (r) => r.freshnessStatus === FreshnessStatusEnum.UNKNOWN
  ).length;

  const totalAge = freshnessResults.reduce((sum, r) => sum + r.ageSeconds, 0);
  const averageAgeSeconds = freshnessResults.length > 0 ? totalAge / freshnessResults.length : 0;

  // Generate recommendations
  const refreshRecommendations: string[] = [];

  if (expiredSnapshots > 0) {
    refreshRecommendations.push(
      `${expiredSnapshots} snapshot(s) expired - immediate refresh required`
    );
  }

  if (staleSnapshots > 0) {
    refreshRecommendations.push(
      `${staleSnapshots} snapshot(s) stale - refresh recommended soon`
    );
  }

  if (freshSnapshots === 0 && snapshots.length > 0) {
    refreshRecommendations.push(
      'No fresh snapshots - data acquisition may be failing'
    );
  }

  if (averageAgeSeconds > TIKTOK_SHOP_FRESHNESS_CONFIG.STALE_THRESHOLD_SECONDS) {
    refreshRecommendations.push(
      `Average data age is ${(averageAgeSeconds / 3600).toFixed(1)} hours - consider more frequent updates`
    );
  }

  return {
    totalSnapshots: snapshots.length,
    freshSnapshots,
    staleSnapshots,
    expiredSnapshots,
    unknownSnapshots,
    averageAgeSeconds,
    refreshRecommendations,
  };
}

/**
 * Update snapshot freshness status
 */
export function updateSnapshotFreshnessStatus(
  snapshot: TikTokShopProductSnapshot
): TikTokShopProductSnapshot {
  const freshness = evaluateTikTokShopDataFreshness(snapshot);

  return {
    ...snapshot,
    freshnessStatus: freshness.freshnessStatus,
  };
}

/**
 * Determine if data is fresh enough for a specific use case
 */
export function isDataFreshEnoughForUseCase(
  snapshot: TikTokShopProductSnapshot,
  useCase: 'real_time_resolution' | 'batch_resolution' | 'analytics' | 'reporting'
): boolean {
  const freshness = evaluateTikTokShopDataFreshness(snapshot);

  const thresholds: Record<string, number> = {
    real_time_resolution: TIKTOK_SHOP_FRESHNESS_CONFIG.FRESH_THRESHOLD_SECONDS,
    batch_resolution: TIKTOK_SHOP_FRESHNESS_CONFIG.STALE_THRESHOLD_SECONDS,
    analytics: TIKTOK_SHOP_FRESHNESS_CONFIG.EXPIRED_THRESHOLD_SECONDS / 2,
    reporting: TIKTOK_SHOP_FRESHNESS_CONFIG.EXPIRED_THRESHOLD_SECONDS,
  };

  const threshold = thresholds[useCase] || TIKTOK_SHOP_FRESHNESS_CONFIG.STALE_THRESHOLD_SECONDS;
  return freshness.ageSeconds <= threshold;
}

/**
 * Get TTL for different data types
 */
export function getDataTTL(dataType: 'product' | 'enrichment' | 'promotion' | 'context'): number {
  switch (dataType) {
    case 'product':
      return TIKTOK_SHOP_FRESHNESS_CONFIG.PRODUCT_SNAPSHOT_TTL;
    case 'enrichment':
      return TIKTOK_SHOP_FRESHNESS_CONFIG.ENRICHMENT_TTL;
    case 'promotion':
      return TIKTOK_SHOP_FRESHNESS_CONFIG.PROMOTION_TTL;
    case 'context':
      return TIKTOK_SHOP_FRESHNESS_CONFIG.CONTEXT_TTL;
    default:
      return TIKTOK_SHOP_FRESHNESS_CONFIG.PRODUCT_SNAPSHOT_TTL;
  }
}
