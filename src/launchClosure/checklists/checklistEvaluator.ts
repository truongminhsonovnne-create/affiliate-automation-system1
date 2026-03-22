/**
 * Checklist Evaluator
 * Evaluates checklist completion
 */

import type {
  LaunchChecklistItem,
  LaunchChecklistStatus,
  ChecklistCompletionSummary,
} from '../types.js';

export interface ChecklistEvaluationInput {
  items: LaunchChecklistItem[];
}

export interface ChecklistEvaluationResult {
  summary: ChecklistCompletionSummary;
  incompleteCriticalItems: LaunchChecklistItem[];
  completedCriticalItems: LaunchChecklistItem[];
  failedItems: LaunchChecklistItem[];
}

/**
 * Evaluate launch checklist
 */
export async function evaluateLaunchChecklist(
  input: ChecklistEvaluationInput
): Promise<ChecklistEvaluationResult> {
  const { items } = input;

  const summary = buildChecklistCompletionSummary(items);
  const incompleteCriticalItems = detectIncompleteCriticalChecklistItems(items);
  const completedCriticalItems = items.filter(
    (item) => item.isCritical && item.status === 'completed'
  );
  const failedItems = items.filter((item) => item.status === 'failed');

  return {
    summary,
    incompleteCriticalItems,
    completedCriticalItems,
    failedItems,
  };
}

/**
 * Evaluate checklist completion
 */
export async function evaluateChecklistCompletion(
  items: LaunchChecklistItem[]
): Promise<{
  isComplete: boolean;
  completionPercentage: number;
  hasFailedItems: boolean;
}> {
  const summary = buildChecklistCompletionSummary(items);

  const isComplete =
    summary.completionPercentage === 100 && summary.failedItems === 0;
  const hasFailedItems = summary.failedItems > 0;

  return {
    isComplete,
    completionPercentage: summary.completionPercentage,
    hasFailedItems,
  };
}

/**
 * Build checklist completion summary
 */
export function buildChecklistCompletionSummary(
  items: LaunchChecklistItem[]
): ChecklistCompletionSummary {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.status === 'completed').length;
  const failedItems = items.filter((item) => item.status === 'failed').length;
  const skippedItems = items.filter((item) => item.status === 'skipped').length;
  const pendingItems = items.filter((item) => item.status === 'pending').length;

  const criticalItems = items.filter((item) => item.isCritical).length;
  const criticalCompleted = items.filter(
    (item) => item.isCritical && item.status === 'completed'
  ).length;

  const completionPercentage =
    totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

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

/**
 * Detect incomplete critical checklist items
 */
export function detectIncompleteCriticalChecklistItems(
  items: LaunchChecklistItem[]
): LaunchChecklistItem[] {
  return items.filter(
    (item) => item.isCritical && item.status !== 'completed'
  );
}

/**
 * Calculate checklist health score
 */
export function calculateChecklistHealthScore(
  items: LaunchChecklistItem[]
): number {
  const summary = buildChecklistCompletionSummary(items);

  // Base score from completion
  let score = summary.completionPercentage;

  // Penalize for failed items
  if (summary.failedItems > 0) {
    const penalty = Math.min(summary.failedItems * 10, 30);
    score -= penalty;
  }

  // Penalize for incomplete critical items
  if (summary.criticalItems > 0) {
    const criticalIncomplete = summary.criticalItems - summary.criticalCompleted;
    const criticalPenalty = (criticalIncomplete / summary.criticalItems) * 30;
    score -= criticalPenalty;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get checklist status breakdown
 */
export function getChecklistStatusBreakdown(
  items: LaunchChecklistItem[]
): Record<LaunchChecklistStatus, number> {
  return {
    pending: items.filter((item) => item.status === 'pending').length,
    in_progress: items.filter((item) => item.status === 'in_progress').length,
    completed: items.filter((item) => item.status === 'completed').length,
    skipped: items.filter((item) => item.status === 'skipped').length,
    failed: items.filter((item) => item.status === 'failed').length,
  };
}
