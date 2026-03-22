/**
 * TikTok Shop Data Metrics
 * Observability metrics for TikTok Shop data foundation
 */

import { logger } from '../../../../utils/logger.js';

/**
 * Metrics collector for TikTok Shop data foundation
 */
export class TikTokShopDataMetrics {
  private metrics: Map<string, number> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
    logger.debug({ msg: 'Metric incremented', name, labels, value: current + 1 });
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.metrics.set(key, value);
    logger.debug({ msg: 'Gauge set', name, labels, value });
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  /**
   * Get metric value
   */
  getMetric(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.metrics.get(key) || 0;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

// Singleton instance
let metricsInstance: TikTokShopDataMetrics | null = null;

export function getTikTokShopDataMetrics(): TikTokShopDataMetrics {
  if (!metricsInstance) {
    metricsInstance = new TikTokShopDataMetrics();
  }
  return metricsInstance;
}

// ============================================================================
// Specific Metrics
// ============================================================================

/**
 * Record source health check
 */
export function recordSourceHealthCheck(sourceKey: string, healthStatus: string): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_source_health_total', { sourceKey, status: healthStatus });
}

/**
 * Record acquisition run
 */
export function recordAcquisitionRun(sourceKey: string, status: string, itemsSeen: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_acquisition_runs_total', { sourceKey, status });
  metrics.observeHistogram('tiktok_shop_acquisition_items_total', itemsSeen, { sourceKey });
}

/**
 * Record normalized records
 */
export function recordNormalizedRecords(sourceKey: string, count: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_normalized_records_total', { sourceKey });
  metrics.observeHistogram('tiktok_shop_normalized_records_count', count, { sourceKey });
}

/**
 * Record enriched records
 */
export function recordEnrichedRecords(sourceKey: string, count: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_enriched_records_total', { sourceKey });
  metrics.observeHistogram('tiktok_shop_enriched_records_count', count, { sourceKey });
}

/**
 * Record blockers
 */
export function recordBlockers(blockerType: string, severity: string): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_blockers_total', { type: blockerType, severity });
}

/**
 * Record warnings
 */
export function recordWarnings(warningType: string, severity: string): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_warnings_total', { type: warningType, severity });
}

/**
 * Record freshness issues
 */
export function recordFreshnessIssue(referenceKey: string, freshnessStatus: string): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.incrementCounter('tiktok_shop_freshness_issues_total', { referenceKey, status: freshnessStatus });
}

/**
 * Set current data layer readiness score
 */
export function setDataReadinessScore(score: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.setGauge('tiktok_shop_data_readiness_score', score);
}

/**
 * Set context readiness score
 */
export function setContextReadinessScore(score: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.setGauge('tiktok_shop_context_readiness_score', score);
}

/**
 * Set promotion source readiness score
 */
export function setPromotionSourceReadinessScore(score: number): void {
  const metrics = getTikTokShopDataMetrics();
  metrics.setGauge('tiktok_shop_promotion_source_readiness_score', score);
}
