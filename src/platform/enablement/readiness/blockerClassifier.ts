/**
 * Blocker Classifier
 *
 * Classifies and detects blockers for platform enablement.
 */

import type {
  PlatformEnablementBlocker,
  PlatformEnablementBlockerSeverity,
  PlatformEnablementBlockerType,
  PlatformProductionCandidateScore,
  PlatformEvidenceBundle,
} from '../types/index.js';
import { SCORE_THRESHOLDS, CONDITION_SEVERITY_THRESHOLDS } from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Classify platform enablement blockers
 */
export function classifyPlatformEnablementBlockers(
  bundle: PlatformEvidenceBundle,
  score: PlatformProductionCandidateScore
): PlatformEnablementBlocker[] {
  const blockers: PlatformEnablementBlocker[] = [];
  const now = new Date();

  // Domain blockers
  if (score.domainMaturity !== null && score.domainMaturity < 50) {
    blockers.push(createBlocker(
      'domain_gap',
      'Critical Domain Gap',
      `Domain maturity at ${score.domainMaturity}% - platform not well understood`,
      'critical',
      'Domain & Platform Knowledge',
      { dimension: 'domain_maturity', score: score.domainMaturity }
    ));
  } else if (score.domainMaturity !== null && score.domainMaturity < SCORE_THRESHOLDS.DOMAIN_MATURITY_MIN) {
    blockers.push(createBlocker(
      'domain_gap',
      'Domain Maturity Below Threshold',
      `Domain maturity at ${score.domainMaturity}% - below ${SCORE_THRESHOLDS.DOMAIN_MATURITY_MIN}%`,
      'high',
      'Domain & Platform Knowledge',
      { dimension: 'domain_maturity', score: score.domainMaturity }
    ));
  }

  // Data foundation blockers
  if (score.dataFoundational !== null && score.dataFoundational < 40) {
    blockers.push(createBlocker(
      'data_gap',
      'Critical Data Foundation Gap',
      `Data foundation at ${score.dataFoundational}% - data models not ready`,
      'critical',
      'Data Foundation',
      { dimension: 'data_foundational', score: score.dataFoundational }
    ));
  } else if (score.dataFoundational !== null && score.dataFoundational < SCORE_THRESHOLDS.DATA_FOUNDATIONAL_MIN) {
    blockers.push(createBlocker(
      'data_gap',
      'Data Foundation Below Threshold',
      `Data foundation at ${score.dataFoundational}% - below ${SCORE_THRESHOLDS.DATA_FOUNDATIONAL_MIN}%`,
      'high',
      'Data Foundation',
      { dimension: 'data_foundational', score: score.dataFoundational }
    ));
  }

  // Acquisition blockers
  if (score.acquisitionStability !== null && score.acquisitionStability < 40) {
    blockers.push(createBlocker(
      'acquisition_failure',
      'Critical Acquisition Failure',
      `Acquisition stability at ${score.acquisitionStability}% - pipeline unstable`,
      'critical',
      'Acquisition & Runtime',
      { dimension: 'acquisition_stability', score: score.acquisitionStability }
    ));
  } else if (score.acquisitionStability !== null && score.acquisitionStability < SCORE_THRESHOLDS.ACQUISITION_STABILITY_MIN) {
    blockers.push(createBlocker(
      'acquisition_failure',
      'Acquisition Below Threshold',
      `Acquisition stability at ${score.acquisitionStability}% - below ${SCORE_THRESHOLDS.ACQUISITION_STABILITY_MIN}%`,
      'high',
      'Acquisition & Runtime',
      { dimension: 'acquisition_stability', score: score.acquisitionStability }
    ));
  }

  // Governance blockers - always critical if not approved
  if (score.governanceSafety !== null && score.governanceSafety < SCORE_THRESHOLDS.GOVERNANCE_SAFETY_MIN) {
    blockers.push(createBlocker(
      'governance_risk',
      'Governance Not Approved',
      `Governance safety at ${score.governanceSafety}% - below ${SCORE_THRESHOLDS.GOVERNANCE_SAFETY_MIN}% threshold`,
      'critical',
      'Governance & Compliance',
      { dimension: 'governance_safety', score: score.governanceSafety }
    ));
  }

  // Preview stability blockers
  if (score.previewStability !== null && score.previewStability < 40) {
    blockers.push(createBlocker(
      'preview_instability',
      'Critical Preview Instability',
      `Preview stability at ${score.previewStability}% - too unstable for production`,
      'critical',
      'Preview & Beta',
      { dimension: 'preview_stability', score: score.previewStability }
    ));
  }

  // Preview usefulness blockers
  if (score.previewUsefulness !== null && score.previewUsefulness < 40) {
    blockers.push(createBlocker(
      'resolution_failure',
      'Critical Resolution Quality Issues',
      `Preview usefulness at ${score.previewUsefulness}% - not useful for users`,
      'critical',
      'Preview & Beta',
      { dimension: 'preview_usefulness', score: score.previewUsefulness }
    ));
  }

  // Commercial blockers
  if (score.commercialReadiness !== null && score.commercialReadiness < 40) {
    blockers.push(createBlocker(
      'commercial_incomplete',
      'Commercial Not Ready',
      `Commercial readiness at ${score.commercialReadiness}% - monetization not ready`,
      'critical',
      'Commercial & Monetization',
      { dimension: 'commercial_readiness', score: score.commercialReadiness }
    ));
  }

  // Operator blockers
  if (score.operatorReadiness !== null && score.operatorReadiness < 40) {
    blockers.push(createBlocker(
      'operator_unready',
      'Operator Team Not Ready',
      `Operator readiness at ${score.operatorReadiness}% - team not prepared`,
      'high',
      'Operations & Support',
      { dimension: 'operator_readiness', score: score.operatorReadiness }
    ));
  }

  // Remediation blockers
  if (score.remediationLoad !== null && score.remediationLoad < 30) {
    blockers.push(createBlocker(
      'remediation_overload',
      'Critical Remediation Overload',
      `Remediation load at ${score.remediationLoad}% - too many open issues`,
      'high',
      'Remediation & Technical Debt',
      { dimension: 'remediation_load', score: score.remediationLoad }
    ));
  }

  logger.info({
    msg: 'Blockers classified',
    platformKey: bundle.platformKey,
    count: blockers.length,
    critical: blockers.filter(b => b.severity === 'critical').length,
    high: blockers.filter(b => b.severity === 'high').length,
  });

  return blockers;
}

