/**
 * Production Candidate Evaluator
 *
 * Core evaluation logic for platform production candidate readiness.
 */

import type {
  PlatformProductionCandidateScore,
  PlatformCandidateStatus,
  PlatformEvidenceBundle,
  PlatformEnablementBlocker,
  PlatformEnablementWarning,
} from '../types/index.js';
import {
  SCORE_THRESHOLDS,
  DECISION_THRESHOLDS,
  DIMENSION_WEIGHTS,
} from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Evaluate platform production candidate status
 */
export function evaluatePlatformProductionCandidate(
  bundle: PlatformEvidenceBundle
): {
  status: PlatformCandidateStatus;
  readinessScore: PlatformProductionCandidateScore;
  blockers: PlatformEnablementBlocker[];
  warnings: PlatformEnablementWarning[];
} {
  logger.info({
    msg: 'Evaluating platform production candidate',
    platformKey: bundle.platformKey,
  });

  // Import normalizer to get scores
  const { normalizePlatformEvidence } = require('../evidence/platformEvidenceNormalizer.js');
  const readinessScore = normalizePlatformEvidence(bundle);

  // Classify status
  const status = classifyPlatformCandidateStatus(readinessScore);

  // Build blockers and warnings based on scores
  const blockers = buildPlatformBlockers(bundle, readinessScore);
  const warnings = buildPlatformWarnings(bundle, readinessScore);

  logger.info({
    msg: 'Platform production candidate evaluated',
    platformKey: bundle.platformKey,
    status,
    score: readinessScore.overall,
    blockerCount: blockers.length,
    warningCount: warnings.length,
  });

  return { status, readinessScore, blockers, warnings };
}

/**
 * Classify platform candidate status based on readiness score
 */
export function classifyPlatformCandidateStatus(
  score: PlatformProductionCandidateScore
): PlatformCandidateStatus {
  const overall = score.overall ?? 0;

  // Check NOT_READY conditions
  if (
    overall <= SCORE_THRESHOLDS.NOT_READY_MAX ||
    score.governanceSafety !== null && score.governanceSafety < SCORE_THRESHOLDS.GOVERNANCE_SAFETY_MIN
  ) {
    return 'not_ready';
  }

  // Check HOLD conditions
  if (overall < SCORE_THRESHOLDS.PROCEED_CAUTIOUSLY_MIN) {
    return 'hold';
  }

  // Check production candidate conditions
  const productionCandidateChecks = DECISION_THRESHOLDS.PRODUCTION_CANDIDATE;
  if (
    overall >= productionCandidateChecks.MIN_OVERALL_SCORE &&
    score.governanceSafety !== null &&
    score.governanceSafety >= productionCandidateChecks.MIN_GOVERNANCE_SCORE &&
    (score.previewStability === null || score.previewStability >= productionCandidateChecks.MIN_PREVIEW_STABILITY) &&
    (score.previewUsefulness === null || score.previewUsefulness >= productionCandidateChecks.MIN_PREVIEW_USEFULNESS)
  ) {
    return 'production_candidate';
  }

  // Default to proceed cautiously
  return 'proceed_cautiously';
}

/**
 * Build platform production candidate score summary
 */
export function buildPlatformProductionCandidateScoreSummary(
  score: PlatformProductionCandidateScore
): {
  overall: number | null;
  dimensions: Record<string, { score: number | null; status: string; weight: number }>;
  weightedBreakdown: Record<string, number>;
} {
  const dimensions: Record<string, { score: number | null; status: string; weight: number }> = {};
  const weightedBreakdown: Record<string, number> = {};

  for (const dim of score.dimensions) {
    dimensions[dim.dimension] = {
      score: dim.score,
      status: dim.status,
      weight: dim.weight,
    };

    if (dim.score !== null) {
      weightedBreakdown[dim.dimension] = dim.score * dim.weight;
    }
  }

  return {
    overall: score.overall,
    dimensions,
    weightedBreakdown,
  };
}

/**
 * Build production candidate summary
 */
export function buildProductionCandidateSummary(
  bundle: PlatformEvidenceBundle,
  status: PlatformCandidateStatus,
  score: PlatformProductionCandidateScore
): string {
  const lines: string[] = [];

  lines.push(`Platform: ${bundle.platformKey}`);
  lines.push(`Status: ${status}`);
  lines.push(`Overall Score: ${score.overall ?? 'N/A'}`);
  lines.push('');

  lines.push('Dimension Scores:');
  if (score.domainMaturity !== null) {
    lines.push(`  - Domain Maturity: ${score.domainMaturity}%`);
  }
  if (score.dataFoundational !== null) {
    lines.push(`  - Data Foundation: ${score.dataFoundational}%`);
  }
  if (score.acquisitionStability !== null) {
    lines.push(`  - Acquisition Stability: ${score.acquisitionStability}%`);
  }
  if (score.previewUsefulness !== null) {
    lines.push(`  - Preview Usefulness: ${score.previewUsefulness}%`);
  }
  if (score.previewStability !== null) {
    lines.push(`  - Preview Stability: ${score.previewStability}%`);
  }
  if (score.commercialReadiness !== null) {
    lines.push(`  - Commercial Readiness: ${score.commercialReadiness}%`);
  }
  if (score.governanceSafety !== null) {
    lines.push(`  - Governance Safety: ${score.governanceSafety}%`);
  }

  return lines.join('\n');
}

