/**
 * Launch Closure Service - Main Orchestrator
 */

import type {
  LaunchClosureReport,
  LaunchChecklistItem,
  LaunchRiskRecord,
  LaunchSignoffRecord,
  LaunchWatchPlan,
  LaunchGoNoGoDecision,
} from '../types.js';

import { DEFAULT_WATCH_WINDOW_HOURS } from '../constants.js';

// Repositories
import * as reviewRepo from '../repositories/launchReadinessReviewRepository.js';
import * as riskRepo from '../repositories/launchRiskRepository.js';
import * as signoffRepo from '../repositories/launchSignoffRepository.js';
import * as watchPlanRepo from '../repositories/launchWatchPlanRepository.js';
import * as auditRepo from '../repositories/launchClosureAuditRepository.js';

// Domain services
import { buildLaunchHardeningChecklist } from '../checklists/launchChecklistBuilder.js';
import { evaluateLaunchChecklist } from '../checklists/checklistEvaluator.js';
import { collectLaunchRisks } from '../risks/launchRiskCollector.js';
import { classifyLaunchRisks } from '../risks/launchRiskClassifier.js';
import { evaluateLaunchReadiness } from '../readiness/launchReadinessEvaluator.js';
import { buildGoNoGoDecision } from '../readiness/goNoGoDecisionService.js';
import { buildLaunchWatchPlan } from '../watch/launchWatchPlanBuilder.js';
import { buildLaunchClosureReport, buildLaunchReadinessPack } from '../closure/launchClosureReportBuilder.js';
import { buildPostLaunchReviewPack } from '../closure/postLaunchReviewBuilder.js';

export interface LaunchClosureInput {
  launchKey: string;
  createdBy?: string;
  checklistItems?: LaunchChecklistItem[];
  risks?: LaunchRiskRecord[];
  signoffs?: LaunchSignoffRecord[];
  watchWindowHours?: number;
  includeGovernance?: boolean;
  includeCommercial?: boolean;
  includeMultiPlatform?: boolean;
}

/**
 * Run full launch readiness closure
 */
export async function runLaunchReadinessClosure(
  input: LaunchClosureInput
): Promise<{
  review: ReturnType<typeof reviewRepo.getLaunchReadinessReviewById> extends Promise<infer R> ? R : never;
  closureReport: LaunchClosureReport;
  watchPlan: LaunchWatchPlan;
}> {
  const { launchKey, createdBy, watchWindowHours } = input;

  // Step 1: Create review
  const review = await reviewRepo.createLaunchReadinessReview({
    launchKey,
    reviewPayload: {},
    createdBy,
  });

  // Step 2: Build/checklist
  let checklistItems = input.checklistItems;
  if (!checklistItems) {
    checklistItems = await buildLaunchHardeningChecklist({});
  }

  // Step 3: Collect risks
  let risks = input.risks;
  if (!risks) {
    risks = await collectLaunchRisks({});
  }

  // Step 4: Evaluate checklist
  const checklistEvaluation = await evaluateLaunchChecklist({ items: checklistItems });

  // Step 5: Classify risks
  const riskClassification = await classifyLaunchRisks(risks);

  // Step 6: Build signoffs
  let signoffs = input.signoffs;
  if (!signoffs) {
    signoffs = [];
  }

  // Step 7: Evaluate readiness
  const readiness = await evaluateLaunchReadiness({
    checklistItems,
    risks,
    signoffs,
  });

  // Step 8: Build go/no-go decision
  const goNoGoDecision = await buildGoNoGoDecision({
    readinessStatus: readiness.readinessStatus,
    readinessScore: readiness.readinessScore,
    blockers: riskClassification.blockers,
    warnings: riskClassification.warnings,
    signoffs,
    decidedBy: createdBy,
  });

  // Step 9: Update review
  await reviewRepo.updateLaunchReadinessReview(review.id, {
    reviewStatus: 'completed',
    readinessStatus: readiness.readinessStatus,
    readinessScore: readiness.readinessScore,
    blockerCount: readiness.blockerCount,
    warningCount: readiness.warningCount,
  });

  // Step 10: Build watch plan
  const watchPlan = await buildLaunchWatchPlan({
    launchReviewId: review.id,
    watchWindowHours: watchWindowHours ?? DEFAULT_WATCH_WINDOW_HOURS,
  });

  // Step 11: Build closure report
  const closureReport = await buildLaunchClosureReport({
    launchKey,
    goNoGoDecision,
    checklistSummary: checklistEvaluation.summary,
    riskSummary: riskClassification.summary,
    signoffSummary: { totalRequired: 0, totalApproved: 0, totalRejected: 0, totalPending: 0, totalConditional: 0, missingSignoffs: [] },
    watchPlan,
  });

  // Step 12: Audit
  await auditRepo.createAuditEntry({
    entityType: 'launch_readiness_review',
    entityId: review.id,
    auditAction: 'review_completed',
    actorId: createdBy,
    rationale: `Launch readiness closure completed. Decision: ${goNoGoDecision.decision}`,
  });

  return {
    review,
    closureReport,
    watchPlan,
  };
}

/**
 * Build launch closure decision support
 */
export async function buildLaunchClosureDecisionSupport(
  input: LaunchClosureInput
): Promise<{
  readiness: ReturnType<typeof evaluateLaunchReadiness> extends Promise<infer R> ? R : never;
  goNoGo: LaunchGoNoGoDecision;
  riskClassification: ReturnType<typeof classifyLaunchRisks> extends Promise<infer R> ? R : never;
}> {
  const checklistItems = input.checklistItems ?? await buildLaunchHardeningChecklist({});
  const risks = input.risks ?? await collectLaunchRisks({});
  const signoffs = input.signoffs ?? [];

  const readiness = await evaluateLaunchReadiness({ checklistItems, risks, signoffs });
  const riskClassification = await classifyLaunchRisks(risks);
  const goNoGo = await buildGoNoGoDecision({
    readinessStatus: readiness.readinessStatus,
    readinessScore: readiness.readinessScore,
    blockers: riskClassification.blockers,
    warnings: riskClassification.warnings,
    signoffs,
    decidedBy: input.createdBy,
  });

  return { readiness, goNoGo, riskClassification };
}

/**
 * Build launch closure report pack
 */
export async function buildLaunchClosureReportPack(
  input: LaunchClosureInput
): Promise<LaunchClosureReport> {
  const { closureReport } = await runLaunchReadinessClosure(input);
  return closureReport;
}

/**
 * Run post-launch watch preparation
 */
export async function runPostLaunchWatchPreparation(
  launchKey: string,
  watchWindowHours: number = DEFAULT_WATCH_WINDOW_HOURS
): Promise<{
  watchPlan: LaunchWatchPlan;
  reviewPack: ReturnType<typeof buildPostLaunchReviewPack> extends Promise<infer R> ? R : never;
}> {
  const watchPlan = await buildLaunchWatchPlan({ watchWindowHours });
  const reviewPack = await buildPostLaunchReviewPack(launchKey, watchPlan.watchWindowStart!, watchPlan.watchWindowEnd!);

  return { watchPlan, reviewPack };
}
