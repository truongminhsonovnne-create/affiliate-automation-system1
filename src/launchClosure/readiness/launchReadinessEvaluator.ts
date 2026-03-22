/**
 * Launch Readiness Evaluator
 * Evaluates launch readiness
 */

import type {
  LaunchReadinessStatus,
  LaunchRiskRecord,
  LaunchChecklistItem,
  LaunchSignoffRecord,
  ChecklistCompletionSummary,
  RiskSummary,
} from '../types.js';

import {
  READINESS_SCORE_GO_THRESHOLD,
  READINESS_SCORE_CONDITIONAL_GO_THRESHOLD,
  MAX_BLOCKERS_FOR_GO,
  MAX_BLOCKERS_FOR_CONDITIONAL_GO,
} from '../constants.js';

import { calculateChecklistHealthScore } from '../checklists/checklistEvaluator.js';
import { classifyLaunchRisks } from '../risks/launchRiskClassifier.js';

export interface ReadinessEvaluationInput {
  checklistItems: LaunchChecklistItem[];
  risks: LaunchRiskRecord[];
  signoffs: LaunchSignoffRecord[];
}

export interface ReadinessEvaluationResult {
  readinessStatus: LaunchReadinessStatus;
  readinessScore: number;
  blockerCount: number;
  warningCount: number;
  checklistSummary: ChecklistCompletionSummary;
  riskSummary: RiskSummary;
  criticalUnresolvedRisks: number;
}

/**
 * Evaluate launch readiness
 */
export async function evaluateLaunchReadiness(
  input: ReadinessEvaluationInput
): Promise<ReadinessEvaluationResult> {
  const { checklistItems, risks, signoffs } = input;

  // Evaluate checklist
  const checklistSummary = buildChecklistSummary(checklistItems);
  const checklistScore = calculateChecklistHealthScore(checklistItems);

  // Evaluate risks
  const riskClassification = await classifyLaunchRisks(risks);
  const riskSummary = riskClassification.summary;
  const blockerCount = riskClassification.blockers.length;
  const warningCount = riskClassification.warnings.length;
  const criticalUnresolvedRisks = risks.filter(
    (r) => r.severity === 'critical' && r.riskStatus === 'open'
  ).length;

  // Evaluate signoffs
  const signoffApprovedCount = signoffs.filter((s) => s.signoffStatus === 'approved').length;
  const signoffRequiredCount = signoffs.length;
  const signoffScore = signoffRequiredCount > 0
    ? signoffApprovedCount / signoffRequiredCount
    : 1;

  // Calculate overall readiness score
  const readinessScore = buildLaunchReadinessScore(
    checklistScore,
    riskSummary,
    signoffScore
  );

  // Classify readiness status
  const readinessStatus = classifyLaunchReadinessStatus(
    readinessScore,
    blockerCount,
    criticalUnresolvedRisks
  );

  return {
    readinessStatus,
    readinessScore,
    blockerCount,
    warningCount,
    checklistSummary,
    riskSummary,
    criticalUnresolvedRisks,
  };
}

/**
 * Build launch readiness score
 */
export function buildLaunchReadinessScore(
  checklistScore: number,
  riskSummary: RiskSummary,
  signoffScore: number
): number {
  // Weights
  const checklistWeight = 0.4;
  const riskWeight = 0.4;
  const signoffWeight = 0.2;

  // Risk score (inverse - lower risk = higher score)
  const totalRisks = riskSummary.totalRisks;
  const resolvedRisks = riskSummary.resolvedRisks;
  const riskScore = totalRisks > 0
    ? (resolvedRisks / totalRisks) * 100
    : 100;

  // Calculate weighted score
  const score =
    checklistScore * checklistWeight +
    riskScore * riskWeight +
    signoffScore * 100 * signoffWeight;

  return Math.round(score) / 100;
}

/**
 * Classify launch readiness status
 */
export function classifyLaunchReadinessStatus(
  readinessScore: number,
  blockerCount: number,
  criticalUnresolvedRisks: number
): LaunchReadinessStatus {
  // If there are critical unresolved risks, always blocked
  if (criticalUnresolvedRisks > 0) {
    return 'blocked';
  }

  // If there are blockers, check thresholds
  if (blockerCount > MAX_BLOCKERS_FOR_GO) {
    return 'no_go';
  }

  // Check score thresholds
  if (readinessScore >= READINESS_SCORE_GO_THRESHOLD && blockerCount === 0) {
    return 'ready';
  }

  if (readinessScore >= READINESS_SCORE_CONDITIONAL_GO_THRESHOLD &&
    blockerCount <= MAX_BLOCKERS_FOR_CONDITIONAL_GO) {
    return 'conditional_go';
  }

  if (readinessScore >= 0.5) {
    return 'watch_required';
  }

  return 'stabilization_incomplete';
}

/**
 * Build launch readiness summary
 */
export function buildLaunchReadinessSummary(
  evaluation: ReadinessEvaluationResult
): string {
  const { readinessStatus, readinessScore, blockerCount, warningCount } = evaluation;

  const scorePercent = Math.round(readinessScore * 100);

  let summary = `Launch Readiness: ${readinessStatus.toUpperCase()} (${scorePercent}%)\n`;
  summary += `Blockers: ${blockerCount}, Warnings: ${warningCount}\n`;

  if (readinessStatus === 'ready') {
    summary += '✅ Launch is GO. All critical items resolved.';
  } else if (readinessStatus === 'conditional_go') {
    summary += '⚠️ Launch is CONDITIONAL GO. Review warnings.';
  } else if (readinessStatus === 'no_go') {
    summary += '❌ Launch is NO-GO. Critical blockers must be resolved.';
  } else if (readinessStatus === 'blocked') {
    summary += '🚫 Launch is BLOCKED. Critical unresolved issues exist.';
  } else {
    summary += '⏳ Stabilization incomplete.';
  }

  return summary;
}

// Helper functions

function buildChecklistSummary(items: LaunchChecklistItem[]): ChecklistCompletionSummary {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.status === 'completed').length;
  const failedItems = items.filter((item) => item.status === 'failed').length;
  const skippedItems = items.filter((item) => item.status === 'skipped').length;
  const pendingItems = items.filter((item) => item.status === 'pending').length;

  const criticalItems = items.filter((item) => item.isCritical).length;
  const criticalCompleted = items.filter(
    (item) => item.isCritical && item.status === 'completed'
  ).length;

  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return {
    totalItems,
    completedItems,
    failedItems,
    skippedItems,
    pendingItems,
    criticalItems,
    criticalCompleted,
    completionPercentage,
  };
}
