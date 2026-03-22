/**
 * Release Decision Service
 *
 * Records and manages release readiness decisions.
 */

import {
  ReleaseReadinessReview,
  ReleaseReadinessStatus,
  ProductGovernanceDecision,
  ProductGovernanceDecisionType,
  ProductGovernanceDecisionStatus,
  ReleaseDecisionPayload,
} from '../types';
import { validateReleaseReadinessDecision } from './releaseDecisionValidator';

export interface ReleaseDecisionInput {
  releaseKey: string;
  environment: string;
  decision: ProductGovernanceDecisionType;
  rationale?: string;
  conditions?: string[];
  mitigations?: string[];
  rollbackPlan?: string;
  alternativeStrategy?: string;
  actorId?: string;
  actorRole?: string;
}

export interface ReleaseDecisionResult {
  review: ReleaseReadinessReview;
  decision: ProductGovernanceDecision;
}

/**
 * Approve release readiness
 */
export async function approveReleaseReadiness(
  input: Omit<ReleaseDecisionInput, 'decision'>
): Promise<ReleaseDecisionResult> {
  const decisionInput: ReleaseDecisionInput = {
    ...input,
    decision: ProductGovernanceDecisionType.RELEASE_READY,
  };

  return recordReleaseDecision(decisionInput);
}

/**
 * Conditionally approve release readiness
 */
export async function conditionallyApproveReleaseReadiness(
  input: Omit<ReleaseDecisionInput, 'decision' | 'conditions'>
): Promise<ReleaseDecisionResult> {
  const decisionInput: ReleaseDecisionInput = {
    ...input,
    decision: ProductGovernanceDecisionType.RELEASE_CONDITIONALLY_APPROVED,
    conditions: input.conditions || [],
  };

  return recordReleaseDecision(decisionInput);
}

/**
 * Block release readiness
 */
export async function blockReleaseReadiness(
  input: Omit<ReleaseDecisionInput, 'decision'>
): Promise<ReleaseDecisionResult> {
  const decisionInput: ReleaseDecisionInput = {
    ...input,
    decision: ProductGovernanceDecisionType.RELEASE_BLOCKED,
  };

  if (!input.rationale) {
    throw new Error('Rationale is required when blocking a release');
  }

  return recordReleaseDecision(decisionInput);
}

/**
 * Defer release readiness decision
 */
export async function deferReleaseReadinessDecision(
  input: Omit<ReleaseDecisionInput, 'decision'>
): Promise<ReleaseDecisionResult> {
  const decisionInput: ReleaseDecisionInput = {
    ...input,
    decision: ProductGovernanceDecisionType.RELEASE_DEFERRED,
  };

  return recordReleaseDecision(decisionInput);
}

/**
 * Mark rollback as recommended
 */
export async function markRollbackRecommended(
  input: Omit<ReleaseDecisionInput, 'decision'>
): Promise<ReleaseDecisionResult> {
  const decisionInput: ReleaseDecisionInput = {
    ...input,
    decision: ProductGovernanceDecisionType.ROLLBACK_RECOMMENDED,
    rationale: input.rationale || 'Multiple critical issues require rollback consideration',
  };

  if (!input.rationale) {
    throw new Error('Rationale is required when recommending rollback');
  }

  return recordReleaseDecision(decisionInput);
}

/**
 * Record the release decision
 */
async function recordReleaseDecision(input: ReleaseDecisionInput): Promise<ReleaseDecisionResult> {
  // Validate the decision
  const validation = validateReleaseReadinessDecision(input);
  if (!validation.valid) {
    throw new Error(`Invalid decision: ${validation.errors.join(', ')}`);
  }

  // Get existing review or create new
  const review = await getOrCreateReleaseReview(input.releaseKey, input.environment);

  // Map decision to review status
  const newStatus = mapDecisionToStatus(input.decision);

  // Build decision payload
  const payload: ReleaseDecisionPayload = {
    decision: input.decision,
    conditions: input.conditions,
    mitigations: input.mitigations,
    rollbackPlan: input.rollbackPlan,
    alternativeStrategy: input.alternativeStrategy,
  };

  // Update review status
  const updatedReview = await updateReleaseReviewStatus(
    review.id,
    newStatus,
    payload,
    input.actorId
  );

  // Record governance decision
  const decision = await createGovernanceDecision({
    decisionType: input.decision,
    targetEntityType: 'release_readiness',
    targetEntityId: review.id,
    payload,
    rationale: input.rationale,
    actorId: input.actorId,
    actorRole: input.actorRole,
  });

  return {
    review: updatedReview,
    decision,
  };
}

