/**
 * Release Readiness Integration
 *
 * Integrates with release readiness/gating system.
 */

import type { PlatformProductionCandidateScore, PlatformEnablementBlocker } from '../types/index.js';
import logger from '../../../utils/logger.js';

/**
 * Build platform release gate decision
 */
export async function buildPlatformReleaseGateDecision(
  platformKey: string,
  score: PlatformProductionCandidateScore,
  blockers: PlatformEnablementBlocker[]
): Promise<{
  canRelease: boolean;
  gateStatus: 'approved' | 'conditional' | 'rejected' | 'pending';
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}> {
  const gateBlockers: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check governance safety
  if (score.governanceSafety !== null && score.governanceSafety < 80) {
    gateBlockers.push(`Governance not approved (score: ${score.governanceSafety}%)`);
  }

  // Check preview stability
  if (score.previewStability !== null && score.previewStability < 65) {
    gateBlockers.push(`Preview stability below threshold (score: ${score.previewStability}%)`);
  }

  // Check critical blockers
  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  if (criticalBlockers.length > 0) {
    gateBlockers.push(`${criticalBlockers.length} critical blocker(s) present`);
  }

  // Check overall score
  if (score.overall !== null && score.overall < 55) {
    gateBlockers.push(`Overall readiness too low (score: ${score.overall}%)`);
  }

  // Generate warnings
  if (score.previewUsefulness !== null && score.previewUsefulness < 70) {
    warnings.push('Preview usefulness could be improved');
  }

  if (score.commercialReadiness !== null && score.commercialReadiness < 70) {
    warnings.push('Commercial readiness could be improved');
  }

  // Generate recommendations
  if (gateBlockers.length === 0) {
    recommendations.push('Platform ready for release approval');
  } else if (gateBlockers.length <= 2) {
    recommendations.push('Consider conditional release with monitoring');
  } else {
    recommendations.push('Address blockers before release');
  }

  const canRelease = gateBlockers.length === 0;
  const gateStatus = canRelease ? 'approved' : gateBlockers.length <= 2 ? 'conditional' : 'rejected';

  return {
    canRelease,
    gateStatus,
    blockers: gateBlockers,
    warnings,
    recommendations,
  };
}

/**
 * Collect platform release risks
 */
export async function collectPlatformReleaseRisks(
  platformKey: string,
  score: PlatformProductionCandidateScore
): Promise<Array<{
  riskId: string;
  riskType: string;
  severity: string;
  description: string;
  mitigation: string;
}>> {
  const risks: Array<{
    riskId: string;
    riskType: string;
    severity: string;
    description: string;
    mitigation: string;
  }> = [];

  // Data foundation risk
  if (score.dataFoundational !== null && score.dataFoundational < 65) {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'data_quality',
      severity: 'high',
      description: `Data foundation score (${score.dataFoundational}%) below threshold`,
      mitigation: 'Complete data quality work before release',
    });
  }

  // Acquisition risk
  if (score.acquisitionStability !== null && score.acquisitionStability < 60) {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'acquisition',
      severity: 'high',
      description: `Acquisition stability (${score.acquisitionStability}%) below threshold`,
      mitigation: 'Stabilize acquisition pipeline before release',
    });
  }

  // Preview risk
  if (score.previewStability !== null && score.previewStability < 65) {
    risks.push({
      riskId: crypto.randomUUID(),
      riskType: 'preview',
      severity: 'medium',
      description: `Preview stability (${score.previewStability}%) below threshold`,
      mitigation: 'Improve preview stability',
    });
  }

  return risks;
}

/**
 * Build platform release gate summary
 */
export function buildPlatformReleaseGateSummary(
  platformKey: string,
  releaseDecision: ReturnType<typeof buildPlatformReleaseGateDecision>
): {
  platformKey: string;
  gateStatus: string;
  canRelease: boolean;
  summary: string;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
} {
  return {
    platformKey,
    gateStatus: releaseDecision.gateStatus,
    canRelease: releaseDecision.canRelease,
    summary: releaseDecision.canRelease
      ? `${platformKey} approved for release`
      : `${platformKey} blocked from release - ${releaseDecision.blockers.length} blocker(s)`,
    blockers: releaseDecision.blockers,
    warnings: releaseDecision.warnings,
    recommendations: releaseDecision.recommendations,
  };
}
