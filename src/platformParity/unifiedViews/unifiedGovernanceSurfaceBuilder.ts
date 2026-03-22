/**
 * Unified Governance Surface Builder
 * Builds unified governance and risk management surfaces
 */

import type {
  PlatformKey,
  UnifiedGovernanceSurface,
  PlatformParityGap,
  PlatformExceptionRecord,
} from '../types.js';

import { PlatformParityGapSeverity as Severity } from '../types.js';

export interface GovernanceInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  openGaps: PlatformParityGap[];
  activeExceptions: PlatformExceptionRecord[];
}

export interface ReleaseReadinessInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  pendingFeatures: Record<PlatformKey, string[]>;
  completedFeatures: Record<PlatformKey, string[]>;
}

export interface EnablementRiskInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  enablementDecisions: Record<PlatformKey, string[]>;
  platformReadiness: Record<PlatformKey, number>;
}

export interface BacklogPressureInput {
  shopeeMetrics: Record<string, number>;
  tiktokMetrics: Record<string, number>;
  gapBacklog: PlatformParityGap[];
  exceptionReviewBacklog: PlatformExceptionRecord[];
}

/**
 * Build unified governance surface
 */
export async function buildUnifiedGovernanceSurface(
  input: GovernanceInput
): Promise<UnifiedGovernanceSurface> {
  const { shopeeMetrics, tiktokMetrics, openGaps, activeExceptions } = input;

  // Build release readiness data
  const releaseReadinessData: UnifiedGovernanceSurface['releaseReadinessData'] = {
    shopee: {
      releaseReadinessScore: shopeeMetrics.releaseReadinessScore ?? 1.0,
      pendingReleases: shopeeMetrics.pendingReleases ?? 0,
      completedReleases: shopeeMetrics.completedReleases ?? 0,
      failedReleases: shopeeMetrics.failedReleases ?? 0,
    },
    tiktok_shop: {
      releaseReadinessScore: tiktokMetrics.releaseReadinessScore ?? 0.5,
      pendingReleases: tiktokMetrics.pendingReleases ?? 0,
      completedReleases: tiktokMetrics.completedReleases ?? 0,
      failedReleases: tiktokMetrics.failedReleases ?? 0,
    },
  };

  // Build enablement risk data
  const enablementRiskData: UnifiedGovernanceSurface['enablementRiskData'] = {
    shopee: {
      enablementRiskScore: shopeeMetrics.enablementRiskScore ?? 0.1,
      enabledFeatures: shopeeMetrics.enabledFeatures ?? [],
      pendingEnablements: shopeeMetrics.pendingEnablements ?? [],
    },
    tiktok_shop: {
      enablementRiskScore: tiktokMetrics.enablementRiskScore ?? 0.5,
      enabledFeatures: tiktokMetrics.enabledFeatures ?? [],
      pendingEnablements: tiktokMetrics.pendingEnablements ?? [],
    },
  };

  // Build backlog pressure data
  const backlogPressureData: UnifiedGovernanceSurface['backlogPressureData'] = {
    shopee: {
      backlogCount: openGaps.filter((g) => g.platformKey === 'shopee').length,
      criticalBacklog: openGaps.filter(
        (g) => g.platformKey === 'shopee' && g.severity === Severity.CRITICAL
      ).length,
      highBacklog: openGaps.filter(
        (g) => g.platformKey === 'shopee' && g.severity === Severity.HIGH
      ).length,
    },
    tiktok_shop: {
      backlogCount: openGaps.filter((g) => g.platformKey === 'tiktok_shop').length,
      criticalBacklog: openGaps.filter(
        (g) => g.platformKey === 'tiktok_shop' && g.severity === Severity.CRITICAL
      ).length,
      highBacklog: openGaps.filter(
        (g) => g.platformKey === 'tiktok_shop' && g.severity === Severity.HIGH
      ).length,
    },
  };

  // Build governance metrics
  const governanceMetrics = buildGovernanceMetrics(
    releaseReadinessData,
    enablementRiskData,
    backlogPressureData,
    activeExceptions
  );

  return {
    surfaceKey: 'unified-governance',
    surfaceType: 'overview',
    releaseReadinessData,
    enablementRiskData,
    backlogPressureData,
    governanceMetrics,
    generatedAt: new Date(),
  };
}

