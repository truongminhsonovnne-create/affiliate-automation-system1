/**
 * Post-Launch Guardrail Service
 * Evaluates guardrails during watch window
 */

import { GUARDRAIL_THRESHOLDS } from '../constants.js';

export interface GuardrailCheck {
  guardrailName: string;
  currentValue: number;
  threshold: number;
  isBreached: boolean;
  severity: 'warning' | 'critical';
}

export interface GuardrailEvaluationResult {
  isHealthy: boolean;
  breachedGuardrails: GuardrailCheck[];
  warningGuardrails: GuardrailCheck[];
}

/**
 * Evaluate post-launch guardrails
 */
export async function evaluatePostLaunchGuardrails(
  metrics: Record<string, number>
): Promise<GuardrailEvaluationResult> {
  const breachedGuardrails: GuardrailCheck[] = [];
  const warningGuardrails: GuardrailCheck[] = [];

  // Error rate check
  const errorRate = metrics.errorRate ?? 0;
  if (errorRate >= GUARDRAIL_THRESHOLDS.error_rate_critical) {
    breachedGuardrails.push({
      guardrailName: 'error_rate',
      currentValue: errorRate,
      threshold: GUARDRAIL_THRESHOLDS.error_rate_critical,
      isBreached: true,
      severity: 'critical',
    });
  } else if (errorRate >= GUARDRAIL_THRESHOLDS.error_rate_warning) {
    warningGuardrails.push({
      guardrailName: 'error_rate',
      currentValue: errorRate,
      threshold: GUARDRAIL_THRESHOLDS.error_rate_warning,
      isBreached: false,
      severity: 'warning',
    });
  }

  // Latency check
  const latencyP99 = metrics.latencyP99 ?? 0;
  if (latencyP99 >= GUARDRAIL_THRESHOLDS.latency_p99_critical) {
    breachedGuardrails.push({
      guardrailName: 'latency_p99',
      currentValue: latencyP99,
      threshold: GUARDRAIL_THRESHOLDS.latency_p99_critical,
      isBreached: true,
      severity: 'critical',
    });
  } else if (latencyP99 >= GUARDRAIL_THRESHOLDS.latency_p99_warning) {
    warningGuardrails.push({
      guardrailName: 'latency_p99',
      currentValue: latencyP99,
      threshold: GUARDRAIL_THRESHOLDS.latency_p99_warning,
      isBreached: false,
      severity: 'warning',
    });
  }

  // Conversion drop check
  const conversionDrop = metrics.conversionDrop ?? 0;
  if (conversionDrop >= GUARDRAIL_THRESHOLDS.conversion_drop_critical) {
    breachedGuardrails.push({
      guardrailName: 'conversion_drop',
      currentValue: conversionDrop,
      threshold: GUARDRAIL_THRESHOLDS.conversion_drop_critical,
      isBreached: true,
      severity: 'critical',
    });
  } else if (conversionDrop >= GUARDRAIL_THRESHOLDS.conversion_drop_warning) {
    warningGuardrails.push({
      guardrailName: 'conversion_drop',
      currentValue: conversionDrop,
      threshold: GUARDRAIL_THRESHOLDS.conversion_drop_warning,
      isBreached: false,
      severity: 'warning',
    });
  }

  // Revenue drop check
  const revenueDrop = metrics.revenueDrop ?? 0;
  if (revenueDrop >= GUARDRAIL_THRESHOLDS.revenue_drop_critical) {
    breachedGuardrails.push({
      guardrailName: 'revenue_drop',
      currentValue: revenueDrop,
      threshold: GUARDRAIL_THRESHOLDS.revenue_drop_critical,
      isBreached: true,
      severity: 'critical',
    });
  } else if (revenueDrop >= GUARDRAIL_THRESHOLDS.revenue_drop_warning) {
    warningGuardrails.push({
      guardrailName: 'revenue_drop',
      currentValue: revenueDrop,
      threshold: GUARDRAIL_THRESHOLDS.revenue_drop_warning,
      isBreached: false,
      severity: 'warning',
    });
  }

  const isHealthy = breachedGuardrails.length === 0;

  return {
    isHealthy,
    breachedGuardrails,
    warningGuardrails,
  };
}

/**
 * Detect post-launch breaches
 */
export async function detectPostLaunchBreaches(
  metrics: Record<string, number>
): Promise<GuardrailCheck[]> {
  const result = await evaluatePostLaunchGuardrails(metrics);
  return result.breachedGuardrails;
}

/**
 * Build post-launch guardrail summary
 */
export function buildPostLaunchGuardrailSummary(
  result: GuardrailEvaluationResult
): string {
  let summary = '📊 Post-Launch Guardrail Status\n';

  if (result.isHealthy) {
    summary += '✅ All guardrails healthy\n';
  } else {
    summary += `🚫 ${result.breachedGuardrails.length} guardrail(s) breached\n`;
  }

  if (result.breachedGuardrails.length > 0) {
    summary += '\n🚨 CRITICAL BREACHES:\n';
    for (const breach of result.breachedGuardrails) {
      summary += `- ${breach.guardrailName}: ${breach.currentValue} (threshold: ${breach.threshold})\n`;
    }
  }

  if (result.warningGuardrails.length > 0) {
    summary += '\n⚠️ WARNINGS:\n';
    for (const warning of result.warningGuardrails) {
      summary += `- ${warning.guardrailName}: ${warning.currentValue} (threshold: ${warning.threshold})\n`;
    }
  }

  return summary;
}
