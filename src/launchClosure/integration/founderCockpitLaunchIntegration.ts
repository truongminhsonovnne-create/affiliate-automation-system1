/**
 * Founder Cockpit Launch Integration
 * Integrates founder cockpit/BI into launch closure
 */

export interface FounderLaunchInput {
  executiveMetrics?: Record<string, unknown>;
  strategicPriorities?: string[];
  marketPosition?: Record<string, unknown>;
}

/**
 * Build founder launch decision inputs
 */
export async function buildFounderLaunchDecisionInputs(
  input: FounderLaunchInput
): Promise<{
  strategicContext: string;
  marketImpact: string;
  keyMetrics: Record<string, number>;
}> {
  return {
    strategicContext: (input.strategicPriorities?.join(', ') ?? 'No strategic priorities defined') as string,
    marketImpact: input.marketPosition?.summary ?? 'Market position unchanged',
    keyMetrics: {
      revenue: input.executiveMetrics?.revenue as number ?? 0,
      growth: input.executiveMetrics?.growth as number ?? 0,
      marketShare: input.marketPosition?.marketShare as number ?? 0,
    },
  };
}

/**
 * Build executive launch summary
 */
export async function buildExecutiveLaunchSummary(
  input: FounderLaunchInput
): Promise<{
  summary: string;
  impactAssessment: string;
  recommendations: string[];
}> {
  const recommendations: string[] = [];

  // Build impact assessment
  const shopeeImpact = input.marketPosition?.shopeeImpact ?? 'neutral';
  const tiktokImpact = input.marketPosition?.tiktokImpact ?? 'neutral';

  let impactAssessment = `Shopee: ${shopeeImpact}, TikTok: ${tiktokImpact}`;

  // Generate recommendations based on metrics
  const revenue = input.executiveMetrics?.revenue as number ?? 0;
  if (revenue < 0) {
    recommendations.push('Review commercial impact before proceeding');
  }

  const growth = input.executiveMetrics?.growth as number ?? 0;
  if (growth < 0.05) {
    recommendations.push('Growth metrics below target - evaluate market conditions');
  }

  const summary = `Launch readiness assessed for ${input.strategicPriorities?.length ?? 0} strategic priorities. ${recommendations.length > 0 ? `${recommendations.length} items require attention.` : 'No critical issues.'}`;

  return {
    summary,
    impactAssessment,
    recommendations,
  };
}

/**
 * Build launch priority summary
 */
export async function buildLaunchPrioritySummary(
  input: FounderLaunchInput
): Promise<{
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  businessImpact: string;
  opportunityCost: number;
}> {
  let priorityLevel: 'critical' | 'high' | 'medium' | 'low' = 'medium';

  // Determine priority based on strategic context
  const isStrategicLaunch = input.strategicPriorities?.includes('strategic') ?? false;
  const revenue = input.executiveMetrics?.revenue as number ?? 0;
  const growth = input.executiveMetrics?.growth as number ?? 0;

  if (isStrategicLaunch || revenue > 100000 || growth > 0.2) {
    priorityLevel = 'critical';
  } else if (revenue > 50000 || growth > 0.1) {
    priorityLevel = 'high';
  } else if (revenue < 10000 && growth < 0.05) {
    priorityLevel = 'low';
  }

  // Calculate opportunity cost (simplified)
  const opportunityCost = revenue * 0.1; // Assuming 10% opportunity cost

  return {
    priorityLevel,
    businessImpact: `Priority ${priorityLevel} launch with revenue impact $${revenue.toLocaleString()}`,
    opportunityCost,
  };
}
