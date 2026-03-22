/**
 * Condition Builder
 *
 * Builds conditions for conditional approvals.
 */

import type {
  PlatformEnablementCondition,
  PlatformEnablementConditionSeverity,
  PlatformEnablementConditionType,
  PlatformProductionCandidateScore,
  PlatformEvidenceBundle,
} from '../types/index.js';
import { CONDITION_SEVERITY_THRESHOLDS, SCORE_THRESHOLDS } from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Build enablement conditions based on evidence
 */
export function buildEnablementConditions(
  bundle: PlatformEvidenceBundle,
  score: PlatformProductionCandidateScore
): PlatformEnablementCondition[] {
  const conditions: PlatformEnablementCondition[] = [];
  const now = new Date();

  // Domain conditions
  if (score.domainMaturity !== null && score.domainMaturity < 85) {
    conditions.push(createCondition(
      'domain_maturity',
      'Complete Domain Documentation',
      `Domain maturity at ${score.domainMaturity}% - complete documentation to reach 85%`,
      'medium',
      'Domain & Platform Knowledge',
      { dimension: 'domain_maturity', targetScore: 85, currentScore: score.domainMaturity }
    ));
  }

  // Data foundation conditions
  if (score.dataFoundational !== null && score.dataFoundational < 80) {
    conditions.push(createCondition(
      'data_quality',
      'Complete Data Foundation Work',
      `Data foundation at ${score.dataFoundational}% - complete to reach 80%`,
      'high',
      'Data Foundation',
      { dimension: 'data_foundational', targetScore: 80, currentScore: score.dataFoundational }
    ));
  }

  // Acquisition conditions
  if (score.acquisitionStability !== null && score.acquisitionStability < 75) {
    conditions.push(createCondition(
      'acquisition_stability',
      'Stabilize Acquisition Pipeline',
      `Acquisition at ${score.acquisitionStability}% - stabilize to reach 75%`,
      'high',
      'Acquisition & Runtime',
      { dimension: 'acquisition_stability', targetScore: 75, currentScore: score.acquisitionStability }
    ));
  }

  // Preview conditions
  if (score.previewStability !== null && score.previewStability < 70) {
    conditions.push(createCondition(
      'preview_quality',
      'Improve Preview Stability',
      `Preview stability at ${score.previewStability}% - improve to reach 70%`,
      'medium',
      'Preview & Beta',
      { dimension: 'preview_stability', targetScore: 70, currentScore: score.previewStability }
    ));
  }

  if (score.previewUsefulness !== null && score.previewUsefulness < 70) {
    conditions.push(createCondition(
      'preview_quality',
      'Improve Preview Usefulness',
      `Preview usefulness at ${score.previewUsefulness}% - improve to reach 70%`,
      'medium',
      'Preview & Beta',
      { dimension: 'preview_usefulness', targetScore: 70, currentScore: score.previewUsefulness }
    ));
  }

  // Commercial conditions
  if (score.commercialReadiness !== null && score.commercialReadiness < 75) {
    conditions.push(createCondition(
      'commercial_readiness',
      'Complete Commercial Readiness Work',
      `Commercial readiness at ${score.commercialReadiness}% - complete to reach 75%`,
      'medium',
      'Commercial & Monetization',
      { dimension: 'commercial_readiness', targetScore: 75, currentScore: score.commercialReadiness }
    ));
  }

  // Governance conditions
  if (score.governanceSafety !== null && score.governanceSafety < 95) {
    conditions.push(createCondition(
      'governance_safety',
      'Complete Governance Approval',
      `Governance safety at ${score.governanceSafety}% - complete approval to reach 95%`,
      'high',
      'Governance & Compliance',
      { dimension: 'governance_safety', targetScore: 95, currentScore: score.governanceSafety }
    ));
  }

  // Operator conditions
  if (score.operatorReadiness !== null && score.operatorReadiness < 70) {
    conditions.push(createCondition(
      'operator_readiness',
      'Complete Operator Onboarding',
      `Operator readiness at ${score.operatorReadiness}% - complete onboarding to reach 70%`,
      'medium',
      'Operations & Support',
      { dimension: 'operator_readiness', targetScore: 70, currentScore: score.operatorReadiness }
    ));
  }

  logger.info({
    msg: 'Enablement conditions built',
    platformKey: bundle.platformKey,
    count: conditions.length,
  });

  return conditions;
}

/**
 * Build conditions for proceed cautiously decision
 */