/**
 * Detect critical enablement blockers
 */
export function detectCriticalEnablementBlockers(
  blockers: PlatformEnablementBlocker[]
): PlatformEnablementBlocker[] {
  return blockers.filter(b => b.severity === 'critical');
}

/**
 * Build platform blocker summary
 */
export function buildPlatformBlockerSummary(
  blockers: PlatformEnablementBlocker[]
): {
  total: number;
  bySeverity: Record<PlatformEnablementBlockerSeverity, number>;
  byType: Record<PlatformEnablementBlockerType, number>;
  byCategory: Record<string, number>;
  critical: PlatformEnablementBlocker[];
  mustResolve: PlatformEnablementBlocker[];
} {
  const bySeverity: Record<PlatformEnablementBlockerSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Record<PlatformEnablementBlockerType, number> = {} as Record<PlatformEnablementBlockerType, number>;
  const byCategory: Record<string, number> = {};

  for (const blocker of blockers) {
    bySeverity[blocker.severity]++;
    byType[blocker.blockerType] = (byType[blocker.blockerType] || 0) + 1;
    byCategory[blocker.category] = (byCategory[blocker.category] || 0) + 1;
  }

  const critical = blockers.filter(b => b.severity === 'critical');
  const mustResolve = blockers.filter(b =>
    b.severity === 'critical' || b.severity === 'high'
  );

  return {
    total: blockers.length,
    bySeverity,
    byType,
    byCategory,
    critical,
    mustResolve,
  };
}

/**
 * Check if blockers prevent production
 */
export function blockersPreventProduction(blockers: PlatformEnablementBlocker[]): {
  preventsProduction: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  const criticalCount = blockers.filter(b => b.severity === 'critical').length;
  const highCount = blockers.filter(b => b.severity === 'high').length;

  if (criticalCount > SCORE_THRESHOLDS.MAX_CRITICAL_BLOCKERS) {
    reasons.push(`${criticalCount} critical blockers exceed maximum (${SCORE_THRESHOLDS.MAX_CRITICAL_BLOCKERS})`);
  }

  if (highCount > SCORE_THRESHOLDS.MAX_HIGH_BLOCKERS) {
    reasons.push(`${highCount} high-severity blockers exceed maximum (${SCORE_THRESHOLDS.MAX_HIGH_BLOCKERS})`);
  }

  const hasGovernanceBlocker = blockers.some(b => b.blockerType === 'governance_risk');
  if (hasGovernanceBlocker) {
    reasons.push('Governance blocker present - production not approved');
  }

  const hasDataBlocker = blockers.some(b => b.blockerType === 'data_gap');
  if (hasDataBlocker) {
    reasons.push('Data foundation blocker present');
  }

  return {
    preventsProduction: reasons.length > 0,
    reasons,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createBlocker(
  type: PlatformEnablementBlockerType,
  title: string,
  description: string,
  severity: PlatformEnablementBlockerSeverity,
  category: string,
  evidence: Record<string, unknown>
): PlatformEnablementBlocker {
  return {
    id: crypto.randomUUID(),
    reviewId: null,
    decisionId: null,
    blockerType: type,
    blockerStatus: 'open',
    severity,
    title,
    description,
    category,
    evidenceRef: evidence,
    resolutionAction: getResolutionAction(type),
    estimatedResolutionDays: getEstimatedDays(type, severity),
    blockerPayload: {},
    createdAt: new Date(),
    resolvedAt: null,
  };
}

function getResolutionAction(type: PlatformEnablementBlockerType): string {
  const actions: Record<PlatformEnablementBlockerType, string> = {
    domain_gap: 'Complete domain analysis and documentation',
    data_gap: 'Build and validate data models',
    acquisition_failure: 'Stabilize acquisition pipeline',
    resolution_failure: 'Improve resolution quality',
    preview_instability: 'Stabilize preview system',
    commercial_incomplete: 'Complete commercial readiness work',
    governance_risk: 'Obtain governance approval',
    remediation_overload: 'Address remediation backlog',
    operator_unready: 'Complete operator onboarding',
  };
  return actions[type] || 'Resolve issue';
}

function getEstimatedDays(type: PlatformEnablementBlockerType, severity: PlatformEnablementBlockerSeverity): number {
  const baseDays: Record<PlatformEnablementBlockerType, number> = {
    domain_gap: 14,
    data_gap: 30,
    acquisition_failure: 21,
    resolution_failure: 14,
    preview_instability: 14,
    commercial_incomplete: 21,
    governance_risk: 30,
    remediation_overload: 21,
    operator_unready: 14,
  };

  const multiplier = severity === 'critical' ? 0.7 : severity === 'high' ? 1.0 : 1.5;
  return Math.ceil((baseDays[type] || 14) * multiplier);
}
