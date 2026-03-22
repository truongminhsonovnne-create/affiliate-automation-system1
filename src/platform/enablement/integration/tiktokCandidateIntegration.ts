/**
 * TikTok Candidate Integration
 *
 * Integrates TikTok-specific evidence into generic enablement layer.
 */

import type {
  PlatformEvidenceBundle,
  PlatformEnablementRisk,
} from '../types/index.js';
import logger from '../../../utils/logger.js';

/**
 * Collect TikTok-specific candidate evidence
 */
export async function collectTikTokCandidateEvidence(
  platformKey: string,
  params?: {
    from?: Date;
    to?: Date;
  }
): Promise<{
  previewIntelligence: Record<string, unknown>;
  commercialReadiness: Record<string, unknown>;
  governance: Record<string, unknown>;
}> {
  if (platformKey !== 'tiktok_shop') {
    return {
      previewIntelligence: {},
      commercialReadiness: {},
      governance: {},
    };
  }

  const evidence: {
    previewIntelligence: Record<string, unknown>;
    commercialReadiness: Record<string, unknown>;
    governance: Record<string, unknown>;
  } = {
    previewIntelligence: {},
    commercialReadiness: {},
    governance: {},
  };

  // Collect from TikTok preview intelligence
  try {
    const { runTikTokPreviewIntelligenceCycle } = await import(
      '../../tiktokShop/preview/service/tiktokPreviewIntelligenceService.js'
    );
    const result = await runTikTokPreviewIntelligenceCycle(params);

    evidence.previewIntelligence = {
      funnelSummary: result.funnelSummary,
      usefulnessScore: result.usefulnessResult.overallScore,
      stabilityScore: result.stabilityResult.overallScore,
      collectedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect TikTok preview intelligence', error });
  }

  // Collect from TikTok commercial readiness
  try {
    const { evaluateTikTokCommercialReadiness } = await import(
      '../../tiktokShop/preview/commercial/tiktokCommercialReadinessEvaluator.js'
    );
    // Would need to pass actual params
    evidence.commercialReadiness = {
      status: 'not_ready',
      collectedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect TikTok commercial readiness', error });
  }

  // Collect from TikTok governance
  try {
    const { runTikTokPreviewGovernanceReview } = await import(
      '../../tiktokShop/preview/governance/tiktokPreviewGovernanceService.js'
    );
    const governance = await runTikTokPreviewGovernanceReview();
    evidence.governance = {
      currentStage: governance.currentStage,
      openBlockers: governance.openBlockers.length,
      riskLevel: governance.riskLevel,
      collectedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.warn({ msg: 'Failed to collect TikTok governance', error });
  }

  return evidence;
}

/**
 * Build TikTok candidate summary
 */
export function buildTikTokCandidateSummary(
  evidence: ReturnType<typeof collectTikTokCandidateEvidence>
): {
  platform: string;
  previewReady: boolean;
  commercialReady: boolean;
  governanceReady: boolean;
  overallReadiness: number;
  summary: string;
} {
  const previewReady = evidence.previewIntelligence.usefulnessScore !== undefined &&
    evidence.previewIntelligence.usefulnessScore >= 65;

  const commercialReady = evidence.commercialReadiness.status === 'ready_for_production';

  const governanceReady = evidence.governance.riskLevel === 'low';

  let overallReadiness = 0;
  if (previewReady) overallReadiness += 40;
  if (commercialReady) overallReadiness += 30;
  if (governanceReady) overallReadiness += 30;

  const summary = [
    `Preview Intelligence: ${evidence.previewIntelligence.usefulnessScore ?? 'N/A'}% usefulness`,
    `Commercial Readiness: ${evidence.commercialReadiness.status ?? 'unknown'}`,
    `Governance Risk: ${evidence.governance.riskLevel ?? 'unknown'}`,
  ].join(' | ');

  return {
    platform: 'tiktok_shop',
    previewReady,
    commercialReady,
    governanceReady,
    overallReadiness,
    summary,
  };
}

/**
 * Build TikTok candidate risk summary
 */
export function buildTikTokCandidateRiskSummary(
  evidence: ReturnType<typeof collectTikTokCandidateEvidence>
): PlatformEnablementRisk[] {
  const risks: PlatformEnablementRisk[] = [];

  // Preview stability risk
  const stabilityScore = evidence.previewIntelligence.stabilityScore as number | undefined;
  if (stabilityScore !== undefined && stabilityScore < 65) {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'preview_stability',
      likelihood: 'high',
      impact: 'high',
      description: `Preview stability at ${stabilityScore}% - below acceptable threshold`,
      mitigation: 'Improve preview stability before production',
      residualRisk: 'Medium',
      evidence: { stabilityScore },
    });
  }

  // Preview usefulness risk
  const usefulnessScore = evidence.previewIntelligence.usefulnessScore as number | undefined;
  if (usefulnessScore !== undefined && usefulnessScore < 65) {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'preview_usefulness',
      likelihood: 'high',
      impact: 'high',
      description: `Preview usefulness at ${usefulnessScore}% - below acceptable threshold`,
      mitigation: 'Improve preview usefulness before production',
      residualRisk: 'Medium',
      evidence: { usefulnessScore },
    });
  }

  // Governance risk
  const riskLevel = evidence.governance.riskLevel as string | undefined;
  if (riskLevel !== undefined && riskLevel !== 'low') {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'governance',
      likelihood: 'high',
      impact: 'critical',
      description: `Governance risk level: ${riskLevel}`,
      mitigation: 'Address governance concerns before production',
      residualRisk: riskLevel === 'medium' ? 'Medium' : 'High',
      evidence: { riskLevel },
    });
  }

  // Commercial risk
  const commercialStatus = evidence.commercialReadiness.status as string | undefined;
  if (commercialStatus !== undefined && commercialStatus === 'not_ready') {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'commercial',
      likelihood: 'medium',
      impact: 'medium',
      description: 'Commercial readiness not yet achieved',
      mitigation: 'Complete commercial readiness work',
      residualRisk: 'Low',
      evidence: { status: commercialStatus },
    });
  }

  return risks;
}

/**
 * Add TikTok-specific evidence to bundle
 */
export function enrichWithTikTokEvidence(
  bundle: PlatformEvidenceBundle,
  tiktokEvidence: ReturnType<typeof collectTikTokCandidateEvidence>
): PlatformEvidenceBundle {
  // Override preview evidence with TikTok-specific data
  const previewIntelligence = tiktokEvidence.previewIntelligence as {
    usefulnessScore?: number;
    stabilityScore?: number;
  };

  if (previewIntelligence.usefulnessScore !== undefined) {
    bundle.previewEvidence.usefulnessScore = previewIntelligence.usefulnessScore;
  }

  if (previewIntelligence.stabilityScore !== undefined) {
    bundle.previewEvidence.stabilityScore = previewIntelligence.stabilityScore;
  }

  return bundle;
}
