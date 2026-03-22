/**
 * Product Governance Service
 *
 * Main orchestrator service for Product Quality Governance + Release Readiness.
 */

import {
  ProductGovernanceSignal,
  ReleaseReadinessReview,
  ReleaseReadinessStatus,
  ProductGovernanceDecision,
  ProductGovernanceReviewPack,
  ContinuousImprovementReport,
} from '../types';

import { evaluateReleaseReadiness } from '../readiness/releaseReadinessEvaluator';
import { buildReleaseReviewPack } from '../readiness/releaseReviewPackBuilder';
import { approveReleaseReadiness, blockReleaseReadiness, conditionallyApproveReleaseReadiness, deferReleaseReadinessDecision, markRollbackRecommended } from '../readiness/releaseDecisionService';

import { collectGovernanceSignalsFromProductOps } from '../integration/productOpsGovernanceIntegration';
import { collectExperimentGovernanceSignals } from '../integration/experimentationGovernanceIntegration';
import { collectQaGovernanceSignals, collectStagingVerificationSignals } from '../integration/qaGovernanceIntegration';
import { evaluateGovernanceGateForRelease } from '../integration/releaseWorkflowGovernanceIntegration';

import { buildFollowupActionsFromGovernanceDecision } from '../followups/followupPlanner';
import { createGovernanceFollowup } from '../followups/followupService';

import { buildContinuousImprovementReport } from '../continuousImprovement/continuousImprovementService';

export interface RunReleaseReadinessInput {
  releaseKey: string;
  environment: string;
}

export interface RunReleaseReadinessResult {
  review: ReleaseReadinessReview;
  reviewPack: ProductGovernanceReviewPack;
  signals: ProductGovernanceSignal[];
}

/**
 * Run a complete release readiness review
 */
export async function runReleaseReadinessReview(
  input: RunReleaseReadinessInput
): Promise<RunReleaseReadinessResult> {
  // Step 1: Collect signals from all sources
  const signals = await collectAllGovernanceSignals();

  // Step 2: Evaluate release readiness
  const evaluationResult = evaluateReleaseReadiness({
    releaseKey: input.releaseKey,
    environment: input.environment,
    signals,
  });

  // Step 3: Build review
  const review = await createOrUpdateReleaseReview(input, evaluationResult);

  // Step 4: Build review pack
  const reviewPack = buildReleaseReviewPack({
    releaseKey: input.releaseKey,
    environment: input.environment,
    status: evaluationResult.status,
    readinessScore: evaluationResult.score,
    blockingIssues: evaluationResult.blockingIssues,
    warningIssues: evaluationResult.warningIssues,
    summary: evaluationResult.summary,
  });

  return {
    review,
    reviewPack,
    signals,
  };
}

/**
 * Get release readiness detail
 */
export async function getReleaseReadinessDetail(
  releaseKey: string,
  environment: string
): Promise<{
  review: ReleaseReadinessReview | null;
  reviewPack: ProductGovernanceReviewPack | null;
}> {
  // Fetch existing review
  const review = await getReleaseReview(releaseKey, environment);

  if (!review) {
    return { review: null, reviewPack: null };
  }

  // Get signals for the review
  const signals = await collectAllGovernanceSignals();

  // Build review pack
  const reviewPack = buildReleaseReviewPack({
    releaseKey,
    environment,
    status: review.status,
    readinessScore: review.readinessScore,
    blockingIssues: [], // Would fetch from evaluation
    warningIssues: [],
    summary: review.summary,
  });

  return { review, reviewPack };
}

/**
 * Process release governance decision
 */
