/**
 * TikTok Shop Source Health Service
 * Evaluates health status for TikTok Shop data sources
 */

import type {
  TikTokShopSourceHealthResult,
  TikTokShopSourceHealthCheck,
  TikTokShopDataSource,
} from '../types.js';
import { TikTokShopSourceHealthStatus } from '../types.js';
import { TIKTOK_SHOP_SOURCE_READINESS_THRESHOLDS } from '../constants.js';
import { getTikTokShopSourceByKey, updateTikTokShopSourceHealth } from '../sourceRegistry/tiktokShopSourceRegistry.js';
import {
  createTikTokShopManualSampleSource,
  createTikTokShopImportFileSource,
  createTikTokShopApiProductSource,
  createTikTokShopApiPromotionSource,
  createTikTokShopWebScraperSource,
  createTikTokShopAffiliateApiSource,
} from '../sources/tiktokShopPlaceholderApiSource.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Get source adapter by source key
 */
function getSourceAdapter(sourceKey: string) {
  const adapters: Record<string, ReturnType<typeof createTikTokShopManualSampleSource>> = {
    manual_sample: createTikTokShopManualSampleSource(),
    import_file: createTikTokShopImportFileSource(),
    tiktok_api_product: createTikTokShopApiProductSource(),
    tiktok_api_promotion: createTikTokShopApiPromotionSource(),
    tiktok_web_scraper: createTikTokShopWebScraperSource(),
    tiktok_affiliate_api: createTikTokShopAffiliateApiSource(),
  };

  return adapters[sourceKey] || null;
}

/**
 * Evaluate health for a single TikTok Shop source
 */
export async function evaluateTikTokShopSourceHealth(
  sourceKey: string,
  persistResult: boolean = true
): Promise<TikTokShopSourceHealthResult> {
  logger.info({ msg: 'Evaluating TikTok Shop source health', sourceKey });

  const adapter = getSourceAdapter(sourceKey);
  if (!adapter) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  const healthResult = await adapter.healthCheck();

  // Persist health result if requested
  if (persistResult) {
    try {
      await updateTikTokShopSourceHealth(sourceKey, healthResult.healthStatus, {
        healthScore: healthResult.healthScore,
        checks: healthResult.checks,
        lastChecked: healthResult.lastChecked.toISOString(),
      });
      logger.info({
        msg: 'Source health persisted',
        sourceKey,
        healthStatus: healthResult.healthStatus,
        healthScore: healthResult.healthScore,
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to persist source health',
        sourceKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return healthResult;
}

/**
 * Evaluate health for all TikTok Shop sources
 */
export async function evaluateAllTikTokShopSourceHealth(
  persistResults: boolean = true
): Promise<TikTokShopSourceHealthResult[]> {
  logger.info({ msg: 'Evaluating health for all TikTok Shop sources' });

  const sourceKeys = [
    'manual_sample',
    'import_file',
    'tiktok_api_product',
    'tiktok_api_promotion',
    'tiktok_web_scraper',
    'tiktok_affiliate_api',
  ];

  const results: TikTokShopSourceHealthResult[] = [];

  for (const sourceKey of sourceKeys) {
    try {
      const result = await evaluateTikTokShopSourceHealth(sourceKey, persistResults);
      results.push(result);
    } catch (error) {
      logger.error({
        msg: 'Failed to evaluate source health',
        sourceKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Add failed result
      results.push({
        sourceKey,
        healthStatus: TikTokShopSourceHealthStatus.UNKNOWN,
        healthScore: 0,
        checks: [],
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  return results;
}

/**
 * Build health summary for all sources
 */
export async function buildTikTokShopSourceHealthSummary(): Promise<{
  sources: TikTokShopSourceHealthResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    averageHealthScore: number;
  };
}> {
  const results = await evaluateAllTikTokShopSourceHealth(true);

  const summary = {
    total: results.length,
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    unknown: 0,
    averageHealthScore: 0,
  };

  let totalScore = 0;

  for (const result of results) {
    switch (result.healthStatus) {
      case TikTokShopSourceHealthStatus.HEALTHY:
        summary.healthy++;
        break;
      case TikTokShopSourceHealthStatus.DEGRADED:
        summary.degraded++;
        break;
      case TikTokShopSourceHealthStatus.UNHEALTHY:
        summary.unhealthy++;
        break;
      default:
        summary.unknown++;
    }
    totalScore += result.healthScore;
  }

  summary.averageHealthScore = summary.total > 0 ? totalScore / summary.total : 0;

  return {
    sources: results,
    summary,
  };
}

/**
 * Get health status for a specific source key
 */
export async function getTikTokShopSourceHealthStatus(sourceKey: string): Promise<TikTokShopSourceHealthStatus> {
  const source = await getTikTokShopSourceByKey(sourceKey);
  if (!source) {
    return TikTokShopSourceHealthStatus.UNKNOWN;
  }

  // If we have a recent health check, return cached status
  if (source.lastCheckedAt) {
    const hoursSinceLastCheck = (Date.now() - source.lastCheckedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastCheck < 1) {
      return source.healthStatus;
    }
  }

  // Run fresh health check
  const healthResult = await evaluateTikTokShopSourceHealth(sourceKey, true);
  return healthResult.healthStatus;
}

/**
 * Determine overall system health
 */
export function determineOverallSystemHealth(
  results: TikTokShopSourceHealthResult[]
): TikTokShopSourceHealthStatus {
  if (results.length === 0) {
    return TikTokShopSourceHealthStatus.UNKNOWN;
  }

  const healthyCount = results.filter((r) => r.healthStatus === TikTokShopSourceHealthStatus.HEALTHY).length;
  const healthyRatio = healthyCount / results.length;

  if (healthyRatio >= 0.8) {
    return TikTokShopSourceHealthStatus.HEALTHY;
  }

  const degradedCount = results.filter((r) => r.healthStatus === TikTokShopSourceHealthStatus.DEGRADED).length;
  const degradedRatio = degradedCount / results.length;

  if (degradedRatio >= 0.5 || healthyRatio >= 0.5) {
    return TikTokShopSourceHealthStatus.DEGRADED;
  }

  return TikTokShopSourceHealthStatus.UNHEALTHY;
}

/**
 * Get health recommendations based on results
 */
export function getHealthRecommendations(
  results: TikTokShopSourceHealthResult[]
): { priority: 'high' | 'medium' | 'low'; message: string }[] {
  const recommendations: { priority: 'high' | 'medium' | 'low'; message: string }[] = [];

  const healthy = results.filter((r) => r.healthStatus === TikTokShopSourceHealthStatus.HEALTHY);
  const unavailable = results.filter((r) => r.healthScore === 0);

  if (unavailable.length > 0) {
    recommendations.push({
      priority: 'high',
      message: `${unavailable.length} source(s) are completely unavailable - API access needed`,
    });
  }

  if (healthy.length === 0) {
    recommendations.push({
      priority: 'high',
      message: 'No healthy sources available - review data acquisition strategy',
    });
  }

  const avgScore = results.reduce((sum, r) => sum + r.healthScore, 0) / results.length;
  if (avgScore < 0.5) {
    recommendations.push({
      priority: 'medium',
      message: `Average health score is ${(avgScore * 100).toFixed(0)}% - below acceptable threshold`,
    });
  }

  return recommendations;
}
