/**
 * TikTok Shop Acquisition Health Service
 * Evaluates runtime and acquisition health
 */

import type { TikTokShopAcquisitionHealth, TikTokShopRuntimeHealthStatus } from '../types.js';
import { TikTokShopRuntimeHealthStatus } from '../types.js';
import { TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

export interface TikTokShopHealthMetrics {
  activeSessions: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  consecutiveFailures: number;
}

/**
 * Evaluate acquisition health
 */
export async function evaluateTikTokShopAcquisitionHealth(): Promise<TikTokShopAcquisitionHealth> {
  logger.info({ msg: 'Evaluating TikTok Shop acquisition health' });

  // In production, this would fetch actual metrics
  const metrics: TikTokShopHealthMetrics = {
    activeSessions: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    consecutiveFailures: 0,
  };

  return detectTikTokShopAcquisitionDegradation(metrics);
}

/**
 * Detect acquisition degradation
 */
export function detectTikTokShopAcquisitionDegradation(
  metrics: TikTokShopHealthMetrics
): TikTokShopAcquisitionHealth {
  const successRate = metrics.totalRequests > 0
    ? metrics.successfulRequests / metrics.totalRequests
    : 1;

  const errorRate = metrics.totalRequests > 0
    ? metrics.failedRequests / metrics.totalRequests
    : 0;

  // Determine health status
  let runtimeHealth: TikTokShopRuntimeHealthStatus;

  if (errorRate > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.UNHEALTHY_ERROR_RATE) {
    runtimeHealth = TikTokShopRuntimeHealthStatus.UNHEALTHY;
  } else if (errorRate > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.DEGRADED_ERROR_RATE ||
    metrics.averageResponseTime > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.DEGRADED_RESPONSE_TIME_MS) {
    runtimeHealth = TikTokShopRuntimeHealthStatus.DEGRADED;
  } else if (successRate >= TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.MIN_SUCCESS_RATE) {
    runtimeHealth = TikTokShopRuntimeHealthStatus.HEALTHY;
  } else {
    runtimeHealth = TikTokShopRuntimeHealthStatus.UNKNOWN;
  }

  // Calculate health score
  const healthScore = successRate * (1 - (errorRate * 0.5));

  // Determine throttle/pause
  const shouldThrottle = errorRate > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.THROTTLE_ON_ERROR_RATE_ABOVE ||
    runtimeHealth === TikTokShopRuntimeHealthStatus.DEGRADED;

  const shouldPause = errorRate > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.PAUSE_ON_ERROR_RATE_ABOVE ||
    metrics.consecutiveFailures >= TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.PAUSE_ON_CONSECUTIVE_FAILURES ||
    runtimeHealth === TikTokShopRuntimeHealthStatus.UNHEALTHY;

  const pauseReasons: string[] = [];
  if (errorRate > TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.PAUSE_ON_ERROR_RATE_ABOVE) {
    pauseReasons.push(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`);
  }
  if (metrics.consecutiveFailures >= TIKTOK_SHOP_RUNTIME_HEALTH_THRESHOLDS.PAUSE_ON_CONSECUTIVE_FAILURES) {
    pauseReasons.push(`${metrics.consecutiveFailures} consecutive failures`);
  }
  if (runtimeHealth === TikTokShopRuntimeHealthStatus.UNHEALTHY) {
    pauseReasons.push('Runtime health is unhealthy');
  }

  return {
    runtimeHealth,
    healthScore,
    activeSessions: metrics.activeSessions,
    failedRequests: metrics.failedRequests,
    successRate,
    averageResponseTime: metrics.averageResponseTime,
    shouldThrottle,
    shouldPause,
    pauseReasons,
  };
}

/**
 * Build acquisition health summary
 */
export function buildTikTokShopAcquisitionHealthSummary(
  health: TikTokShopAcquisitionHealth
): {
  status: string;
  healthScore: number;
  shouldThrottle: boolean;
  shouldPause: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  if (health.shouldPause) {
    recommendations.push('Pause acquisition - critical error rate or consecutive failures');
  } else if (health.shouldThrottle) {
    recommendations.push('Throttle acquisition - elevated error rate detected');
  }

  if (health.successRate < 0.8) {
    recommendations.push('Success rate below 80% - investigate failures');
  }

  if (health.averageResponseTime > 10000) {
    recommendations.push('Average response time above 10s - consider optimization');
  }

  return {
    status: health.runtimeHealth,
    healthScore: health.healthScore,
    shouldThrottle: health.shouldThrottle,
    shouldPause: health.shouldPause,
    recommendations,
  };
}
