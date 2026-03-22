/**
 * Insight Prioritizer
 *
 * Ranks and prioritizes optimization insights
 */

import {
  VoucherOptimizationInsight,
  VoucherOptimizationSeverity,
  InsightStatus,
} from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface PrioritizedInsight extends VoucherOptimizationInsight {
  priorityRank: number;
  actionUrgency: 'immediate' | 'soon' | 'when_possible' | 'backlog';
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Prioritize optimization insights
 */
export function prioritizeOptimizationInsights(
  insights: VoucherOptimizationInsight[],
  options?: {
    statusFilter?: InsightStatus[];
    maxInsights?: number;
  }
): PrioritizedInsight[] {
  let filtered = insights;

  // Filter by status
  if (options?.statusFilter && options.statusFilter.length > 0) {
    filtered = filtered.filter(i => options.statusFilter!.includes(i.status));
  }

  // Sort by priority score
  const sorted = [...filtered].sort((a, b) => {
    // First by priority score (descending)
    const scoreA = a.priorityScore || 0;
    const scoreB = b.priorityScore || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Then by severity (critical > high > medium > low)
    const severityOrder = {
      [VoucherOptimizationSeverity.CRITICAL]: 4,
      [VoucherOptimizationSeverity.HIGH]: 3,
      [VoucherOptimizationSeverity.MEDIUM]: 2,
      [VoucherOptimizationSeverity.LOW]: 1,
    };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Limit results
  const limited = options?.maxInsights
    ? sorted.slice(0, options.maxInsights)
    : sorted;

  // Add priority ranks and urgency
  return limited.map((insight, index) => ({
    ...insight,
    priorityRank: index + 1,
    actionUrgency: determineActionUrgency(insight),
  }));
}

/**
 * Score optimization insight
 */
export function scoreOptimizationInsight(insight: VoucherOptimizationInsight): number {
  let score = 0;

  // Base score from priority
  score += (insight.priorityScore || 0.5) * 50;

  // Severity multiplier
  switch (insight.severity) {
    case VoucherOptimizationSeverity.CRITICAL:
      score += 30;
      break;
    case VoucherOptimizationSeverity.HIGH:
      score += 20;
      break;
    case VoucherOptimizationSeverity.MEDIUM:
      score += 10;
      break;
    case VoucherOptimizationSeverity.LOW:
      score += 5;
      break;
  }

  // Newer insights get slight boost
  const daysSinceCreation = (Date.now() - new Date(insight.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation < 1) score += 5;
  else if (daysSinceCreation < 3) score += 3;
  else if (daysSinceCreation > 14) score -= 5;

  return Math.min(100, score);
}

/**
 * Group insights by severity
 */
export function groupInsightsBySeverity(
  insights: VoucherOptimizationInsight[]
): Record<VoucherOptimizationSeverity, VoucherOptimizationInsight[]> {
  const grouped: Record<VoucherOptimizationSeverity, VoucherOptimizationInsight[]> = {
    [VoucherOptimizationSeverity.CRITICAL]: [],
    [VoucherOptimizationSeverity.HIGH]: [],
    [VoucherOptimizationSeverity.MEDIUM]: [],
    [VoucherOptimizationSeverity.LOW]: [],
  };

  for (const insight of insights) {
    grouped[insight.severity].push(insight);
  }

  return grouped;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine action urgency
 */
function determineActionUrgency(insight: VoucherOptimizationInsight): 'immediate' | 'soon' | 'when_possible' | 'backlog' {
  if (insight.status !== InsightStatus.OPEN) {
    return 'backlog';
  }

  if (insight.severity === VoucherOptimizationSeverity.CRITICAL) {
    return 'immediate';
  }

  if (insight.severity === VoucherOptimizationSeverity.HIGH) {
    return 'soon';
  }

  if (insight.severity === VoucherOptimizationSeverity.MEDIUM) {
    return 'when_possible';
  }

  return 'backlog';
}
