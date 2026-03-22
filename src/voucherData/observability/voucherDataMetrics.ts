// =============================================================================
// Voucher Data Metrics
// Production-grade metrics for voucher data, rules, and evaluation
// =============================================================================

import { logger } from '../../utils/logger.js';
import { METRIC_NAMES } from '../constants.js';

// Simple in-memory metrics collector (in production, use proper metrics library)
const metrics: Map<string, number> = new Map();

/**
 * Increment a metric counter
 */
export function incrementMetric(name: string, value: number = 1): void {
  const current = metrics.get(name) || 0;
  metrics.set(name, current + value);
  logger.debug({ name, value: current + value }, 'Metric incremented');
}

/**
 * Set a metric gauge value
 */
export function setMetric(name: string, value: number): void {
  metrics.set(name, value);
  logger.debug({ name, value }, 'Metric set');
}

/**
 * Get current metric value
 */
export function getMetric(name: string): number {
  return metrics.get(name) || 0;
}

/**
 * Get all metrics
 */
export function getAllMetrics(): Record<string, number> {
  return Object.fromEntries(metrics);
}

// =============================================================================
// Ingestion Metrics
// =============================================================================

export const ingestionMetrics = {
  /**
   * Record items seen during ingestion
   */
  recordItemsSeen(sourceId: string, count: number): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_ITEMS_SEEN}.${sourceId}`, count);
    incrementMetric(METRIC_NAMES.INGESTION_ITEMS_SEEN, count);
  },

  /**
   * Record items inserted
   */
  recordItemsInserted(sourceId: string, count: number): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_ITEMS_INSERTED}.${sourceId}`, count);
    incrementMetric(METRIC_NAMES.INGESTION_ITEMS_INSERTED, count);
  },

  /**
   * Record items updated
   */
  recordItemsUpdated(sourceId: string, count: number): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_ITEMS_UPDATED}.${sourceId}`, count);
    incrementMetric(METRIC_NAMES.INGESTION_ITEMS_UPDATED, count);
  },

  /**
   * Record items failed
   */
  recordItemsFailed(sourceId: string, count: number): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_ITEMS_FAILED}.${sourceId}`, count);
    incrementMetric(METRIC_NAMES.INGESTION_ITEMS_FAILED, count);
  },

  /**
   * Record ingestion run started
   */
  recordIngestionRunStarted(sourceId: string): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_RUNS_TOTAL}.${sourceId}`);
    incrementMetric(METRIC_NAMES.INGESTION_RUNS_TOTAL);
  },

  /**
   * Record ingestion run failed
   */
  recordIngestionRunFailed(sourceId: string): void {
    incrementMetric(`${METRIC_NAMES.INGESTION_RUNS_FAILED}.${sourceId}`);
    incrementMetric(METRIC_NAMES.INGESTION_RUNS_FAILED);
  },
};

// =============================================================================
// Rule Metrics
// =============================================================================

export const ruleMetrics = {
  /**
   * Record rule validation
   */
  recordRuleValidation(ruleId: string, success: boolean): void {
    incrementMetric(METRIC_NAMES.RULE_VALIDATIONS_TOTAL);
    if (!success) {
      incrementMetric(METRIC_NAMES.RULE_VALIDATIONS_FAILED);
    }
  },

  /**
   * Record rule activation
   */
  recordRuleActivated(ruleId: string): void {
    incrementMetric(METRIC_NAMES.RULE_ACTIVATIONS_TOTAL);
  },
};

// =============================================================================
// Evaluation Metrics
// =============================================================================

export const evaluationMetrics = {
  /**
   * Record evaluation performed
   */
  recordEvaluation(platform: string, success: boolean): void {
    incrementMetric(`${METRIC_NAMES.EVALUATIONS_TOTAL}.${platform}`);
    incrementMetric(METRIC_NAMES.EVALUATIONS_TOTAL);

    if (success) {
      incrementMetric(`${METRIC_NAMES.EVALUATIONS_SUCCESS}.${platform}`);
      incrementMetric(METRIC_NAMES.EVALUATIONS_SUCCESS);
    } else {
      incrementMetric(`${METRIC_NAMES.EVALUATIONS_FAILED}.${platform}`);
      incrementMetric(METRIC_NAMES.EVALUATIONS_FAILED);
    }
  },

  /**
   * Record quality score
   */
  recordQualityScore(platform: string, score: number): void {
    // Store as gauge
    setMetric(`${METRIC_NAMES.EVALUATION_QUALITY_SCORE}.${platform}`, score);
  },
};

// =============================================================================
// Catalog Metrics
// =============================================================================

export const catalogMetrics = {
  /**
   * Record stale voucher count
   */
  recordStaleVouchers(count: number): void {
    setMetric(METRIC_NAMES.STALE_VOUCHERS_COUNT, count);
  },

  /**
   * Record active voucher count
   */
  recordActiveVouchers(count: number): void {
    setMetric(METRIC_NAMES.ACTIVE_VOUCHERS_COUNT, count);
  },
};

// =============================================================================
// Override Metrics
// =============================================================================

export const overrideMetrics = {
  /**
   * Record override created
   */
  recordOverrideCreated(): void {
    incrementMetric(METRIC_NAMES.OVERRIDES_TOTAL);
  },

  /**
   * Record override expired
   */
  recordOverrideExpired(): void {
    incrementMetric(METRIC_NAMES.OVERRIDES_EXPIRED);
  },
};

/**
 * Get voucher data metrics summary
 */
export function getVoucherDataMetricsSummary(): Record<string, number> {
  return {
    ...getAllMetrics(),
    ingestionItemsSeen: getMetric(METRIC_NAMES.INGESTION_ITEMS_SEEN),
    ingestionItemsInserted: getMetric(METRIC_NAMES.INGESTION_ITEMS_INSERTED),
    ingestionItemsUpdated: getMetric(METRIC_NAMES.INGESTION_ITEMS_UPDATED),
    ingestionItemsFailed: getMetric(METRIC_NAMES.INGESTION_ITEMS_FAILED),
    ingestionRunsTotal: getMetric(METRIC_NAMES.INGESTION_RUNS_TOTAL),
    ingestionRunsFailed: getMetric(METRIC_NAMES.INGESTION_RUNS_FAILED),
    ruleValidationsTotal: getMetric(METRIC_NAMES.RULE_VALIDATIONS_TOTAL),
    ruleValidationsFailed: getMetric(METRIC_NAMES.RULE_VALIDATIONS_FAILED),
    ruleActivationsTotal: getMetric(METRIC_NAMES.RULE_ACTIVATIONS_TOTAL),
    evaluationsTotal: getMetric(METRIC_NAMES.EVALUATIONS_TOTAL),
    evaluationsSuccess: getMetric(METRIC_NAMES.EVALUATIONS_SUCCESS),
    evaluationsFailed: getMetric(METRIC_NAMES.EVALUATIONS_FAILED),
    staleVouchers: getMetric(METRIC_NAMES.STALE_VOUCHERS_COUNT),
    activeVouchers: getMetric(METRIC_NAMES.ACTIVE_VOUCHERS_COUNT),
    overridesTotal: getMetric(METRIC_NAMES.OVERRIDES_TOTAL),
    overridesExpired: getMetric(METRIC_NAMES.OVERRIDES_EXPIRED),
  };
}
