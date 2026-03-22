/**
 * Commercial Guardrail Evaluator
 *
 * Production-grade guardrails for commercial optimization.
 */

import type {
  CommercialOptimizationRisk,
  FunnelMetrics,
  CommercialResult,
} from '../types.js';
import { RISK_THRESHOLDS, EXPERIMENT_THRESHOLDS } from '../constants.js';

/**
 * Commercial Guardrail Evaluator
 *
 * Evaluates commercial guardrails to prevent harmful optimization.
 */
export class CommercialGuardrailEvaluator {
  /**
   * Evaluate commercial guardrails
   */
  evaluateCommercialGuardrails(params: {
    currentMetrics: {
      revenue: number;
      noMatchRate: number;
      copyRate: number;
      openRate: number;
      conversionRate: number;
      qualityScore: number;
    };
    previousMetrics?: {
      revenue: number;
      noMatchRate: number;
      copyRate: number;
      openRate: number;
      conversionRate: number;
      qualityScore: number;
    };
    thresholds?: {
      maxNoMatchRate?: number;
      minQualityScore?: number;
      maxRevenueDrop?: number;
      maxQualityDrop?: number;
    };
  }): {
    passed: boolean;
    guardrails: Array<{
      name: string;
      passed: boolean;
      currentValue: number;
      threshold: number;
      severity: 'critical' | 'warning' | 'info';
    }>;
  } {
    const { currentMetrics, previousMetrics, thresholds } = params;
    const passedGuardrails: Array<{
      name: string;
      passed: boolean;
      currentValue: number;
      threshold: number;
      severity: 'critical' | 'warning' | 'info';
    }> = [];

    const maxNoMatchRate = thresholds?.maxNoMatchRate ?? RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD;
    const minQualityScore = thresholds?.minQualityScore ?? 0.5;
    const maxRevenueDrop = thresholds?.maxRevenueDrop ?? GOVERNANCE_THRESHOLDS?.AUTO_REVIEW_REVENUE_DROP_PERCENT / 100 ?? 0.2;
    const maxQualityDrop = thresholds?.maxQualityDrop ?? 0.15;

    // Guardrail 1: No-match rate
    const noMatchPassed = currentMetrics.noMatchRate <= maxNoMatchRate;
    passedGuardrails.push({
      name: 'no_match_rate',
      passed: noMatchPassed,
      currentValue: currentMetrics.noMatchRate,
      threshold: maxNoMatchRate,
      severity: noMatchPassed ? 'info' : 'critical',
    });

    // Guardrail 2: Quality score
    const qualityPassed = currentMetrics.qualityScore >= minQualityScore;
    passedGuardrails.push({
      name: 'quality_score',
      passed: qualityPassed,
      currentValue: currentMetrics.qualityScore,
      threshold: minQualityScore,
      severity: qualityPassed ? 'info' : 'critical',
    });

    // Guardrail 3: Revenue drop (if previous metrics available)
    if (previousMetrics && previousMetrics.revenue > 0) {
      const revenueDrop = (previousMetrics.revenue - currentMetrics.revenue) / previousMetrics.revenue;
      const revenueDropPassed = revenueDrop <= maxRevenueDrop;
      passedGuardrails.push({
        name: 'revenue_drop',
        passed: revenueDropPassed,
        currentValue: revenueDrop,
        threshold: maxRevenueDrop,
        severity: revenueDropPassed ? 'info' : 'warning',
      });
    }

    // Guardrail 4: Quality drop (if previous metrics available)
    if (previousMetrics && previousMetrics.qualityScore > 0) {
      const qualityDrop = previousMetrics.qualityScore - currentMetrics.qualityScore;
      const qualityDropPassed = qualityDrop <= maxQualityDrop;
      passedGuardrails.push({
        name: 'quality_drop',
        passed: qualityDropPassed,
        currentValue: qualityDrop,
        threshold: maxQualityDrop,
        severity: qualityDropPassed ? 'info' : 'critical',
      });
    }

    const allPassed = passedGuardrails.every(g => g.passed);

    return {
      passed: allPassed,
      guardrails: passedGuardrails,
    };
  }

