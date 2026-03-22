/**
 * Product Governance Commercial Integration
 *
 * Integrates commercial risks into product governance.
 */

import type { CommercialGovernanceReview, CommercialAnomalySignal, CommercialResult } from '../types.js';

/**
 * Collect commercial governance signals
 */
export async function collectCommercialGovernanceSignals(): Promise<{
  pendingReviews: number;
  criticalAnomalies: number;
  warningAnomalies: number;
  recentRejects: number;
}> {
  // This would query the database
  return {
    pendingReviews: 0,
    criticalAnomalies: 0,
    warningAnomalies: 0,
    recentRejects: 0,
  };
}

/**
 * Build commercial release readiness signals
 */
export function buildCommercialReleaseReadinessSignals(params: {
  pendingReviews: number;
  criticalAnomalies: number;
  warningAnomalies: number;
  recentRejects: number;
}): {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  signals: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
} {
  const { pendingReviews, criticalAnomalies, warningAnomalies, recentRejects } = params;

  const blockers: string[] = [];
  const warnings: string[] = [];
  const signals: Array<{
    type: string;
    severity: string;
    description: string;
  }> = [];

  // Check for blockers
  if (criticalAnomalies > 0) {
    blockers.push(`${criticalAnomalies} critical commercial anomaly(s) detected`);
    signals.push({
      type: 'critical_anomaly',
      severity: 'critical',
      description: `${criticalAnomalies} critical anomalies require immediate attention`,
    });
  }

  if (recentRejects > 2) {
    blockers.push(`${recentRejects} governance reviews rejected recently`);
    signals.push({
      type: 'governance_rejection',
      severity: 'critical',
      description: `Multiple recent governance rejections - investigate before release`,
    });
  }

  // Check for warnings
  if (warningAnomalies > 5) {
    warnings.push(`${warningAnomalies} warning-level anomalies detected`);
    signals.push({
      type: 'warning_anomaly',
      severity: 'warning',
      description: `${warningAnomalies} warnings should be reviewed before release`,
    });
  }

  if (pendingReviews > 0) {
    warnings.push(`${pendingReviews} governance review(s) pending`);
    signals.push({
      type: 'pending_review',
      severity: 'warning',
      description: `${pendingReviews} reviews pending - ensure completion before release`,
    });
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    signals,
  };
}

/**
 * Build commercial improvement signals
 */
export function buildCommercialImprovementSignals(params: {
  revenueTrend: 'up' | 'down' | 'stable';
  qualityTrend: 'up' | 'down' | 'stable';
  conversionTrend: 'up' | 'down' | 'stable';
}): {
  focus: 'revenue' | 'quality' | 'balance' | 'maintain';
  opportunities: string[];
  risks: string[];
  recommendations: string[];
} {
  const { revenueTrend, qualityTrend, conversionTrend } = params;

  const opportunities: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  let focus: 'revenue' | 'quality' | 'balance' | 'maintain' = 'maintain';

  // Analyze trends
  if (revenueTrend === 'down' && qualityTrend === 'up') {
    focus = 'revenue';
    opportunities.push('Quality is good - focus on monetization');
    recommendations.push('Explore higher-value voucher sources');
    recommendations.push('Test different commission structures');
  } else if (revenueTrend === 'up' && qualityTrend === 'down') {
    focus = 'quality';
    risks.push('Revenue up but quality declining');
    recommendations.push('Review voucher ranking for relevance');
    recommendations.push('Audit recent changes that may have impacted quality');
  } else if (revenueTrend === 'down' && qualityTrend === 'down') {
    focus = 'balance';
    risks.push('Both revenue and quality declining');
    recommendations.push('Investigate root cause');
    recommendations.push('Consider rolling back recent changes');
  } else if (conversionTrend === 'down') {
    focus = 'revenue';
    risks.push('Conversion rate declining');
    recommendations.push('Analyze user flow for friction points');
    recommendations.push('Review CTA effectiveness');
  } else {
    focus = 'maintain';
    opportunities.push('All metrics healthy - maintain current approach');
    recommendations.push('Continue monitoring');
    recommendations.push('Look for incremental improvements');
  }

  return { focus, opportunities, risks, recommendations };
}
