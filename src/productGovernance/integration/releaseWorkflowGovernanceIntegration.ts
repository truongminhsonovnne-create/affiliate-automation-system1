/**
 * Release Workflow Governance Integration
 *
 * Integrates governance layer with release pipelines/workflows.
 */

import {
  ProductGovernanceSignal,
  ReleaseReadinessStatus,
  ReleaseReadinessResult,
} from '../types';
import { evaluateReleaseReadiness } from '../readiness/releaseReadinessEvaluator';

export interface GovernanceGateResult {
  allowed: boolean;
  status: ReleaseReadinessStatus;
  score: number | null;
  blockingIssuesCount: number;
  warningIssuesCount: number;
  reason?: string;
  reviewPackId?: string;
}

export interface GovernanceGateSummary {
  releaseKey: string;
  environment: string;
  gateStatus: 'pass' | 'fail' | 'review_required';
  readinessScore: number | null;
  issuesSummary: string;
  requiresManualReview: boolean;
}

/**
 * Evaluate governance gate for a release
 */
export async function evaluateGovernanceGateForRelease(
  releaseKey: string,
  environment: string,
  signals: ProductGovernanceSignal[]
): Promise<GovernanceGateResult> {
  // Evaluate release readiness
  const result = await evaluateReleaseForGate(releaseKey, environment, signals);

  // Determine if gate passes
  const allowed = determineGatePass(result);

  return {
    allowed,
    status: result.status,
    score: result.score,
    blockingIssuesCount: result.blockingIssues.length,
    warningIssuesCount: result.warningIssues.length,
    reason: allowed ? undefined : getBlockReason(result),
  };
}

/**
 * Enforce governance gate before promotion
 */
export async function enforceGovernanceGateBeforePromotion(
  releaseKey: string,
  environment: string,
  signals: ProductGovernanceSignal[]
): Promise<GovernanceGateResult> {
  const gateResult = await evaluateGovernanceGateForRelease(releaseKey, environment, signals);

  if (!gateResult.allowed) {
    // Log governance gate failure
    console.log(`[Governance] Gate blocked for ${releaseKey} in ${environment}: ${gateResult.reason}`);

    // In real implementation, would throw error or return specific response
    // that stops the pipeline
  }

  return gateResult;
}

/**
 * Build governance release gate summary
 */
export function buildGovernanceReleaseGateSummary(
  releaseKey: string,
  environment: string,
  gateResult: GovernanceGateResult
): GovernanceGateSummary {
  const requiresManualReview =
    gateResult.status === ReleaseReadinessStatus.NEEDS_REVIEW ||
    gateResult.status === ReleaseReadinessStatus.CONDITIONALLY_READY;

  const issuesSummary = buildIssuesSummary(gateResult);

  let gateStatus: 'pass' | 'fail' | 'review_required';
  if (gateResult.allowed && !requiresManualReview) {
    gateStatus = 'pass';
  } else if (!gateResult.allowed) {
    gateStatus = 'fail';
  } else {
    gateStatus = 'review_required';
  }

  return {
    releaseKey,
    environment,
    gateStatus,
    readinessScore: gateResult.score,
    issuesSummary,
    requiresManualReview,
  };
}

/**
 * Check if governance gate should be bypassed (for emergency releases)
 */
export function canBypassGovernanceGate(
  userRole: string,
  reason: string
): boolean {
  // Only admin/ops roles can bypass
  const allowedRoles = ['admin', 'release_manager', 'platform_lead'];

  if (!allowedRoles.includes(userRole.toLowerCase())) {
    return false;
  }

  // Must provide reason for bypass
  if (!reason || reason.length < 20) {
    return false;
  }

  return true;
}

/**
 * Record governance gate bypass
 */
export async function recordGovernanceGateBypass(
  releaseKey: string,
  environment: string,
  actorId: string,
  reason: string
): Promise<void> {
  // In real implementation, log to audit trail
  console.log(`[Governance] Gate bypassed for ${releaseKey} by ${actorId}: ${reason}`);
}

// ============================================================================
// Helper Functions
// ============================================================================

async function evaluateReleaseForGate(
  releaseKey: string,
  environment: string,
  signals: ProductGovernanceSignal[]
): Promise<ReleaseReadinessResult> {
  // Use the evaluator
  return evaluateReleaseReadiness({
    releaseKey,
    environment,
    signals,
  });
}

function determineGatePass(result: ReleaseReadinessResult): boolean {
  // Gate passes if:
  // - Status is READY with no blocking issues
  // - Score is above threshold

  if (result.status === ReleaseReadinessStatus.READY && result.blockingIssues.length === 0) {
    return true;
  }

  // Check score threshold
  if (result.score !== null && result.score >= 80 && result.blockingIssues.length === 0) {
    return true;
  }

  return false;
}

function getBlockReason(result: ReleaseReadinessResult): string {
  if (result.blockingIssues.length > 0) {
    return `${result.blockingIssues.length} blocking issue(s) must be resolved`;
  }

  if (result.status === ReleaseReadinessStatus.ROLLBACK_RECOMMENDED) {
    return 'Rollback recommended due to multiple critical issues';
  }

  if (result.status === ReleaseReadinessStatus.BLOCKED) {
    return 'Release blocked by governance decision';
  }

  return 'Release does not meet governance criteria';
}

function buildIssuesSummary(gateResult: GovernanceGateResult): string {
  const parts: string[] = [];

  if (gateResult.blockingIssuesCount > 0) {
    parts.push(`${gateResult.blockingIssuesCount} blocking`);
  }

  if (gateResult.warningIssuesCount > 0) {
    parts.push(`${gateResult.warningIssuesCount} warning`);
  }

  if (parts.length === 0) {
    return 'No issues';
  }

  return parts.join(', ');
}