/**
 * Build unified release readiness surface
 */
export async function buildUnifiedReleaseReadinessSurface(
  input: ReleaseReadinessInput
): Promise<{
  data: UnifiedGovernanceSurface['releaseReadinessData'];
  summary: string;
  overallReadiness: number;
}> {
  const { shopeeMetrics, tiktokMetrics, pendingFeatures, completedFeatures } = input;

  const shopeeReadiness = shopeeMetrics.releaseReadinessScore ?? 1.0;
  const tiktokReadiness = tiktokMetrics.releaseReadinessScore ?? 0.5;
  const overallReadiness = (shopeeReadiness + tiktokReadiness) / 2;

  const data: UnifiedGovernanceSurface['releaseReadinessData'] = {
    shopee: {
      releaseReadinessScore: shopeeReadiness,
      pendingReleases: pendingFeatures.shopee?.length ?? 0,
      completedReleases: completedFeatures.shopee?.length ?? 0,
      failedReleases: shopeeMetrics.failedReleases ?? 0,
    },
    tiktok_shop: {
      releaseReadinessScore: tiktokReadiness,
      pendingReleases: pendingFeatures.tiktok_shop?.length ?? 0,
      completedReleases: completedFeatures.tiktok_shop?.length ?? 0,
      failedReleases: tiktokMetrics.failedReleases ?? 0,
    },
  };

  const summary = `Shopee readiness: ${(shopeeReadiness * 100).toFixed(0)}%, TikTok readiness: ${(tiktokReadiness * 100).toFixed(0)}%. Overall: ${(overallReadiness * 100).toFixed(0)}%.`;

  return { data, summary, overallReadiness };
}

/**
 * Build unified enablement risk surface
 */
export async function buildUnifiedEnablementRiskSurface(
  input: EnablementRiskInput
): Promise<{
  data: UnifiedGovernanceSurface['enablementRiskData'];
  summary: string;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, enablementDecisions, platformReadiness } = input;

  const shopeeRisk = shopeeMetrics.enablementRiskScore ?? 0.1;
  const tiktokRisk = tiktokMetrics.enablementRiskScore ?? 0.5;

  const data: UnifiedGovernanceSurface['enablementRiskData'] = {
    shopee: {
      enablementRiskScore: shopeeRisk,
      enabledFeatures: shopeeMetrics.enabledFeatures ?? [],
      pendingEnablements: shopeeMetrics.pendingEnablements ?? [],
      platformReadiness: platformReadiness.shopee ?? 1.0,
    },
    tiktok_shop: {
      enablementRiskScore: tiktokRisk,
      enabledFeatures: tiktokMetrics.enabledFeatures ?? [],
      pendingEnablements: tiktokMetrics.pendingEnablements ?? [],
      platformReadiness: platformReadiness.tiktok_shop ?? 0.6,
    },
  };

  const overallRisk = calculateOverallRisk(shopeeRisk, tiktokRisk);

  const summary = `Shopee risk: ${(shopeeRisk * 100).toFixed(0)}%, TikTok risk: ${(tiktokRisk * 100).toFixed(0)}%. Overall risk: ${overallRisk}.`;

  return { data, summary, overallRiskLevel: overallRisk };
}

/**
 * Build unified backlog pressure surface
 */
