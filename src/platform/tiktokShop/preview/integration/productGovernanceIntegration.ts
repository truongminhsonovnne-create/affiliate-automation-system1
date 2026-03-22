/**
 * Product Governance Integration
 *
 * Integrates preview/commercial readiness with governance/release readiness.
 */

import type { TikTokShopPreviewWarning } from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Collect governance signals
 */
export async function collectTikTokPreviewGovernanceSignals(): Promise<Record<string, unknown>> {
  logger.info({ msg: 'Collecting TikTok preview governance signals' });

  // Would integrate with existing governance services
  return {
    platform: 'tiktok_shop',
    governanceSignals: {
      previewIntelligence: true,
      commercialReadiness: true,
      monetizationGovernance: true,
    },
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Build release readiness signals
 */
export async function buildTikTokPreviewReleaseReadinessSignals(params: {
  readinessScore: number;
  stabilityScore: number;
  usefulnessScore: number;
  blockersCount: number;
}): Promise<Record<string, unknown>> {
  const { readinessScore, stabilityScore, usefulnessScore, blockersCount } = params;

  // Determine release readiness
  let releaseReady: boolean;
  let readinessLevel: string;

  if (blockersCount > 0) {
    releaseReady = false;
    readinessLevel = 'blocked';
  } else if (readinessScore >= 80 && stabilityScore >= 70) {
    releaseReady = true;
    readinessLevel = 'production_ready';
  } else if (readinessScore >= 60 && stabilityScore >= 50) {
    releaseReady = false;
    readinessLevel = 'preview_ready';
  } else {
    releaseReady = false;
    readinessLevel = 'not_ready';
  }

  return {
    releaseReady,
    readinessLevel,
    signals: {
      overall: readinessScore,
      stability: stabilityScore,
      usefulness: usefulnessScore,
      blockers: blockersCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build risk summary
 */
export async function buildTikTokPreviewRiskSummary(params: {
  stabilityResult?: { risks: string[]; warnings: string[] };
  usefulnessResult?: { weaknesses: string[]; warnings: string[] };
  commercialReadinessResult?: { blockers: TikTokShopPreviewWarning[]; warnings: TikTokShopPreviewWarning[] };
}): Promise<Record<string, unknown>> {
  const { stabilityResult, usefulnessResult, commercialReadinessResult } = params;

  const risks: string[] = [];
  const warnings: string[] = [];

  // Collect from all sources
  if (stabilityResult) {
    risks.push(...stabilityResult.risks);
    warnings.push(...stabilityResult.warnings);
  }

  if (usefulnessResult) {
    risks.push(...usefulnessResult.weaknesses);
    warnings.push(...usefulnessResult.warnings);
  }

  if (commercialReadinessResult) {
    risks.push(...commercialReadinessResult.blockers.map((b) => b.message));
    warnings.push(...commercialReadinessResult.warnings.map((w) => w.message));
  }

  // Determine overall risk level
  let riskLevel: string;
  if (risks.length >= 5) {
    riskLevel = 'high';
  } else if (risks.length >= 2) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    riskLevel,
    riskCount: risks.length,
    warningCount: warnings.length,
    risks: risks.slice(0, 10),
    warnings: warnings.slice(0, 20),
    generatedAt: new Date().toISOString(),
  };
}
