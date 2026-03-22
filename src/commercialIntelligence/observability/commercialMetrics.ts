/**
 * Commercial Intelligence Metrics
 *
 * Production-grade metrics for observability.
 */

import { logger } from '../../utils/logger.js';
import { COMMERCIAL_METRIC_NAMES } from '../constants.js';

/**
 * Commercial Intelligence Metrics
 *
 * Centralized metrics for commercial intelligence operations.
 */
export class CommercialMetrics {
  /**
   * Record attribution success
   */
  static recordAttributionSuccess(): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.ATTRIBUTION_SUCCESS,
      value: 1,
    });
  }

  /**
   * Record attribution failure
   */
  static recordAttributionFailure(reason?: string): void {
    logger.warn({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.ATTRIBUTION_FAILURE,
      reason,
      value: 1,
    });
  }

  /**
   * Record attribution confidence
   */
  static recordAttributionConfidence(confidence: 'high' | 'medium' | 'low'): void {
    const metricName = confidence === 'high'
      ? COMMERCIAL_METRIC_NAMES.ATTRIBUTION_CONFIDENCE_HIGH
      : confidence === 'medium'
      ? COMMERCIAL_METRIC_NAMES.ATTRIBUTION_CONFIDENCE_MEDIUM
      : COMMERCIAL_METRIC_NAMES.ATTRIBUTION_CONFIDENCE_LOW;

    logger.info({
      type: 'metric',
      name: metricName,
      confidence,
      value: 1,
    });
  }

  /**
   * Record funnel event
   */
  static recordFunnelEvent(eventType: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.FUNNEL_EVENT,
      eventType,
      value: 1,
    });
  }

  /**
   * Record funnel drop-off
   */
  static recordFunnelDropOff(eventType: string, fromStage: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.FUNNEL_DROP_OFF,
      eventType,
      fromStage,
      value: 1,
    });
  }

  /**
   * Record revenue
   */
  static recordRevenue(amount: number, source: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.REVENUE_TOTAL,
      amount,
      source,
    });
  }

  /**
   * Record attributed revenue
   */
  static recordAttributedRevenue(amount: number, attributionModel: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.REVENUE_ATTRIBUTED,
      amount,
      attributionModel,
    });
  }

  /**
   * Record commission
   */
  static recordCommission(amount: number): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.COMMISSION_TOTAL,
      amount,
    });
  }

  /**
   * Record anomaly detected
   */
  static recordAnomalyDetected(severity: 'info' | 'warning' | 'critical', signalType: string): void {
    const metricName = severity === 'critical'
      ? COMMERCIAL_METRIC_NAMES.ANOMALY_CRITICAL
      : severity === 'warning'
      ? COMMERCIAL_METRIC_NAMES.ANOMALY_WARNING
      : COMMERCIAL_METRIC_NAMES.ANOMALY_DETECTED;

    logger.info({
      type: 'metric',
      name: metricName,
      severity,
      signalType,
      value: 1,
    });
  }

  /**
   * Record governance review
   */
  static recordGovernanceReview(status: 'created' | 'approved' | 'rejected'): void {
    const metricName = status === 'created'
      ? COMMERCIAL_METRIC_NAMES.GOVERNANCE_REVIEW_CREATED
      : status === 'approved'
      ? COMMERCIAL_METRIC_NAMES.GOVERNANCE_REVIEW_APPROVED
      : COMMERCIAL_METRIC_NAMES.GOVERNANCE_REVIEW_REJECTED;

    logger.info({
      type: 'metric',
      name: metricName,
      status,
      value: 1,
    });
  }

  /**
   * Record quality gate result
   */
  static recordQualityGate(passed: boolean, gateName: string): void {
    const metricName = passed
      ? COMMERCIAL_METRIC_NAMES.QUALITY_GATE_PASSED
      : COMMERCIAL_METRIC_NAMES.QUALITY_GATE_FAILED;

    logger.info({
      type: 'metric',
      name: metricName,
      gateName,
      passed,
      value: 1,
    });
  }

  /**
   * Record low-value surface detected
   */
  static recordLowValueSurface(surfaceType: string, surfaceId: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.LOW_VALUE_SURFACE_DETECTED,
      surfaceType,
      surfaceId,
      value: 1,
    });
  }

  /**
   * Record voucher underperformance
   */
  static recordVoucherUnderperformance(voucherId: string, reason: string): void {
    logger.info({
      type: 'metric',
      name: COMMERCIAL_METRIC_NAMES.VOUCHER_UNDERPERFORMANCE,
      voucherId,
      reason,
      value: 1,
    });
  }
}

// ============================================================
// Convenience Functions
// ============================================================

export const metrics = {
  attributionSuccess: () => CommercialMetrics.recordAttributionSuccess(),
  attributionFailure: (reason?: string) => CommercialMetrics.recordAttributionFailure(reason),
  attributionConfidence: (confidence: 'high' | 'medium' | 'low') => CommercialMetrics.recordAttributionConfidence(confidence),
  funnelEvent: (eventType: string) => CommercialMetrics.recordFunnelEvent(eventType),
  funnelDropOff: (eventType: string, fromStage: string) => CommercialMetrics.recordFunnelDropOff(eventType, fromStage),
  revenue: (amount: number, source: string) => CommercialMetrics.recordRevenue(amount, source),
  attributedRevenue: (amount: number, attributionModel: string) => CommercialMetrics.recordAttributedRevenue(amount, attributionModel),
  commission: (amount: number) => CommercialMetrics.recordCommission(amount),
  anomalyDetected: (severity: 'info' | 'warning' | 'critical', signalType: string) => CommercialMetrics.recordAnomalyDetected(severity, signalType),
  governanceReview: (status: 'created' | 'approved' | 'rejected') => CommercialMetrics.recordGovernanceReview(status),
  qualityGate: (passed: boolean, gateName: string) => CommercialMetrics.recordQualityGate(passed, gateName),
  lowValueSurface: (surfaceType: string, surfaceId: string) => CommercialMetrics.recordLowValueSurface(surfaceType, surfaceId),
  voucherUnderperformance: (voucherId: string, reason: string) => CommercialMetrics.recordVoucherUnderperformance(voucherId, reason),
};

export default CommercialMetrics;
