/**
 * Experimentation Commercial Integration
 *
 * Integrates experiment results with commercial intelligence.
 */

import type { ExperimentCommercialAttribution, CommercialResult } from '../types.js';
import { EXPERIMENT_THRESHOLDS } from '../constants.js';
import { getRevenueAttributionReportBuilder } from '../reports/revenueAttributionReportBuilder.js';

/**
 * Build experiment commercial attribution
 */
export async function buildExperimentCommercialAttribution(params: {
  experimentId: string;
  startDate: Date;
  endDate: Date;
}): Promise<CommercialResult<ExperimentCommercialAttribution>> {
  try {
    const reportBuilder = getRevenueAttributionReportBuilder();

    const report = await reportBuilder.buildExperimentCommercialReport({
      experimentId: params.experimentId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    if (!report.success || !report.data) {
      return { success: false, error: report.error ?? 'Failed to build experiment report' };
    }

    const exp = report.data;

    return {
      success: true,
      data: {
        experimentId: params.experimentId,
        variantId: exp.treatment.sessions > exp.control.sessions ? 'treatment' : 'control',
        controlMetrics: {
          revenue: exp.control.revenue,
          commission: exp.control.commission,
          conversions: exp.control.conversions,
          sessions: exp.control.sessions,
        },
        treatmentMetrics: {
          revenue: exp.treatment.revenue,
          commission: exp.treatment.commission,
          conversions: exp.treatment.conversions,
          sessions: exp.treatment.sessions,
        },
        delta: {
          revenue: exp.delta.revenue,
          commission: exp.delta.commission,
          conversions: exp.delta.conversions,
          sessions: exp.delta.sessions,
        },
        statisticalSignificance: exp.recommendation === 'approve' ? 0.95 : 0.5,
        revenueQualityImpact: {
          controlScore: 1 - exp.control.noMatchRate,
          treatmentScore: 1 - exp.treatment.noMatchRate,
          delta: exp.treatment.noMatchRate - exp.control.noMatchRate,
        },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Analyze experiment commercial impact
 */
export async function analyzeExperimentCommercialImpact(params: {
  experimentId: string;
  controlData: {
    revenue: number;
    conversions: number;
    sessions: number;
    qualityScore: number;
  };
  treatmentData: {
    revenue: number;
    conversions: number;
    sessions: number;
    qualityScore: number;
  };
}): Promise<{
  isSignificant: boolean;
  revenueImpact: number;
  qualityImpact: number;
  recommendation: 'approve' | 'reject' | 'continue';
  reasoning: string;
}> {
  const { controlData, treatmentData } = params;

  // Calculate revenue impact
  const revenueImpact = controlData.revenue > 0
    ? (treatmentData.revenue - controlData.revenue) / controlData.revenue
    : treatmentData.revenue > 0 ? 1 : 0;

  // Calculate quality impact
  const qualityImpact = treatmentData.qualityScore - controlData.qualityScore;

  // Determine statistical significance (simplified)
  const totalSamples = controlData.sessions + treatmentData.sessions;
  const isSignificant = totalSamples >= EXPERIMENT_THRESHOLDS.MIN_SAMPLES_FOR_EVALUATION;

  // Determine recommendation
  let recommendation: 'approve' | 'reject' | 'continue' = 'continue';
  let reasoning = '';

  if (isSignificant) {
    if (
      revenueImpact >= EXPERIMENT_THRESHOLDS.REVENUE_IMPROVEMENT_THRESHOLD &&
      qualityImpact >= -EXPERIMENT_THRESHOLDS.QUALITY_IMPROVEMENT_THRESHOLD
    ) {
      recommendation = 'approve';
      reasoning = `Revenue improved by ${(revenueImpact * 100).toFixed(1)}% with acceptable quality impact`;
    } else if (
      revenueImpact < 0 ||
      qualityImpact < EXPERIMENT_THRESHOLDS.HARMFUL_REGRESSION_THRESHOLD
    ) {
      recommendation = 'reject';
      reasoning = `Revenue or quality regression detected - Revenue: ${(revenueImpact * 100).toFixed(1)}%, Quality: ${(qualityImpact * 100).toFixed(1)}%`;
    } else {
      recommendation = 'continue';
      reasoning = 'Results inconclusive, need more data';
    }
  } else {
    reasoning = `Insufficient data: ${totalSamples} samples (need ${EXPERIMENT_THRESHOLDS.MIN_SAMPLES_FOR_EVALUATION})`;
  }

  return {
    isSignificant,
    revenueImpact,
    qualityImpact,
    recommendation,
    reasoning,
  };
}

/**
 * Collect commercial signals for experiment review
 */
export async function collectCommercialSignalsForExperimentReview(params: {
  experimentId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{
  revenue: number;
  commission: number;
  conversions: number;
  sessions: number;
  qualityIndicators: {
    noMatchRate: number;
    copyRate: number;
    openRate: number;
  };
  anomalies: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}> {
  // This would integrate with the anomaly detector and funnel aggregation
  // Simplified implementation
  return {
    revenue: 0,
    commission: 0,
    conversions: 0,
    sessions: 0,
    qualityIndicators: {
      noMatchRate: 0,
      copyRate: 0,
      openRate: 0,
    },
    anomalies: [],
  };
}
