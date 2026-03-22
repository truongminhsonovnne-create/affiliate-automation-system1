/**
 * Variant Comparison
 */

/**
 * Compare experiment variants
 */
export function compareExperimentVariants(
  variants: Array<{
    variantKey: string;
    exposures: number;
    conversions: number;
    conversionRate: number;
  }>
): Array<{
  variantKey: string;
  conversionRate: number;
  delta: number | null;
  isWinner: boolean;
}> {
  if (variants.length < 2) return [];

  // Find control (first variant)
  const control = variants[0];
  const controlRate = control.conversionRate || 0;

  return variants.map(v => {
    const variantRate = v.conversionRate || 0;
    const delta = controlRate > 0 ? (variantRate - controlRate) / controlRate : 0;

    return {
      variantKey: v.variantKey,
      conversionRate: variantRate,
      delta,
      isWinner: delta > 0.1 && v.exposures > 30,
    };
  });
}

/**
 * Build variant comparison summary
 */
export function buildVariantComparisonSummary(variants: Array<{
  variantKey: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
}>): {
  bestVariant: string | null;
  worstVariant: string | null;
  significantDifference: boolean;
} {
  if (variants.length === 0) {
    return { bestVariant: null, worstVariant: null, significantDifference: false };
  }

  const sorted = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const diff = best.conversionRate - worst.conversionRate;

  return {
    bestVariant: best.variantKey,
    worstVariant: worst.variantKey,
    significantDifference: diff > 0.1,
  };
}

/**
 * Detect variant winner candidates
 */
export function detectVariantWinnerCandidates(
  variants: Array<{ variantKey: string; conversionRate: number; exposures: number }>
): string[] {
  const control = variants[0];
  if (!control) return [];

  return variants.slice(1)
    .filter(v => {
      const diff = v.conversionRate - control.conversionRate;
      return diff > 0.1 && v.exposures >= 30;
    })
    .map(v => v.variantKey);
}
