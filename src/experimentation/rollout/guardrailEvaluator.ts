/**
 * Guardrail Evaluator
 */

import { GUARDRAIL_THRESHOLDS } from '../constants/index.js';

// ============================================================================
// Types
// ============================================================================

export interface GuardrailMetric {
  name: string;
  value: number;
  baseline: number;
}

export interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolation[];
}

export interface GuardrailViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Evaluate experiment guardrails
 */
export function evaluateExperimentGuardrails(
  metrics: GuardrailMetric[]
): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  for (const metric of metrics) {
    const violation = evaluateGuardrailMetric(metric);
    if (violation) {
      violations.push(violation);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Evaluate single guardrail metric
 */
function evaluateGuardrailMetric(metric: GuardrailMetric): GuardrailViolation | null {
  const baseline = metric.baseline;
  const current = metric.value;

  if (baseline === 0) return null;

  const change = (current - baseline) / baseline;

  switch (metric.name) {
    case 'error_rate':
      if (change > GUARDRAIL_THRESHOLDS.ERROR_RATE_INCREASE) {
        return {
          metric: metric.name,
          threshold: GUARDRAIL_THRESHOLDS.ERROR_RATE_INCREASE,
          actual: change,
          severity: change > GUARDRAIL_THRESHOLDS.CRITICAL_ERROR_RATE ? 'critical' : 'high',
        };
      }
      break;

    case 'no_match_rate':
      if (change > GUARDRAIL_THRESHOLDS.NO_MATCH_RATE_INCREASE) {
        return {
          metric: metric.name,
          threshold: GUARDRAIL_THRESHOLDS.NO_MATCH_RATE_INCREASE,
          actual: change,
          severity: 'high',
        };
      }
      break;

    case 'latency':
      if (change > GUARDRAIL_THRESHOLDS.LATENCY_INCREASE) {
        return {
          metric: metric.name,
          threshold: GUARDRAIL_THRESHOLDS.LATENCY_INCREASE,
          actual: change,
          severity: 'medium',
        };
      }
      break;

    case 'copy_success_rate':
      if (change < -GUARDRAIL_THRESHOLDS.COPY_SUCCESS_DECREASE) {
        return {
          metric: metric.name,
          threshold: -GUARDRAIL_THRESHOLDS.COPY_SUCCESS_DECREASE,
          actual: change,
          severity: 'critical',
        };
      }
      break;

    case 'open_shopee_rate':
      if (change < -GUARDRAIL_THRESHOLDS.OPEN_SHOPEE_DECREASE) {
        return {
          metric: metric.name,
          threshold: -GUARDRAIL_THRESHOLDS.OPEN_SHOPEE_DECREASE,
          actual: change,
          severity: 'high',
        };
      }
      break;
  }

  return null;
}

/**
 * Detect guardrail breach
 */
export function detectGuardrailBreach(violations: GuardrailViolation[]): boolean {
  return violations.some(v => v.severity === 'critical' || v.severity === 'high');
}

/**
 * Build guardrail decision
 */
export function buildGuardrailDecision(
  violations: GuardrailViolation[]
): { shouldContinue: boolean; shouldKill: boolean; reason?: string } {
  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasHigh = violations.some(v => v.severity === 'high');

  if (hasCritical) {
    return {
      shouldContinue: false,
      shouldKill: true,
      reason: 'Critical guardrail breach detected',
    };
  }

  if (hasHigh) {
    return {
      shouldContinue: false,
      shouldKill: false,
      reason: 'High severity guardrail breach detected',
    };
  }

  return { shouldContinue: true, shouldKill: false };
}
