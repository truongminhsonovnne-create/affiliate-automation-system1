/**
 * Follow-up Planner
 *
 * Builds follow-up actions from governance decisions.
 */

import {
  ProductGovernanceDecision,
  ProductGovernanceDecisionType,
  ProductGovernanceFollowup,
  ProductGovernanceFollowupType,
  ReleaseBlockingIssue,
} from '../types';
import { FOLLOWUP_CONFIG } from '../constants';

export interface FollowupAction {
  type: ProductGovernanceFollowupType;
  targetEntityType: string;
  targetEntityId: string;
  payload: Record<string, unknown>;
  dueInDays: number;
}

/**
 * Build follow-up actions from a governance decision
 */
export function buildFollowupActionsFromGovernanceDecision(
  decision: ProductGovernanceDecision,
  blockingIssues: ReleaseBlockingIssue[]
): FollowupAction[] {
  const actions: FollowupAction[] = [];

  // Map decision type to follow-up types
  switch (decision.decisionType) {
    case ProductGovernanceDecisionType.RELEASE_BLOCKED:
      actions.push(...buildMitigationFollowup(decision, blockingIssues));
      break;

    case ProductGovernanceDecisionType.ROLLBACK_RECOMMENDED:
      actions.push(...buildRollbackReviewFollowup(decision));
      break;

    case ProductGovernanceDecisionType.RELEASE_CONDITIONALLY_APPROVED:
      actions.push(...buildConditionalApprovalFollowups(decision, blockingIssues));
      break;

    case ProductGovernanceDecisionType.QUALITY_REVIEW:
      actions.push(...buildQualityInvestigationFollowup(decision));
      break;

    default:
      // No automatic follow-ups for other decision types
      break;
  }

  return actions;
}

/**
 * Build mitigation follow-ups for blocked releases
 */
export function buildMitigationFollowup(
  decision: ProductGovernanceDecision,
  blockingIssues: ReleaseBlockingIssue[]
): FollowupAction[] {
  const actions: FollowupAction[] = [];

  // Create a general mitigation follow-up
  actions.push({
    type: ProductGovernanceFollowupType.MITIGATION,
    targetEntityType: 'release',
    targetEntityId: decision.targetEntityId || 'unknown',
    payload: {
      decisionId: decision.id,
      rationale: decision.rationale,
      blockingIssues: blockingIssues.map(i => i.id),
    },
    dueInDays: FOLLOWUP_CONFIG.DEFAULT_MITIGATION_DUE_DAYS,
  });

  // Create specific follow-ups for each blocking issue
  for (const issue of blockingIssues) {
    const followupType = determineFollowupType(issue.signalType);

    actions.push({
      type: followupType,
      targetEntityType: issue.targetEntityType,
      targetEntityId: issue.targetEntityId,
      payload: {
        issueId: issue.id,
        issueTitle: issue.title,
        severity: issue.severity,
        source: issue.signalSource,
      },
      dueInDays: getDueDaysForSeverity(issue.severity),
    });
  }

  return actions;
}

/**
 * Build rollback review follow-up
 */
export function buildRollbackReviewFollowup(
  decision: ProductGovernanceDecision
): FollowupAction[] {
  return [
    {
      type: ProductGovernanceFollowupType.ROLLBACK_REVIEW,
      targetEntityType: 'release',
      targetEntityId: decision.targetEntityId || 'unknown',
      payload: {
        decisionId: decision.id,
        rationale: decision.rationale,
        reason: (decision.payload as Record<string, unknown>)?.reason,
      },
      dueInDays: 1, // Immediate - within 24 hours
    },
  ];
}

/**
 * Build quality investigation follow-up
 */
export function buildQualityInvestigationFollowup(
  decision: ProductGovernanceDecision
): FollowupAction[] {
  return [
    {
      type: ProductGovernanceFollowupType.QUALITY_INVESTIGATION,
      targetEntityType: 'quality',
      targetEntityId: decision.targetEntityId || 'unknown',
      payload: {
        decisionId: decision.id,
        rationale: decision.rationale,
      },
      dueInDays: FOLLOWUP_CONFIG.DEFAULT_INVESTIGATION_DUE_DAYS,
    },
  ];
}

/**
 * Build follow-ups for conditional approval
 */
function buildConditionalApprovalFollowups(
  decision: ProductGovernanceDecision,
  blockingIssues: ReleaseBlockingIssue[]
): FollowupAction[] {
  const actions: FollowupAction[] = [];

  // Check if there are conditions to monitor
  const conditions = (decision.payload as Record<string, unknown>)?.conditions as string[] | undefined;

  if (conditions && conditions.length > 0) {
    actions.push({
      type: ProductGovernanceFollowupType.EXPERIMENT_MONITORING,
      targetEntityType: 'release',
      targetEntityId: decision.targetEntityId || 'unknown',
      payload: {
        decisionId: decision.id,
        conditions,
      },
      dueInDays: FOLLOWUP_CONFIG.DEFAULT_MONITORING_DUE_DAYS,
    });
  }

  // Add verification follow-up for any remaining issues
  if (blockingIssues.length > 0) {
    actions.push({
      type: ProductGovernanceFollowupType.REMEDIATION_VERIFICATION,
      targetEntityType: 'release',
      targetEntityId: decision.targetEntityId || 'unknown',
      payload: {
        decisionId: decision.id,
        issuesToVerify: blockingIssues.map(i => i.id),
      },
      dueInDays: FOLLOWUP_CONFIG.DEFAULT_VERIFICATION_DUE_DAYS,
    });
  }

  return actions;
}

// ============================================================================
// Helper Functions
// ============================================================================

function determineFollowupType(signalType: string): ProductGovernanceFollowupType {
  switch (signalType) {
    case 'experiment_guardrail':
      return ProductGovernanceFollowupType.EXPERIMENT_MONITORING;
    case 'tuning_change':
      return ProductGovernanceFollowupType.TUNING_ADJUSTMENT;
    case 'qa_regression':
    case 'staging_failure':
      return ProductGovernanceFollowupType.REMEDIATION_VERIFICATION;
    case 'operational_issue':
      return ProductGovernanceFollowupType.MITIGATION;
    default:
      return ProductGovernanceFollowupType.QUALITY_INVESTIGATION;
  }
}

function getDueDaysForSeverity(severity: string): number {
  switch (severity) {
    case 'critical':
      return 1;
    case 'high':
      return 3;
    case 'medium':
      return 7;
    default:
      return 14;
  }
}