export async function buildUnifiedBacklogPressureSurface(
  input: BacklogPressureInput
): Promise<{
  data: UnifiedGovernanceSurface['backlogPressureData'];
  summary: string;
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
}> {
  const { shopeeMetrics, tiktokMetrics, gapBacklog, exceptionReviewBacklog } = input;

  const shopeeBacklog = gapBacklog.filter((g) => g.platformKey === 'shopee').length;
  const tiktokBacklog = gapBacklog.filter((g) => g.platformKey === 'tiktok_shop').length;
  const totalBacklog = shopeeBacklog + tiktokBacklog;

  const shopeeExceptions = exceptionReviewBacklog.filter(
    (e) => e.platformKey === 'shopee'
  ).length;
  const tiktokExceptions = exceptionReviewBacklog.filter(
    (e) => e.platformKey === 'tiktok_shop'
  ).length;

  const data: UnifiedGovernanceSurface['backlogPressureData'] = {
    shopee: {
      backlogCount: shopeeBacklog,
      criticalBacklog: gapBacklog.filter(
        (g) => g.platformKey === 'shopee' && g.severity === Severity.CRITICAL
      ).length,
      highBacklog: gapBacklog.filter(
        (g) => g.platformKey === 'shopee' && g.severity === Severity.HIGH
      ).length,
      exceptionReviewCount: shopeeExceptions,
    },
    tiktok_shop: {
      backlogCount: tiktokBacklog,
      criticalBacklog: gapBacklog.filter(
        (g) => g.platformKey === 'tiktok_shop' && g.severity === Severity.CRITICAL
      ).length,
      highBacklog: gapBacklog.filter(
        (g) => g.platformKey === 'tiktok_shop' && g.severity === Severity.HIGH
      ).length,
      exceptionReviewCount: tiktokExceptions,
    },
  };

  const pressureLevel = calculateBacklogPressure(
    data.shopee.backlogCount,
    data.tiktok_shop.backlogCount,
    data.shopee.criticalBacklog + data.tiktok_shop.criticalBacklog
  );

  const summary = `Total backlog items: ${totalBacklog}. Shopee: ${shopeeBacklog} (${data.shopee.criticalBacklog} critical), TikTok: ${tiktokBacklog} (${data.tiktok_shop.criticalBacklog} critical). Pressure: ${pressureLevel}.`;

  return { data, summary, pressureLevel };
}

// Helper functions

function buildGovernanceMetrics(
  releaseReadiness: UnifiedGovernanceSurface['releaseReadinessData'],
  enablementRisk: UnifiedGovernanceSurface['enablementRiskData'],
  backlogPressure: UnifiedGovernanceSurface['backlogPressureData'],
  activeExceptions: PlatformExceptionRecord[]
): Record<string, unknown> {
  const shopeeReadiness = releaseReadiness.shopee.releaseReadinessScore;
  const tiktokReadiness = releaseReadiness.tiktok_shop.releaseReadinessScore;

  const shopeeRisk = enablementRisk.shopee.enablementRiskScore;
  const tiktokRisk = enablementRisk.tiktok_shop.enablementRiskScore;

  const shopeeBacklog = backlogPressure.shopee.backlogCount;
  const tiktokBacklog = backlogPressure.tiktok_shop.backlogCount;

  // Calculate governance score (0-1, higher is better)
  const avgReadiness = (shopeeReadiness + tiktokReadiness) / 2;
  const avgRisk = (shopeeRisk + tiktokRisk) / 2;
  const backlogPenalty = Math.min((shopeeBacklog + tiktokBacklog) / 100, 0.3);

  const governanceScore = Math.max(0, Math.min(1, avgReadiness - avgRisk - backlogPenalty));

  return {
    governanceScore,
    avgReadiness,
    avgRisk,
    totalBacklog: shopeeBacklog + tiktokBacklog,
    activeExceptionCount: activeExceptions.length,
    governanceStatus: governanceScore >= 0.7 ? 'compliant'
      : governanceScore >= 0.5 ? 'needs_attention'
      : 'non_compliant',
  };
}

function calculateOverallRisk(
  shopeeRisk: number,
  tiktokRisk: number
): 'low' | 'medium' | 'high' | 'critical' {
  const avgRisk = (shopeeRisk + tiktokRisk) / 2;

  if (avgRisk >= 0.7) return 'critical';
  if (avgRisk >= 0.5) return 'high';
  if (avgRisk >= 0.3) return 'medium';

  return 'low';
}

function calculateBacklogPressure(
  shopeeBacklog: number,
  tiktokBacklog: number,
  criticalCount: number
): 'low' | 'medium' | 'high' | 'critical' {
  const totalBacklog = shopeeBacklog + tiktokBacklog;

  if (criticalCount > 5 || totalBacklog > 50) return 'critical';
  if (criticalCount > 2 || totalBacklog > 30) return 'high';
  if (criticalCount > 0 || totalBacklog > 10) return 'medium';

  return 'low';
}