export function buildProceedCautiouslyConditions(
  bundle: PlatformEvidenceBundle,
  score: PlatformProductionCandidateScore
): PlatformEnablementCondition[] {
  const conditions: PlatformEnablementCondition[] = [];
  const now = new Date();

  // Required conditions for proceed cautiously
  conditions.push({
    id: crypto.randomUUID(),
    reviewId: null,
    decisionId: null,
    conditionType: 'governance_safety',
    conditionStatus: 'pending',
    severity: 'high',
    title: 'Obtain Explicit Governance Approval',
    description: 'Must have explicit governance approval before proceeding',
    category: 'Governance & Compliance',
    evidenceRef: { type: 'governance_approval_required' },
    remediationAction: 'Submit platform for governance review and obtain approval',
    estimatedResolutionDays: 14,
    assignedTo: null,
    conditionPayload: { required: true },
    createdAt: now,
    satisfiedAt: null,
    expiredAt: null,
  });

  conditions.push({
    id: crypto.randomUUID(),
    reviewId: null,
    decisionId: null,
    conditionType: 'preview_quality',
    conditionStatus: 'pending',
    severity: 'high',
    title: 'Enable Enhanced Monitoring',
    description: 'Must have enhanced monitoring and alerting in place',
    category: 'Preview & Beta',
    evidenceRef: { type: 'monitoring_required' },
    remediationAction: 'Configure monitoring dashboards and alerting',
    estimatedResolutionDays: 7,
    assignedTo: null,
    conditionPayload: { required: true },
    createdAt: now,
    satisfiedAt: null,
    expiredAt: null,
  });

  // Add dimension-specific conditions
  if (score.previewStability !== null && score.previewStability < 65) {
    conditions.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      conditionType: 'preview_quality',
      conditionStatus: 'pending',
      severity: 'medium',
      title: 'Improve Preview Stability Before Scale',
      description: `Preview stability at ${score.previewStability}% - must improve before scaling`,
      category: 'Preview & Beta',
      evidenceRef: { dimension: 'preview_stability', score: score.previewStability },
      remediationAction: 'Address stability issues in preview',
      estimatedResolutionDays: 14,
      assignedTo: null,
      conditionPayload: { targetScore: 65 },
      createdAt: now,
      satisfiedAt: null,
      expiredAt: null,
    });
  }

  if (score.commercialReadiness !== null && score.commercialReadiness < 65) {
    conditions.push({
      id: crypto.randomUUID(),
      reviewId: null,
      decisionId: null,
      conditionType: 'commercial_readiness',
      conditionStatus: 'pending',
      severity: 'medium',
      title: 'Limit Monetization Scope',
      description: `Commercial readiness at ${score.commercialReadiness}% - limit initial monetization scope`,
      category: 'Commercial & Monetization',
      evidenceRef: { dimension: 'commercial_readiness', score: score.commercialReadiness },
      remediationAction: 'Define limited monetization scope for cautious rollout',
      estimatedResolutionDays: 7,
      assignedTo: null,
      conditionPayload: { limitedScope: true },
      createdAt: now,
      satisfiedAt: null,
      expiredAt: null,
    });
  }

  return conditions;
}

/**
 * Build candidate conditions summary
 */
export function buildCandidateConditionsSummary(
  conditions: PlatformEnablementCondition[]
): {
  total: number;
  bySeverity: Record<PlatformEnablementConditionSeverity, number>;
  byType: Record<PlatformEnablementConditionType, number>;
  byCategory: Record<string, number>;
  pending: PlatformEnablementCondition[];
  mustSatisfy: PlatformEnablementCondition[];
} {
  const bySeverity: Record<PlatformEnablementConditionSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byType: Record<PlatformEnablementConditionType, number> = {} as Record<PlatformEnablementConditionType, number>;
  const byCategory: Record<string, number> = {};

  for (const condition of conditions) {
    bySeverity[condition.severity]++;
    byType[condition.conditionType] = (byType[condition.conditionType] || 0) + 1;
    byCategory[condition.category] = (byCategory[condition.category] || 0) + 1;
  }

  const pending = conditions.filter(c => c.conditionStatus === 'pending');
  const mustSatisfy = conditions.filter(c =>
    c.severity === 'critical' || c.severity === 'high'
  );

  return {
    total: conditions.length,
    bySeverity,
    byType,
    byCategory,
    pending,
    mustSatisfy,
  };
}

/**
 * Check if all required conditions are satisfied
 */
export function checkConditionsSatisfied(
  conditions: PlatformEnablementCondition[]
): {
  allSatisfied: boolean;
  unsatisfiedRequired: PlatformEnablementCondition[];
} {
  const requiredConditions = conditions.filter(c =>
    c.conditionPayload && (c.conditionPayload as Record<string, unknown>).required === true
  );

  const unsatisfiedRequired = requiredConditions.filter(c =>
    c.conditionStatus !== 'satisfied'
  );

  return {
    allSatisfied: unsatisfiedRequired.length === 0,
    unsatisfiedRequired,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createCondition(
  type: PlatformEnablementConditionType,
  title: string,
  description: string,
  severity: PlatformEnablementConditionSeverity,
  category: string,
  evidence: Record<string, unknown>
): PlatformEnablementCondition {
  return {
    id: crypto.randomUUID(),
    reviewId: null,
    decisionId: null,
    conditionType: type,
    conditionStatus: 'pending',
    severity,
    title,
    description,
    category,
    evidenceRef: evidence,
    remediationAction: getRemediationAction(type),
    estimatedResolutionDays: getEstimatedDays(type, severity),
    assignedTo: null,
    conditionPayload: evidence,
    createdAt: new Date(),
    satisfiedAt: null,
    expiredAt: null,
  };
}

function getRemediationAction(type: PlatformEnablementConditionType): string {
  const actions: Record<PlatformEnablementConditionType, string> = {
    domain_maturity: 'Complete domain documentation and knowledge transfer',
    data_quality: 'Complete data quality improvements',
    acquisition_stability: 'Stabilize acquisition pipeline',
    resolution_quality: 'Improve resolution quality',
    preview_quality: 'Complete preview quality improvements',
    commercial_readiness: 'Complete commercial readiness work',
    governance_safety: 'Obtain governance approval',
    remediation_load: 'Address remediation backlog',
    operator_readiness: 'Complete operator onboarding',
  };
  return actions[type] || 'Complete required work';
}

function getEstimatedDays(type: PlatformEnablementConditionType, severity: PlatformEnablementConditionSeverity): number {
  const baseDays: Record<PlatformEnablementConditionType, number> = {
    domain_maturity: 14,
    data_quality: 21,
    acquisition_stability: 14,
    resolution_quality: 14,
    preview_quality: 14,
    commercial_readiness: 21,
    governance_safety: 21,
    remediation_load: 21,
    operator_readiness: 14,
  };

  const thresholds = CONDITION_SEVERITY_THRESHOLDS[severity];
  return thresholds.EXPIRY_DAYS;
}
