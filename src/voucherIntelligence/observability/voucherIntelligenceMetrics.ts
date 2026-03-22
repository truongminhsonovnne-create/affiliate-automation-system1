/**
 * Voucher Intelligence Metrics
 */

import type { VoucherOptimizationSeverity, NoMatchRootCause } from '../types/index.js';

// ============================================================================
// In-Memory Metrics Store
// ============================================================================

interface MetricCounter {
  name: string;
  value: number;
  labels: Record<string, string>;
}

const metrics: Map<string, MetricCounter> = new Map();

// ============================================================================
// Metrics Functions
// ============================================================================

/**
 * Record outcome event ingestion count
 */
export function recordOutcomeEventIngestion(eventType: string): void {
  const key = `voucher_intel_events_ingested${buildLabelString({ event_type: eventType })}`;
  incrementMetric(key, { event_type: eventType });
}

/**
 * Record analysis run count
 */
export function recordAnalysisRun(success: boolean): void {
  const key = `voucher_intel_analysis_runs_total`;
  incrementMetric(key, { status: success ? 'success' : 'failure' });
}

/**
 * Record insight count
 */
export function recordInsightGenerated(severity: VoucherOptimizationSeverity): void {
  const key = `voucher_intel_insights_generated_total`;
  incrementMetric(key, { severity });
}

/**
 * Record no-match root cause count
 */
export function recordNoMatchRootCause(rootCause: NoMatchRootCause): void {
  const key = `voucher_intel_no_match_root_cause_total`;
  incrementMetric(key, { root_cause: rootCause });
}

/**
 * Record candidate vs best divergence count
 */
export function recordDivergenceDetected(divergenceType: string): void {
  const key = `voucher_intel_divergence_detected_total`;
  incrementMetric(key, { type: divergenceType });
}

/**
 * Record ranking tuning suggestion count
 */
export function recordRankingTuningSuggestion(type: string): void {
  const key = `voucher_intel_ranking_tuning_suggestions_total`;
  incrementMetric(key, { type });
}

// ============================================================================
// Metric Helpers
// ============================================================================

function buildLabelString(labels: Record<string, string>): string {
  if (Object.keys(labels).length === 0) return '';
  return `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`;
}

function getMetricKey(name: string, labels: Record<string, string>): string {
  return `${name}${buildLabelString(labels)}`;
}

function incrementMetric(name: string, labels: Record<string, string> = {}): void {
  const key = getMetricKey(name, labels);
  const existing = metrics.get(key);

  if (existing) {
    existing.value++;
  } else {
    metrics.set(key, { name, value: 1, labels });
  }
}

// ============================================================================
// Retrieval
// ============================================================================

/**
 * Get all metrics
 */
export function getMetrics(): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, metric] of metrics.entries()) {
    result[key] = metric.value;
  }

  return result;
}

/**
 * Get metric by name
 */
export function getMetricByName(name: string): number {
  let total = 0;

  for (const [key, metric] of metrics.entries()) {
    if (key.startsWith(name)) {
      total += metric.value;
    }
  }

  return total;
}

/**
 * Reset metrics
 */
export function resetMetrics(): void {
  metrics.clear();
}
