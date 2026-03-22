/**
 * TikTok Shop Acquisition Metrics
 */

import { logger } from '../../../../utils/logger.js';

class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  increment(name: string, labels?: Record<string, string>) {
    const key = this.getKey(name, labels);
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  set(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getKey(name, labels);
    this.metrics.set(key, value);
  }

  get(name: string, labels?: Record<string, string>): number {
    return this.metrics.get(this.getKey(name, labels)) || 0;
  }

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }
}

const metrics = new MetricsCollector();

export function recordDiscoveryJob(status: string) {
  metrics.increment('tiktok_shop_discovery_jobs_total', { status });
}

export function recordCandidateDiscovered() {
  metrics.increment('tiktok_shop_candidates_discovered_total');
}

export function recordDetailJob(status: string) {
  metrics.increment('tiktok_shop_detail_jobs_total', { status });
}

export function recordExtractionQuality(score: number) {
  metrics.set('tiktok_shop_extraction_quality_score', score);
}

export function recordFailure(type: string) {
  metrics.increment('tiktok_shop_failures_total', { type });
}

export function recordPause() {
  metrics.increment('tiktok_shop_pause_count');
}

export function recordThrottle() {
  metrics.increment('tiktok_shop_throttle_count');
}

export function getMetrics() {
  return Object.fromEntries(metrics.metrics);
}
