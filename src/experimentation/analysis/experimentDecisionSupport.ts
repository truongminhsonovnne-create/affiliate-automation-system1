/**
 * Experiment Decision Support
 */

/**
 * Build experiment decision support
 */
export function buildExperimentDecisionSupport(params: {
  experimentKey: string;
  variants: Array<{ variantKey: string; conversionRate: number; exposures: number }>;
  guardrailsPassed: boolean;
}): {
  recommendation: string;
  confidence: number;
  checklist: string[];
} {
  const { variants, guardrailsPassed } = params;

  const checklist: string[] = [];
  let recommendation = 'continue';
  let confidence = 0.5;

  // Check guardrails
  if (!guardrailsPassed) {
    checklist.push('⚠️ Guardrails failed - review violations');
    recommendation = 'hold';
    confidence = 0.9;
  }

  // Check sample size
  const totalExposures = variants.reduce((sum, v) => sum + v.exposures, 0);
  if (totalExposures < 100) {
    checklist.push('⚠️ Sample size too small (<100)');
  }

  // Check for winner
  if (variants.length >= 2) {
    const control = variants[0];
    const treatments = variants.slice(1);
    const winners = treatments.filter(v =>
      v.conversionRate > control.conversionRate * 1.1 && v.exposures >= 30
    );

    if (winners.length > 0) {
      checklist.push(`✅ Winner detected: ${winners[0].variantKey}`);
      recommendation = 'promote';
      confidence = 0.8;
    }
  }

  return { recommendation, confidence, checklist };
}

/**
 * Suggest promote/hold/rollback
 */
export function suggestPromoteHoldRollback(params: {
  variantPerformance: Array<{ variantKey: string; conversionRate: number; exposures: number }>;
  guardrailsPassed: boolean;
}): string {
  const { variantPerformance, guardrailsPassed } = params;

  if (!guardrailsPassed) {
    return 'rollback';
  }

  const totalExposures = variantPerformance.reduce((sum, v) => sum + v.exposures, 0);
  if (totalExposures < 50) {
    return 'hold';
  }

  const control = variantPerformance[0];
  const hasImprovement = variantPerformance.some(v =>
    v.variantKey !== control?.variantKey &&
    v.conversionRate > (control?.conversionRate || 0) * 1.1
  );

  if (hasImprovement) {
    return 'promote';
  }

  return 'hold';
}

/**
 * Build experiment review checklist
 */
export function buildExperimentReviewChecklist(): string[] {
  return [
    '✅ Guardrails passed',
    '✅ Sample size sufficient (>100)',
    '✅ Winner statistically significant',
    '✅ No negative user impact',
    '✅ Latency impact acceptable',
    '✅ Code reviewed',
    '✅ Stakeholders informed',
  ];
}