export async function processReleaseGovernanceDecision(
  releaseKey: string,
  environment: string,
  decision: 'approve' | 'conditional_approve' | 'block' | 'defer' | 'rollback_recommended',
  actorId: string,
  actorRole: string,
  rationale?: string
): Promise<{
  review: ReleaseReadinessReview;
  decision: ProductGovernanceDecision;
  followups: unknown[];
}> {
  // Get current review
  const { review } = await getReleaseReadinessDetail(releaseKey, environment);

  if (!review) {
    throw new Error(`No review found for release ${releaseKey}`);
  }

  // Process based on decision type
  let result: { review: ReleaseReadinessReview; decision: ProductGovernanceDecision };

  switch (decision) {
    case 'approve':
      result = await approveReleaseReadiness({
        releaseKey,
        environment,
        rationale,
        actorId,
        actorRole,
      });
      break;

    case 'conditional_approve':
      result = await conditionallyApproveReleaseReadiness({
        releaseKey,
        environment,
        rationale,
        actorId,
        actorRole,
      });
      break;

    case 'block':
      result = await blockReleaseReadiness({
        releaseKey,
        environment,
        rationale: rationale || 'Release blocked by governance',
        actorId,
        actorRole,
      });
      break;

    case 'defer':
      result = await deferReleaseReadinessDecision({
        releaseKey,
        environment,
        rationale,
        actorId,
        actorRole,
      });
      break;

    case 'rollback_recommended':
      result = await markRollbackRecommended({
        releaseKey,
        environment,
        rationale: rationale || 'Rollback recommended',
        actorId,
        actorRole,
      });
      break;

    default:
      throw new Error(`Unknown decision type: ${decision}`);
  }

  // Create follow-ups from decision
  const followups = await createFollowupsFromDecision(result.decision);

  return {
    review: result.review,
    decision: result.decision,
    followups,
  };
}

/**
 * Run continuous improvement cycle
 */
export async function runContinuousImprovementCycle(): Promise<ContinuousImprovementReport> {
  // Define period (last 30 days by default)
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  // Build report
  const report = await buildContinuousImprovementReport({
    periodStart,
    periodEnd,
  });

  return report;
}

/**
 * Build governance operational report
 */
export async function buildGovernanceOperationalReport(): Promise<{
  activeSignals: number;
  pendingReviews: number;
  openFollowups: number;
  overdueFollowups: number;
  recentDecisions: number;
}> {
  // Collect metrics from various sources
  const signals = await collectAllGovernanceSignals();
  const activeSignals = signals.filter(s => s.isActive).length;

  // Would query actual repositories for these
  const pendingReviews = 0;
  const openFollowups = 0;
  const overdueFollowups = 0;
  const recentDecisions = 0;

  return {
    activeSignals,
    pendingReviews,
    openFollowups,
    overdueFollowups,
    recentDecisions,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function collectAllGovernanceSignals(): Promise<ProductGovernanceSignal[]> {
  const allSignals: ProductGovernanceSignal[] = [];

  // Collect from Product Ops
  const productOpsSignals = await collectGovernanceSignalsFromProductOps();
  allSignals.push(...productOpsSignals);

  // Collect from experiments
  const experimentSignals = await collectExperimentGovernanceSignals();
  allSignals.push(...experimentSignals);

  // Collect from QA
  const qaSignals = await collectQaGovernanceSignals();
  allSignals.push(...qaSignals);

  // Collect from staging verification
  const stagingSignals = await collectStagingVerificationSignals();
  allSignals.push(...stagingSignals);

  return allSignals;
}

async function createOrUpdateReleaseReview(
  input: RunReleaseReadinessInput,
  evaluationResult: ReturnType<typeof evaluateReleaseReadiness>
): Promise<ReleaseReadinessReview> {
  // In real implementation, create or update in database
  return {
    id: crypto.randomUUID(),
    releaseKey: input.releaseKey,
    environment: input.environment,
    status: evaluationResult.status,
    readinessScore: evaluationResult.score,
    blockingIssuesCount: evaluationResult.blockingIssues.length,
    warningIssuesCount: evaluationResult.warningIssues.length,
    summary: evaluationResult.summary,
    decisionPayload: null,
    reviewedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    finalizedAt: null,
  };
}

async function getReleaseReview(
  releaseKey: string,
  environment: string
): Promise<ReleaseReadinessReview | null> {
  // In real implementation, query database
  return null;
}

async function createFollowupsFromDecision(decision: ProductGovernanceDecision): Promise<unknown[]> {
  const actions = buildFollowupActionsFromGovernanceDecision(decision, []);
  const followups = [];

  for (const action of actions) {
    const followup = await createGovernanceFollowup({
      sourceDecisionId: decision.id,
      followupType: action.type,
      targetEntityType: action.targetEntityType,
      targetEntityId: action.targetEntityId,
      payload: action.payload,
      dueAt: new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000),
    });
    followups.push(followup);
  }

  return followups;
}
