/**
 * Release Decision Validator
 *
 * Validates release readiness decisions and state transitions.
 */

import {
  ReleaseReadinessStatus,
  ProductGovernanceDecisionType,
} from '../types';
import { DECISION_VALIDATION_CONFIG, READINESS_SCORE_CONFIG } from '../constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReleaseDecisionInput {
  releaseKey: string;
  environment: string;
  decision: ProductGovernanceDecisionType;
  rationale?: string;
  conditions?: string[];
  mitigations?: string[];
  rollbackPlan?: string;
  actorId?: string;
}

/**
 * Validate a release readiness decision
 */
export function validateReleaseReadinessDecision(input: ReleaseDecisionInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate decision type
  if (!input.decision) {
    errors.push('Decision type is required');
  }

  // Validate rationale for certain decisions
  if (DECISION_VALIDATION_CONFIG.RATIONALE_REQUIRED_FOR.includes(input.decision)) {
    if (!input.rationale || input.rationale.length < DECISION_VALIDATION_CONFIG.MIN_RATIONALE_LENGTH) {
      errors.push(
        `Rationale is required and must be at least ${DECISION_VALIDATION_CONFIG.MIN_RATIONALE_LENGTH} characters for ${input.decision}`
      );
    }
  }

  // Validate conditions for conditional approval
  if (
    input.decision === ProductGovernanceDecisionType.RELEASE_CONDITIONALLY_APPROVED &&
    (!input.conditions || input.conditions.length === 0)
  ) {
    warnings.push('Conditional approval should include specific conditions');
  }

  // Validate mitigations for blocked releases
  if (
    input.decision === ProductGovernanceDecisionType.RELEASE_BLOCKED &&
    (!input.mitigations || input.mitigations.length === 0)
  ) {
    warnings.push('Blocked release should include proposed mitigations');
  }

  // Validate rollback plan for rollback recommendation
  if (
    input.decision === ProductGovernanceDecisionType.ROLLBACK_RECOMMENDED &&
    !input.rollbackPlan
  ) {
    warnings.push('Rollback recommendation should include a rollback plan');
  }

  // Validate release key
  if (!input.releaseKey || input.releaseKey.trim().length === 0) {
    errors.push('Release key is required');
  }

  // Validate environment
  if (!input.environment || input.environment.trim().length === 0) {
    errors.push('Environment is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate state transition for release review
 */
export function validateReleaseReviewStateTransition(
  currentStatus: ReleaseReadinessStatus,
  newStatus: ReleaseReadinessStatus
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowedTransitions = DECISION_VALIDATION_CONFIG.ALLOWED_STATUS_TRANSITIONS;

  // Check if transition is allowed
  const allowed = allowedTransitions[currentStatus];
  if (!allowed) {
    errors.push(`No allowed transitions from status: ${currentStatus}`);
    return { valid: false, errors, warnings };
  }

  if (!allowed.includes(newStatus)) {
    errors.push(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(', ')}`
    );
  }

  // Add warnings for certain transitions
  if (newStatus === ReleaseReadinessStatus.BLOCKED) {
    warnings.push('Blocking a release requires follow-up mitigation actions');
  }

  if (newStatus === ReleaseReadinessStatus.ROLLBACK_RECOMMENDED) {
    warnings.push('Rollback recommendation requires immediate attention');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate mitigation requirements for conditional approval
 */
export function validateReleaseMitigationRequirements(
  conditions: string[],
  mitigations: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (conditions.length === 0) {
    warnings.push('No conditions specified for conditional approval');
  }

  if (mitigations.length === 0) {
    warnings.push('No mitigations specified - release may be at risk');
  }

  // Check if conditions are addressed by mitigations
  // This is a simple check - in reality, would use more sophisticated matching
  if (conditions.length > mitigations.length) {
    warnings.push('Some conditions may not have corresponding mitigations');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate readiness score threshold
 */
export function validateReadinessScoreThreshold(
  score: number,
  thresholdType: 'approve' | 'conditional' | 'block'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (thresholdType) {
    case 'approve':
      if (score < READINESS_SCORE_CONFIG.GOOD_THRESHOLD) {
        warnings.push(
          `Score ${score} is below approval threshold ${READINESS_SCORE_CONFIG.GOOD_THRESHOLD}`
        );
      }
      break;
    case 'conditional':
      if (score < READINESS_SCORE_CONFIG.ACCEPTABLE_THRESHOLD) {
        errors.push(
          `Score ${score} is below conditional approval threshold ${READINESS_SCORE_CONFIG.ACCEPTABLE_THRESHOLD}`
        );
      }
      break;
    case 'block':
      if (score < READINESS_SCORE_CONFIG.POOR_THRESHOLD) {
        warnings.push(
          `Score ${score} is very low - consider blocking release`
        );
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