  /**
   * Detect commercial guardrail breaches
   */
  detectCommercialGuardrailBreaches(params: {
    currentMetrics: FunnelMetrics;
    previousMetrics?: FunnelMetrics;
    thresholds?: {
      maxNoMatchRate?: number;
      minCopyRate?: number;
      minOpenRate?: number;
    };
  }): Array<{
    guardrail: string;
    breached: boolean;
    currentValue: number;
    threshold: number;
    recommendation: string;
  }> {
    const breaches: Array<{
      guardrail: string;
      breached: boolean;
      currentValue: number;
      threshold: number;
      recommendation: string;
    }> = [];

    const { currentMetrics, previousMetrics, thresholds } = params;
    const maxNoMatchRate = thresholds?.maxNoMatchRate ?? RISK_THRESHOLDS.NO_MATCH_SPIKE_THRESHOLD;
    const minCopyRate = thresholds?.minCopyRate ?? 0.2;
    const minOpenRate = thresholds?.minOpenRate ?? 0.3;

    // Calculate rates
    const noMatchRate = currentMetrics.pasteSubmits > 0
      ? currentMetrics.resolutionNoMatch / currentMetrics.pasteSubmits
      : 0;
    const copyRate = currentMetrics.resolutionSuccess > 0
      ? currentMetrics.voucherCopySuccess / currentMetrics.resolutionSuccess
      : 0;
    const openRate = currentMetrics.voucherCopySuccess > 0
      ? currentMetrics.openShopeeClicks / currentMetrics.voucherCopySuccess
      : 0;

    // No-match rate breach
    if (noMatchRate > maxNoMatchRate) {
      breaches.push({
        guardrail: 'no_match_rate',
        breached: true,
        currentValue: noMatchRate,
        threshold: maxNoMatchRate,
        recommendation: 'Review voucher matching algorithm - no-match rate too high',
      });
    }

    // Copy rate breach
    if (copyRate < minCopyRate) {
      breaches.push({
        guardrail: 'copy_rate',
        breached: true,
        currentValue: copyRate,
        threshold: minCopyRate,
        recommendation: 'Review voucher presentation - copy rate too low',
      });
    }

    // Open rate breach
    if (openRate < minOpenRate) {
      breaches.push({
        guardrail: 'open_rate',
        breached: true,
        currentValue: openRate,
        threshold: minOpenRate,
        recommendation: 'Review call-to-action - open rate too low',
      });
    }

    // Check for regression if previous metrics available
    if (previousMetrics) {
      const prevNoMatchRate = previousMetrics.pasteSubmits > 0
        ? previousMetrics.resolutionNoMatch / previousMetrics.pasteSubmits
        : 0;
      const prevCopyRate = previousMetrics.resolutionSuccess > 0
        ? previousMetrics.voucherCopySuccess / previousMetrics.resolutionSuccess
        : 0;

      // Regression: no-match rate increased significantly
      if (noMatchRate > prevNoMatchRate * 1.5) {
        breaches.push({
          guardrail: 'no_match_regression',
          breached: true,
          currentValue: noMatchRate - prevNoMatchRate,
          threshold: prevNoMatchRate * 0.5,
          recommendation: 'No-match rate regression detected - investigate recent changes',
        });
      }

      // Regression: copy rate decreased
      if (copyRate < prevCopyRate * 0.8) {
        breaches.push({
          guardrail: 'copy_regression',
          breached: true,
          currentValue: prevCopyRate - copyRate,
          threshold: prevCopyRate * 0.2,
          recommendation: 'Copy rate regression detected - investigate recent changes',
        });
      }
    }

    return breaches;
  }

  /**
   * Build commercial guardrail decision
   */
  buildCommercialGuardrailDecision(guardrailResults: ReturnType<typeof this.evaluateCommercialGuardrails>): {
    decision: 'proceed' | 'review' | 'stop';
    reason: string;
    affectedGuardrails: string[];
  } {
    const criticalFailures = guardrailResults.guardrails.filter(
      g => !g.passed && g.severity === 'critical'
    );
    const warningFailures = guardrailResults.guardrails.filter(
      g => !g.passed && g.severity === 'warning'
    );

    if (criticalFailures.length > 0) {
      return {
        decision: 'stop',
        reason: `Critical guardrail failures: ${criticalFailures.map(f => f.name).join(', ')}`,
        affectedGuardrails: criticalFailures.map(f => f.name),
      };
    }

    if (warningFailures.length > 0) {
      return {
        decision: 'review',
        reason: `Warning guardrail failures: ${warningFailures.map(f => f.name).join(', ')}`,
        affectedGuardrails: warningFailures.map(f => f.name),
      };
    }

    return {
      decision: 'proceed',
      reason: 'All guardrails passed',
      affectedGuardrails: [],
    };
  }
}

// ============================================================
// Factory
// ============================================================

let guardrailEvaluator: CommercialGuardrailEvaluator | null = null;

export function getCommercialGuardrailEvaluator(): CommercialGuardrailEvaluator {
  if (!guardrailEvaluator) {
    guardrailEvaluator = new CommercialGuardrailEvaluator();
  }
  return guardrailEvaluator;
}

// ============================================================
// Direct Exports
// ============================================================

export function evaluateCommercialGuardrails(
  params: Parameters<CommercialGuardrailEvaluator['evaluateCommercialGuardrails']>[0]
): ReturnType<CommercialGuardrailEvaluator['evaluateCommercialGuardrails']> {
  return getCommercialGuardrailEvaluator().evaluateCommercialGuardrails(params);
}

export function detectCommercialGuardrailBreaches(
  params: Parameters<CommercialGuardrailEvaluator['detectCommercialGuardrailBreaches']>[0]
): ReturnType<CommercialGuardrailEvaluator['detectCommercialGuardrailBreaches']> {
  return getCommercialGuardrailEvaluator().detectCommercialGuardrailBreaches(params);
}

export function buildCommercialGuardrailDecision(
  guardrailResults: ReturnType<CommercialGuardrailEvaluator['evaluateCommercialGuardrails']>
): ReturnType<CommercialGuardrailEvaluator['buildCommercialGuardrailDecision']> {
  return getCommercialGuardrailEvaluator().buildCommercialGuardrailDecision(guardrailResults);
}