function mapDecisionToStatus(decision: ProductGovernanceDecisionType): ReleaseReadinessStatus {
  switch (decision) {
    case ProductGovernanceDecisionType.RELEASE_READY:
      return ReleaseReadinessStatus.READY;
    case ProductGovernanceDecisionType.RELEASE_CONDITIONALLY_APPROVED:
      return ReleaseReadinessStatus.CONDITIONALLY_READY;
    case ProductGovernanceDecisionType.RELEASE_BLOCKED:
      return ReleaseReadinessStatus.BLOCKED;
    case ProductGovernanceDecisionType.RELEASE_DEFERRED:
      return ReleaseReadinessStatus.PENDING;
    case ProductGovernanceDecisionType.ROLLBACK_RECOMMENDED:
      return ReleaseReadinessStatus.ROLLBACK_RECOMMENDED;
    default:
      return ReleaseReadinessStatus.NEEDS_REVIEW;
  }
}

// ============================================================================
// Database Operations (simulated)
// ============================================================================

async function getOrCreateReleaseReview(
  releaseKey: string,
  environment: string
): Promise<ReleaseReadinessReview> {
  // In real implementation, query database
  return {
    id: crypto.randomUUID(),
    releaseKey,
    environment,
    status: ReleaseReadinessStatus.IN_PROGRESS,
    readinessScore: null,
    blockingIssuesCount: 0,
    warningIssuesCount: 0,
    summary: {
      signalsEvaluated: 0,
      signalsBySource: {},
      signalsBySeverity: {},
      topBlockingIssues: [],
      topWarningIssues: [],
      experimentStatus: {
        activeGuardrailBreaches: 0,
        unsafeTuningChanges: 0,
        experimentsNeedingReview: 0,
      },
      productOpsStatus: {
        openHighSeverityCases: 0,
        unresolvedRemediations: 0,
        staleCasesCount: 0,
      },
      operationalStatus: {
        errorRateAnomalies: 0,
        latencyDegradations: 0,
        rankingQualityIssues: 0,
      },
      qaStatus: {
        stagingFailures: 0,
        regressionIssues: 0,
        verificationGaps: 0,
      },
    },
    decisionPayload: null,
    reviewedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    finalizedAt: null,
  };
}

async function updateReleaseReviewStatus(
  reviewId: string,
  status: ReleaseReadinessStatus,
  payload: ReleaseDecisionPayload,
  actorId?: string
): Promise<ReleaseReadinessReview> {
  // In real implementation, update database
  return {
    id: reviewId,
    releaseKey: '',
    environment: '',
    status,
    readinessScore: status === ReleaseReadinessStatus.READY ? 85 : null,
    blockingIssuesCount: 0,
    warningIssuesCount: 0,
    summary: {
      signalsEvaluated: 0,
      signalsBySource: {},
      signalsBySeverity: {},
      topBlockingIssues: [],
      topWarningIssues: [],
      experimentStatus: {
        activeGuardrailBreaches: 0,
        unsafeTuningChanges: 0,
        experimentsNeedingReview: 0,
      },
      productOpsStatus: {
        openHighSeverityCases: 0,
        unresolvedRemediations: 0,
        staleCasesCount: 0,
      },
      operationalStatus: {
        errorRateAnomalies: 0,
        latencyDegradations: 0,
        rankingQualityIssues: 0,
      },
      qaStatus: {
        stagingFailures: 0,
        regressionIssues: 0,
        verificationGaps: 0,
      },
    },
    decisionPayload: payload,
    reviewedBy: actorId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    finalizedAt: status === ReleaseReadinessStatus.READY ? new Date() : null,
  };
}

async function createGovernanceDecision(input: {
  decisionType: ProductGovernanceDecisionType;
  targetEntityType: string;
  targetEntityId: string;
  payload: ReleaseDecisionPayload;
  rationale?: string;
  actorId?: string;
  actorRole?: string;
}): Promise<ProductGovernanceDecision> {
  // In real implementation, insert into database
  return {
    id: crypto.randomUUID(),
    decisionType: input.decisionType,
    decisionStatus: ProductGovernanceDecisionStatus.APPROVED,
    targetEntityType: input.targetEntityType,
    targetEntityId: input.targetEntityId,
    payload: input.payload as unknown as Record<string, unknown>,
    rationale: input.rationale || null,
    actorId: input.actorId || null,
    actorRole: input.actorRole || null,
    createdAt: new Date(),
  };
}
