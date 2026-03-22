/**
 * Platform Parity Metrics
 * Observability metrics for platform parity hardening
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('platform-parity-metrics');

// Metric counters
const metrics = {
  snapshotCreated: 0,
  snapshotErrors: 0,
  gapDetected: 0,
  gapResolved: 0,
  exceptionRegistered: 0,
  comparisonBuilt: 0,
  surfaceBuilt: 0,
  decisionSupportGenerated: 0,
  backlogItemCreated: 0,
  hardeningCycleRun: 0,
  hardeningCycleErrors: 0,
};

/**
 * Increment a metric counter
 */
export function incrementMetric(metricName: keyof typeof metrics, value = 1): void {
  if (metricName in metrics) {
    metrics[metricName] += value;
  }

  logger.debug(`Metric incremented: ${metricName} = ${metrics[metricName]}`);
}

/**
 * Get current metric value
 */
export function getMetric(metricName: keyof typeof metrics): number {
  return metrics[metricName] ?? 0;
}

/**
 * Get all metrics
 */
export function getAllMetrics(): Record<string, number> {
  return { ...metrics };
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  Object.keys(metrics).forEach((key) => {
    metrics[key as keyof typeof metrics] = 0;
  });
  logger.info('Platform parity metrics reset');
}

/**
 * Record snapshot created
 */
export function recordSnapshotCreated(): void {
  incrementMetric('snapshotCreated');
}

/**
 * Record snapshot error
 */
export function recordSnapshotError(): void {
  incrementMetric('snapshotErrors');
}

/**
 * Record gap detected
 */
export function recordGapDetected(count = 1): void {
  incrementMetric('gapDetected', count);
}

/**
 * Record gap resolved
 */
export function recordGapResolved(): void {
  incrementMetric('gapResolved');
}

/**
 * Record exception registered
 */
export function recordExceptionRegistered(): void {
  incrementMetric('exceptionRegistered');
}

/**
 * Record comparison built
 */
export function recordComparisonBuilt(): void {
  incrementMetric('comparisonBuilt');
}

/**
 * Record surface built
 */
export function recordSurfaceBuilt(): void {
  incrementMetric('surfaceBuilt');
}

/**
 * Record decision support generated
 */
export function recordDecisionSupportGenerated(): void {
  incrementMetric('decisionSupportGenerated');
}

/**
 * Record backlog item created
 */
export function recordBacklogItemCreated(): void {
  incrementMetric('backlogItemCreated');
}

/**
 * Record hardening cycle run
 */
export function recordHardeningCycleRun(): void {
  incrementMetric('hardeningCycleRun');
}

/**
 * Record hardening cycle error
 */
export function recordHardeningCycleError(): void {
  incrementMetric('hardeningCycleErrors');
}

/**
 * Get metrics summary for monitoring systems
 */
export function getMetricsSummary(): {
  counters: Record<string, number>;
  timestamp: string;
} {
  return {
    counters: getAllMetrics(),
    timestamp: new Date().toISOString(),
  };
}
