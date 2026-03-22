/**
 * Platform Rollout Launch Integration
 * Integrates multi-platform rollout into launch closure
 */

export interface PlatformRolloutLaunchInput {
  shopeeStatus?: Record<string, unknown>;
  tiktokStatus?: Record<string, unknown>;
  platformParityStatus?: Record<string, unknown>;
  enablementDecisions?: Record<string, unknown>[];
}

/**
 * Collect platform rollout launch inputs
 */
export async function collectPlatformRolloutLaunchInputs(
  input: PlatformRolloutLaunchInput
): Promise<{
  shopeeStatus: Record<string, unknown>;
  tiktokStatus: Record<string, unknown>;
  platformParityStatus: Record<string, unknown>;
}> {
  return {
    shopeeStatus: input.shopeeStatus ?? {},
    tiktokStatus: input.tiktokStatus ?? {},
    platformParityStatus: input.platformParityStatus ?? {},
  };
}

/**
 * Build platform blast radius summary
 */
export async function buildPlatformBlastRadiusSummary(
  input: PlatformRolloutLaunchInput
): Promise<{
  shopeeBlastRadius: 'none' | 'low' | 'medium' | 'high';
  tiktokBlastRadius: 'none' | 'low' | 'medium' | 'high';
  affectedUsers: number;
  affectedRevenue: number;
  rollbackComplexity: 'simple' | 'moderate' | 'complex';
}> {
  // Determine Shopee blast radius
  const shopeeStatus = input.shopeeStatus?.status ?? 'production';
  let shopeeBlastRadius: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (shopeeStatus === 'production') {
    shopeeBlastRadius = 'high';
  } else if (shopeeStatus === 'staged') {
    shopeeBlastRadius = 'medium';
  }

  // Determine TikTok blast radius
  const tiktokStatus = input.tiktokStatus?.status ?? 'preview';
  let tiktokBlastRadius: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (tiktokStatus === 'production') {
    tiktokBlastRadius = 'high';
  } else if (tiktokStatus === 'preview') {
    tiktokBlastRadius = 'medium';
  } else if (tiktokStatus === 'sandbox') {
    tiktokBlastRadius = 'low';
  }

  // Calculate affected metrics
  const affectedUsers = calculateAffectedUsers(input);
  const affectedRevenue = calculateAffectedRevenue(input);

  // Determine rollback complexity
  const rollbackComplexity = determineRollbackComplexity(shopeeBlastRadius, tiktokBlastRadius);

  return {
    shopeeBlastRadius,
    tiktokBlastRadius,
    affectedUsers,
    affectedRevenue,
    rollbackComplexity,
  };
}

/**
 * Build platform launch guardrail inputs
 */
export async function buildPlatformLaunchGuardrailInputs(
  input: PlatformRolloutLaunchInput
): Promise<{
  guardrails: string[];
  thresholds: Record<string, number>;
}> {
  return {
    guardrails: [
      'shopee_production_stable',
      'tiktok_preview_safe',
      'platform_parity_maintained',
      'rollback_procedures_ready',
    ],
    thresholds: {
      shopee_error_rate_max: 0.05,
      tiktok_error_rate_max: 0.10,
      platform_parity_min: 0.70,
    },
  };
}

// Helper functions

function calculateAffectedUsers(input: PlatformRolloutLaunchInput): number {
  const shopeeUsers = input.shopeeStatus?.activeUsers ?? 0;
  const tiktokUsers = input.tiktokStatus?.activeUsers ?? 0;
  return shopeeUsers + tiktokUsers;
}

function calculateAffectedRevenue(input: PlatformRolloutLaunchInput): number {
  const shopeeRevenue = input.shopeeStatus?.dailyRevenue ?? 0;
  const tiktokRevenue = input.tiktokStatus?.dailyRevenue ?? 0;
  return shopeeRevenue + tiktokRevenue;
}

function determineRollbackComplexity(
  shopeeBlastRadius: string,
  tiktokBlastRadius: string
): 'simple' | 'moderate' | 'complex' {
  if (shopeeBlastRadius === 'high' || tiktokBlastRadius === 'high') {
    return 'complex';
  }
  if (shopeeBlastRadius === 'medium' || tiktokBlastRadius === 'medium') {
    return 'moderate';
  }
  return 'simple';
}
