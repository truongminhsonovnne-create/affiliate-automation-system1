/**
 * Governance Parity Integration
 * Integrates governance/release readiness/enablement into parity layer
 */

import type {
  PlatformKey,
  PlatformParityGap,
  PlatformExceptionRecord,
} from '../types.js';

import { PlatformParityGapSeverity as Severity } from '../types.js';

export interface GovernanceInput {
  shopeeReleaseMetrics: Record<string, number>;
  tiktokReleaseMetrics: Record<string, number>;
  openGaps: PlatformParityGap[];
  activeExceptions: PlatformExceptionRecord[];
}

export interface ReadinessInput {
  shopeeReadinessData: Record<string, unknown>;
  tiktokReadinessData: Record<string, unknown>;
}

export interface RiskInput {
  shopeeRiskData: Record<string, unknown>;
  tiktokRiskData: Record<string, unknown>;
}

/**
 * Build unified governance inputs
 */
export async function buildUnifiedGovernanceInputs(
  input: GovernanceInput
): Promise<{
  releaseReadiness: Record<PlatformKey, Record<string, unknown>>;
  enablementRisk: Record<PlatformKey, Record<string, unknown>>;
  complianceStatus: Record<PlatformKey, string>;
  overallGovernanceHealth: 'healthy' | 'warning' | 'critical';
}> {
  const { shopeeReleaseMetrics, tiktokReleaseMetrics, openGaps, activeExceptions } = input;

  // Build release readiness
  const releaseReadiness = {
    shopee: {
      readinessScore: shopeeReleaseMetrics.releaseReadinessScore ?? 1.0,
      pendingReleases: shopeeReleaseMetrics.pendingReleases ?? 0,
      completedReleases: shopeeReleaseMetrics.completedReleases ?? 0,
      failedReleases: shopeeReleaseMetrics.failedReleases ?? 0,
    },
    tiktok_shop: {
      readinessScore: tiktokReleaseMetrics.releaseReadinessScore ?? 0.5,
      pendingReleases: tiktokReleaseMetrics.pendingReleases ?? 0,
      completedReleases: tiktokReleaseMetrics.completedReleases ?? 0,
      failedReleases: tiktokReleaseMetrics.failedReleases ?? 0,
    },
  };

  // Build enablement risk
  const enablementRisk = {
    shopee: {
      riskScore: shopeeReleaseMetrics.enablementRiskScore ?? 0.1,
      enabledFeatures: shopeeReleaseMetrics.enabledFeatures ?? [],
      pendingEnablements: shopeeReleaseMetrics.pendingEnablements ?? [],
    },
    tiktok_shop: {
      riskScore: tiktokReleaseMetrics.enablementRiskScore ?? 0.5,
      enabledFeatures: tiktokReleaseMetrics.enabledFeatures ?? [],
      pendingEnablements: tiktokReleaseMetrics.pendingEnablements ?? [],
    },
  };

  // Determine compliance status
  const shopeeCompliance = calculateComplianceStatus(releaseReadiness.shopee, enablementRisk.shopee);
  const tiktokCompliance = calculateComplianceStatus(
    releaseReadiness.tiktok_shop,
    enablementRisk.tiktok_shop
  );

  const complianceStatus = {
    shopee: shopeeCompliance,
    tiktok_shop: tiktokCompliance,
  };

  // Calculate overall governance health
  const overallGovernanceHealth = calculateGovernanceHealth(
    releaseReadiness,
    enablementRisk,
    openGaps,
    activeExceptions
  );

  return {
    releaseReadiness,
    enablementRisk,
    complianceStatus,
    overallGovernanceHealth,
  };
}

/**
 * Build cross-platform readiness summary
 */
export async function buildCrossPlatformReadinessSummary(
  shopeeReadiness: Record<string, unknown>,
  tiktokReadiness: Record<string, unknown>
): Promise<{
  shopee: Record<string, unknown>;
  tiktok: Record<string, unknown>;
  comparison: {
    readinessGap: number;
    isAcceptable: boolean;
    recommendation: string;
  };
}> {
  const shopeeScore = (shopeeReadiness.readinessScore as number) ?? 1.0;
  const tiktokScore = (tiktokReadiness.readinessScore as number) ?? 0.5;

  const readinessGap = shopeeScore - tiktokScore;
  const isAcceptable = Math.abs(readinessGap) <= 0.3;

  let recommendation = '';
  if (readinessGap > 0.3) {
    recommendation = 'TikTok Shop readiness significantly lags Shopee. Prioritize TikTok readiness improvements.';
  } else if (readinessGap < -0.3) {
    recommendation = 'Shopee readiness has regressed. Investigate Shopee pipeline issues.';
  } else {
    recommendation = 'Platform readiness is balanced. Continue monitoring.';
  }

  return {
    shopee: shopeeReadiness,
    tiktok: tiktokReadiness,
    comparison: {
      readinessGap,
      isAcceptable,
      recommendation,
    },
  };
}

