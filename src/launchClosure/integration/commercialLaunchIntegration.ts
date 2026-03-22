/**
 * Commercial Launch Integration
 * Integrates commercial intelligence into launch closure
 */

export interface CommercialLaunchInput {
  revenueMetrics?: Record<string, number>;
  attributionAccuracy?: Record<string, unknown>;
  pricingStatus?: Record<string, unknown>;
}

/**
 * Collect commercial launch inputs
 */
export async function collectCommercialLaunchInputs(
  input: CommercialLaunchInput
): Promise<{
  revenueMetrics: Record<string, number>;
  attributionAccuracy: Record<string, unknown>;
  pricingStatus: Record<string, unknown>;
}> {
  return {
    revenueMetrics: input.revenueMetrics ?? {},
    attributionAccuracy: input.attributionAccuracy ?? {},
    pricingStatus: input.pricingStatus ?? {},
  };
}

/**
 * Build commercial launch safety summary
 */
export async function buildCommercialLaunchSafetySummary(
  input: CommercialLaunchInput
): Promise<{
  isSafe: boolean;
  shopeeRevenueSafe: boolean;
  tiktokRevenueSafe: boolean;
  attributionAccurate: boolean;
  pricingCorrect: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];

  // Check Shopee revenue safety
  const shopeeRevenue = (input.revenueMetrics?.shopeeRevenue ?? 0) as number;
  const shopeeRevenueSafe = shopeeRevenue >= 0;

  // Check TikTok revenue safety
  const tiktokRevenue = (input.revenueMetrics?.tiktokRevenue ?? 0) as number;
  const tiktokRevenueSafe = tiktokRevenue >= 0;

  // Check attribution accuracy
  const attributionAccuracy = (input.attributionAccuracy?.accuracy ?? 0.95) as number;
  const attributionAccurate = attributionAccuracy >= 0.90;

  // Check pricing
  const pricingCorrect = input.pricingStatus?.status === 'correct';

  // Generate warnings
  if (!shopeeRevenueSafe) {
    warnings.push('Shopee revenue shows negative impact');
  }
  if (!tiktokRevenueSafe) {
    warnings.push('TikTok revenue shows negative impact');
  }
  if (!attributionAccurate) {
    warnings.push(`Attribution accuracy below threshold: ${attributionAccuracy}`);
  }
  if (!pricingCorrect) {
    warnings.push('Pricing display issues detected');
  }

  const isSafe = shopeeRevenueSafe && tiktokRevenueSafe && attributionAccurate && pricingCorrect;

  return {
    isSafe,
    shopeeRevenueSafe,
    tiktokRevenueSafe,
    attributionAccurate,
    pricingCorrect,
    warnings,
  };
}

/**
 * Build revenue quality launch risk summary
 */
export async function buildRevenueQualityLaunchRiskSummary(
  input: CommercialLaunchInput
): Promise<{
  riskLevel: 'low' | 'medium' | 'high';
  revenueAtRisk: number;
  attributionRisk: string;
}> {
  const revenueAtRisk = ((input.revenueMetrics?.shopeeRevenue ?? 0) as number) * 0.1 +
    ((input.revenueMetrics?.tiktokRevenue ?? 0) as number) * 0.1;

  const attributionAccuracy = (input.attributionAccuracy?.accuracy ?? 0.95) as number;
  let attributionRisk = 'low';
  if (attributionAccuracy < 0.90) {
    attributionRisk = 'high';
  } else if (attributionAccuracy < 0.95) {
    attributionRisk = 'medium';
  }

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (revenueAtRisk > 10000 || attributionRisk === 'high') {
    riskLevel = 'high';
  } else if (revenueAtRisk > 1000 || attributionRisk === 'medium') {
    riskLevel = 'medium';
  }

  return {
    riskLevel,
    revenueAtRisk,
    attributionRisk,
  };
}