// =============================================================================
// Private Helper Functions
// =============================================================================

/**
 * Build blockers based on evidence and scores
 */
function buildPlatformBlockers(
  bundle: PlatformEvidenceBundle,
  score: PlatformProductionCandidateScore
): PlatformEnablementBlocker[] {
  const blockers: PlatformEnablementBlocker[] = [];
  const now = new Date();

  // Domain blockers
  if (score.domainMaturity !== null && score.domainMaturity < SCORE_THRESHOLDS.DOMAIN_MATURITY_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'domain_gap',
      blockerStatus: 'open',
      severity: 'high',
      title: 'Insufficient Domain Maturity',
      description: `Domain maturity score (${score.domainMaturity}%) is below threshold (${SCORE_THRESHOLDS.DOMAIN_MATURITY_MIN}%)`,
      category: 'Domain & Platform Knowledge',
      evidenceRef: { dimension: 'domain_maturity', score: score.domainMaturity },
      resolutionAction: 'Complete domain analysis and document platform specifics',
      estimatedResolutionDays: 14,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  // Data foundation blockers
  if (score.dataFoundational !== null && score.dataFoundational < SCORE_THRESHOLDS.DATA_FOUNDATIONAL_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'data_gap',
      blockerStatus: 'open',
      severity: 'critical',
      title: 'Insufficient Data Foundation',
      description: `Data foundation score (${score.dataFoundational}%) is below threshold (${SCORE_THRESHOLDS.DATA_FOUNDATIONAL_MIN}%)`,
      category: 'Data Foundation',
      evidenceRef: { dimension: 'data_foundational', score: score.dataFoundational },
      resolutionAction: 'Complete data models and ETLs for platform',
      estimatedResolutionDays: 30,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  // Acquisition blockers
  if (score.acquisitionStability !== null && score.acquisitionStability < SCORE_THRESHOLDS.ACQUISITION_STABILITY_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'acquisition_failure',
      blockerStatus: 'open',
      severity: 'critical',
      title: 'Acquisition Pipeline Not Stable',
      description: `Acquisition stability score (${score.acquisitionStability}%) is below threshold (${SCORE_THRESHOLDS.ACQUISITION_STABILITY_MIN}%)`,
      category: 'Acquisition & Runtime',
      evidenceRef: { dimension: 'acquisition_stability', score: score.acquisitionStability },
      resolutionAction: 'Stabilize acquisition pipeline and reduce error rates',
      estimatedResolutionDays: 21,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  // Governance blockers - critical
  if (score.governanceSafety !== null && score.governanceSafety < SCORE_THRESHOLDS.GOVERNANCE_SAFETY_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'governance_risk',
      blockerStatus: 'open',
      severity: 'critical',
      title: 'Governance Not Approved',
      description: `Governance safety score (${score.governanceSafety}%) is below threshold (${SCORE_THRESHOLDS.GOVERNANCE_SAFETY_MIN}%)`,
      category: 'Governance & Compliance',
      evidenceRef: { dimension: 'governance_safety', score: score.governanceSafety },
      resolutionAction: 'Complete governance review and obtain approvals',
      estimatedResolutionDays: 30,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  // Preview stability blockers
  if (score.previewStability !== null && score.previewStability < SCORE_THRESHOLDS.PREVIEW_STABILITY_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'preview_instability',
      blockerStatus: 'open',
      severity: 'high',
      title: 'Preview Not Stable',
      description: `Preview stability score (${score.previewStability}%) is below threshold (${SCORE_THRESHOLDS.PREVIEW_STABILITY_MIN}%)`,
      category: 'Preview & Beta',
      evidenceRef: { dimension: 'preview_stability', score: score.previewStability },
      resolutionAction: 'Improve preview stability before production',
      estimatedResolutionDays: 14,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  // Preview usefulness blockers
  if (score.previewUsefulness !== null && score.previewUsefulness < SCORE_THRESHOLDS.PREVIEW_USEFULNESS_MIN) {
    blockers.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      blockerType: 'resolution_failure',
      blockerStatus: 'open',
      severity: 'high',
      title: 'Preview Not Useful',
      description: `Preview usefulness score (${score.previewUsefulness}%) is below threshold (${SCORE_THRESHOLDS.PREVIEW_USEFULNESS_MIN}%)`,
      category: 'Preview & Beta',
      evidenceRef: { dimension: 'preview_usefulness', score: score.previewUsefulness },
      resolutionAction: 'Improve preview quality and usefulness',
      estimatedResolutionDays: 14,
      blockerPayload: {},
      createdAt: now,
      resolvedAt: null,
    });
  }

  return blockers;
}

/**
 * Build warnings based on evidence and scores
 */
function buildPlatformWarnings(
  bundle: PlatformEvidenceBundle,
  score: PlatformProductionCandidateScore
): PlatformEnablementWarning[] {
  const warnings: PlatformEnablementWarning[] = [];
  const now = new Date();

  // Domain warnings
  if (score.domainMaturity !== null && score.domainMaturity < 80 && score.domainMaturity >= SCORE_THRESHOLDS.DOMAIN_MATURITY_MIN) {
    warnings.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      warningType: 'domain_immaturity',
      severity: 'medium',
      title: 'Domain Knowledge Could Be Improved',
      description: `Domain maturity at ${score.domainMaturity}% - consider additional documentation`,
      category: 'Domain & Platform Knowledge',
      evidenceRef: { dimension: 'domain_maturity', score: score.domainMaturity },
      warningPayload: {},
      acknowledgedAt: null,
      createdAt: now,
    });
  }

  // Commercial warnings
  if (score.commercialReadiness !== null && score.commercialReadiness < SCORE_THRESHOLDS.COMMERCIAL_READINESS_MIN) {
    warnings.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      warningType: 'commercial_partial_readiness',
      severity: 'medium',
      title: 'Commercial Readiness Partial',
      description: `Commercial readiness at ${score.commercialReadiness}% - may need work before monetization`,
      category: 'Commercial & Monetization',
      evidenceRef: { dimension: 'commercial_readiness', score: score.commercialReadiness },
      warningPayload: {},
      acknowledgedAt: null,
      createdAt: now,
    });
  }

  // Operator warnings
  if (score.operatorReadiness !== null && score.operatorReadiness < SCORE_THRESHOLDS.OPERATOR_READINESS_MIN) {
    warnings.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      warningType: 'remediation_backlog',
      severity: 'medium',
      title: 'Operator Readiness Needs Work',
      description: `Operator readiness at ${score.operatorReadiness}% - ensure team is prepared`,
      category: 'Operations & Support',
      evidenceRef: { dimension: 'operator_readiness', score: score.operatorReadiness },
      warningPayload: {},
      acknowledgedAt: null,
      createdAt: now,
    });
  }

  // Remediation warnings
  if (score.remediationLoad !== null && score.remediationLoad < 60) {
    warnings.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      warningType: 'remediation_backlog',
      severity: 'high',
      title: 'High Remediation Load',
      description: `Remediation load score at ${score.remediationLoad}% - may impact production support`,
      category: 'Remediation & Technical Debt',
      evidenceRef: { dimension: 'remediation_load', score: score.remediationLoad },
      warningPayload: {},
      acknowledgedAt: null,
      createdAt: now,
    });
  }

  return warnings;
}