/**
 * Build cross-platform risk summary
 */
export async function buildCrossPlatformRiskSummary(
  shopeeRiskData: Record<string, unknown>,
  tiktokRiskData: Record<string, unknown>,
  gaps: PlatformParityGap[],
  exceptions: PlatformExceptionRecord[]
): Promise<{
  shopee: Record<string, unknown>;
  tiktok: Record<string, unknown>;
  combinedRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
}> {
  const shopeeRisk = (shopeeRiskData.riskScore as number) ?? 0.1;
  const tiktokRisk = (tiktokRiskData.riskScore as number) ?? 0.5;

  // Identify risk factors
  const riskFactors: RiskFactor[] = [];

  // Add gap-related risk factors
  const shopeeGaps = gaps.filter((g) => g.platformKey === 'shopee');
  const tiktokGaps = gaps.filter((g) => g.platformKey === 'tiktok_shop');

  if (shopeeGaps.filter((g) => g.severity === Severity.CRITICAL).length > 0) {
    riskFactors.push({
      factor: 'Critical gaps in Shopee pipeline',
      severity: 'critical',
      affectedPlatform: 'shopee',
    });
  }

  if (tiktokGaps.filter((g) => g.severity === Severity.CRITICAL).length > 0) {
    riskFactors.push({
      factor: 'Critical gaps in TikTok Shop pipeline',
      severity: 'critical',
      affectedPlatform: 'tiktok_shop',
    });
  }

  // Add exception-related risk factors
  const shopeeExceptions = exceptions.filter((e) => e.platformKey === 'shopee');
  const tiktokExceptions = exceptions.filter((e) => e.platformKey === 'tiktok_shop');

  if (shopeeExceptions.length > 5) {
    riskFactors.push({
      factor: `High number of Shopee exceptions (${shopeeExceptions.length})`,
      severity: 'medium',
      affectedPlatform: 'shopee',
    });
  }

  if (tiktokExceptions.length > 3) {
    riskFactors.push({
      factor: `High number of TikTok Shop exceptions (${tiktokExceptions.length})`,
      severity: 'medium',
      affectedPlatform: 'tiktok_shop',
    });
  }

  // Determine combined risk
  let combinedRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  const avgRisk = (shopeeRisk + tiktokRisk) / 2;
  const criticalFactors = riskFactors.filter((f) => f.severity === 'critical').length;

  if (criticalFactors > 0 || avgRisk > 0.7) {
    combinedRisk = 'critical';
  } else if (avgRisk > 0.5 || criticalFactors > 0) {
    combinedRisk = 'high';
  } else if (avgRisk > 0.3) {
    combinedRisk = 'medium';
  }

  return {
    shopee: shopeeRiskData,
    tiktok: tiktokRiskData,
    combinedRisk,
    riskFactors,
  };
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedPlatform: PlatformKey;
}

// Helper functions

function calculateComplianceStatus(
  readiness: Record<string, unknown>,
  risk: Record<string, unknown>
): string {
  const readinessScore = (readiness.readinessScore as number) ?? 1.0;
  const riskScore = (risk.riskScore as number) ?? 0;

  if (readinessScore >= 0.8 && riskScore <= 0.2) {
    return 'compliant';
  }
  if (readinessScore >= 0.6 && riskScore <= 0.4) {
    return 'needs_attention';
  }
  return 'non_compliant';
}

function calculateGovernanceHealth(
  releaseReadiness: Record<PlatformKey, Record<string, unknown>>,
  enablementRisk: Record<PlatformKey, Record<string, unknown>>,
  gaps: PlatformParityGap[],
  exceptions: PlatformExceptionRecord[]
): 'healthy' | 'warning' | 'critical' {
  // Check readiness scores
  const shopeeReadiness = (releaseReadiness.shopee.readinessScore as number) ?? 1.0;
  const tiktokReadiness = (releaseReadiness.tiktok_shop?.readinessScore as number) ?? 0.5;

  // Check risk scores
  const shopeeRisk = (enablementRisk.shopee.riskScore as number) ?? 0.1;
  const tiktokRisk = (enablementRisk.tiktok_shop?.riskScore as number) ?? 0.5;

  // Check gap severity
  const criticalGaps = gaps.filter((g) => g.severity === Severity.CRITICAL).length;
  const highGaps = gaps.filter((g) => g.severity === Severity.HIGH).length;

  // Determine health
  if (
    shopeeReadiness < 0.5 ||
    tiktokReadiness < 0.3 ||
    shopeeRisk > 0.7 ||
    tiktokRisk > 0.8 ||
    criticalGaps > 2
  ) {
    return 'critical';
  }

  if (
    shopeeReadiness < 0.7 ||
    tiktokReadiness < 0.5 ||
    shopeeRisk > 0.4 ||
    tiktokRisk > 0.5 ||
    criticalGaps > 0 ||
    highGaps > 3
  ) {
    return 'warning';
  }

  return 'healthy';
}
