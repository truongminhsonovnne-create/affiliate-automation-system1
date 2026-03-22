/**
 * Experiment Analysis Service
 */

import { ExperimentDefinition, ExperimentStatus, VariantPerformance, ExperimentEvaluationSummary } from '../types/index.js';
import { getExposuresForExperiment } from '../exposure/exposureRecorder.js';
import { getOutcomesForExperiment } from '../outcomes/outcomeRecorder.js';
import { DECISION_THRESHOLDS } from '../constants/index.js';

/**
 * Analyze experiment performance
 */
export async function analyzeExperimentPerformance(
  experiment: ExperimentDefinition
): Promise<{
  summary: ExperimentEvaluationSummary;
  variants: VariantPerformance[];
}> {
  const exposures = await getExposuresForExperiment(experiment.id);
  const outcomes = await getOutcomesForExperiment(experiment.id);

  // Calculate variant performance
  const variantMap = new Map<string, VariantPerformance>();

  for (const variant of experiment.variantDefinitions) {
    const variantExposures = exposures.filter(e => e.variantKey === variant.key);
    const variantOutcomes = outcomes.filter(o => o.variantKey === variant.key);

    const conversions = variantOutcomes.filter(o =>
      o.outcomeType === 'copy_success' || o.outcomeType === 'open_shopee'
    ).length;

    variantMap.set(variant.key, {
      variantKey: variant.key,
      variantName: variant.name,
      exposures: variantExposures.length,
      conversions,
      conversionRate: variantExposures.length > 0
        ? conversions / variantExposures.length
        : 0,
    });
  }

  const variants = Array.from(variantMap.values());

  // Calculate overall summary
  const totalExposures = exposures.length;
  const totalConversions = outcomes.filter(o =>
    o.outcomeType === 'copy_success' || o.outcomeType === 'open_shopee'
  ).length;

  return {
    summary: {
      experimentId: experiment.id,
      experimentKey: experiment.experimentKey,
      status: experiment.status,
      variants,
      totalExposures,
      totalConversions,
      conversionRate: totalExposures > 0 ? totalConversions / totalExposures : 0,
      guardrailResults: [],
      recommendation: {
        action: 'continue',
        rationale: 'Analysis complete',
        confidence: 0.5,
      },
      analyzedAt: new Date(),
    },
    variants,
  };
}

/**
 * Analyze variant performance
 */
export async function analyzeVariantPerformance(
  experimentId: string,
  variantKey: string
): Promise<VariantPerformance | null> {
  const exposures = await getExposuresForExperiment(experimentId);
  const outcomes = await getOutcomesForExperiment(experimentId);

  const variantExposures = exposures.filter(e => e.variantKey === variantKey);
  const variantOutcomes = outcomes.filter(o => o.variantKey === variantKey);

  const conversions = variantOutcomes.filter(o =>
    o.outcomeType === 'copy_success' || o.outcomeType === 'open_shopee'
  ).length;

  return {
    variantKey,
    variantName: variantKey,
    exposures: variantExposures.length,
    conversions,
    conversionRate: variantExposures.length > 0
      ? conversions / variantExposures.length
      : 0,
  };
}