/**
 * Check if platform meets production candidate criteria
 */
export function meetsProductionCandidateCriteria(
  score: PlatformProductionCandidateScore
): {
  meets: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const criteria = DECISION_THRESHOLDS.PRODUCTION_CANDIDATE;

  if (score.overall === null || score.overall < criteria.MIN_OVERALL_SCORE) {
    failures.push(`Overall score (${score.overall ?? 'N/A'}) below ${criteria.MIN_OVERALL_SCORE}%`);
  }

  if (score.governanceSafety !== null && score.governanceSafety < criteria.MIN_GOVERNANCE_SCORE) {
    failures.push(`Governance score (${score.governanceSafety}%) below ${criteria.MIN_GOVERNANCE_SCORE}%`);
  }

  if (score.previewStability !== null && score.previewStability < criteria.MIN_PREVIEW_STABILITY) {
    failures.push(`Preview stability (${score.previewStability}%) below ${criteria.MIN_PREVIEW_STABILITY}%`);
  }

  if (score.previewUsefulness !== null && score.previewUsefulness < criteria.MIN_PREVIEW_USEFULNESS) {
    failures.push(`Preview usefulness (${score.previewUsefulness}%) below ${criteria.MIN_PREVIEW_USEFULNESS}%`);
  }

  return {
    meets: failures.length === 0,
    failures,
  };
}
