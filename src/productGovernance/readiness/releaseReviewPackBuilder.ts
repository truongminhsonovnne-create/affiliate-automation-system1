/**
 * Release Review Pack Builder
 *
 * Builds comprehensive review packs for human decision-making.
 */

import {
  ProductGovernanceSignal,
  ReleaseReadinessStatus,
  ReleaseReadinessSummary,
  ReleaseBlockingIssue,
  ReleaseWarningIssue,
  ProductGovernanceReviewPack,
  DecisionSupport,
  RecommendedAction,
  ProductGovernanceFollowup,
} from '../types';
import { READINESS_SCORE_CONFIG, RELEASE_GATE_CONFIG } from '../constants';

export interface ReleaseReviewPackInput {
  releaseKey: string;
  environment: string;
  status: ReleaseReadinessStatus;
  readinessScore: number | null;
  blockingIssues: ReleaseBlockingIssue[];
  warningIssues: ReleaseWarningIssue[];
  summary: ReleaseReadinessSummary;
  openFollowups?: ProductGovernanceFollowup[];
}

/**
 * Build a complete release review pack
 */
export function buildReleaseReviewPack(input: ReleaseReviewPackInput): ProductGovernanceReviewPack {
  const decisionSupport = buildReleaseDecisionSupport(input);

  return {
    releaseKey: input.releaseKey,
    environment: input.environment,
    generatedAt: new Date(),
    reviewStatus: input.status,
    readinessScore: input.readinessScore,
    summary: input.summary,
    blockingIssues: input.blockingIssues,
    warningIssues: input.warningIssues,
    decisionSupport,
    openFollowups: input.openFollowups || [],
  };
}

/**
 * Build decision support information
 */
export function buildReleaseDecisionSupport(input: ReleaseReviewPackInput): DecisionSupport {
  const { status, blockingIssues, warningIssues, readinessScore } = input;

  // Determine what actions are available
  const canApprove = canApproveRelease(status, blockingIssues, readinessScore);
  const canConditionalApprove = canConditionalApproveRelease(status, blockingIssues);
  const canBlock = canBlockRelease(status);
  const canDefer = canDeferRelease(status);

  // Build recommended actions
  const recommendedActions = buildRecommendedActions(
    status,
    blockingIssues,
    warningIssues,
    readinessScore
  );

  // Identify risks
  const risks = identifyReleaseRisks(blockingIssues, warningIssues);

  return {
    canApprove,
    canConditionalApprove,
    canBlock,
    canDefer,
    recommendedActions,
    risks,
  };
}

/**
 * Build issue sections for review pack
 */
export function buildReleaseIssueSections(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): { blockingSection: IssueSection; warningSection: IssueSection } {
  const blockingSection: IssueSection = {
    title: 'Blocking Issues',
    description: 'These issues prevent the release from proceeding',
    issues: blocking.map(issue => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      source: issue.signalSource,
      type: issue.signalType,
      entityId: issue.targetEntityId,
      createdAt: issue.createdAt,
    })),
  };

  const warningSection: IssueSection = {
    title: 'Warning Issues',
    description: 'These issues should be addressed but do not block the release',
    issues: warnings.map(issue => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      source: issue.signalSource,
      type: issue.signalType,
      entityId: issue.targetEntityId,
      createdAt: issue.createdAt,
    })),
  };

  return { blockingSection, warningSection };
}

interface IssueSection {
  title: string;
  description: string;
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    source: string;
    type: string;
    entityId: string;
    createdAt: Date;
  }>;
}

/**
 * Build issue summary for reporting
 */
export function buildIssueSummary(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): string {
  const lines: string[] = [];

  if (blocking.length > 0) {
    lines.push(`## Blocking Issues (${blocking.length})`);
    lines.push('');

    // Group by severity
    const critical = blocking.filter(i => i.severity === 'critical');
    const high = blocking.filter(i => i.severity === 'high');

    if (critical.length > 0) {
      lines.push(`### Critical (${critical.length})`);
      critical.forEach(issue => {
        lines.push(`- **[${issue.signalSource}]** ${issue.title}`);
      });
      lines.push('');
    }

    if (high.length > 0) {
      lines.push(`### High (${high.length})`);
      high.forEach(issue => {
        lines.push(`- **[${issue.signalSource}]** ${issue.title}`);
      });
      lines.push('');
    }
  }

  if (warnings.length > 0) {
    lines.push(`## Warning Issues (${warnings.length})`);
    lines.push('');

    warnings.slice(0, 5).forEach(issue => {
      lines.push(`- [${issue.signalSource}] ${issue.title}`);
    });

    if (warnings.length > 5) {
      lines.push(`- ... and ${warnings.length - 5} more`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function canApproveRelease(
  status: ReleaseReadinessStatus,
  blocking: ReleaseBlockingIssue[],
  score: number | null
): boolean {
  // Must be in a state that allows approval
  if (status !== ReleaseReadinessStatus.IN_PROGRESS && status !== ReleaseReadinessStatus.NEEDS_REVIEW) {
    return false;
  }

  // Must have no blocking issues
  if (blocking.length > 0) {
    return false;
  }

  // Must have good score
  if (score !== null && score < READINESS_SCORE_CONFIG.GOOD_THRESHOLD) {
    return false;
  }

  return true;
}

function canConditionalApproveRelease(
  status: ReleaseReadinessStatus,
  blocking: ReleaseBlockingIssue[]
): boolean {
  // Must be in a state that allows conditional approval
  if (status !== ReleaseReadinessStatus.IN_PROGRESS && status !== ReleaseReadinessStatus.NEEDS_REVIEW) {
    return false;
  }

  // Must have warnings but no critical blocking issues
  const criticalBlocking = blocking.filter(i => i.severity === 'critical');
  return criticalBlocking.length === 0;
}

function canBlockRelease(status: ReleaseReadinessStatus): boolean {
  return status !== ReleaseReadinessStatus.FINALIZED && status !== ReleaseReadinessStatus.BLOCKED;
}

function canDeferRelease(status: ReleaseReadinessStatus): boolean {
  return status !== ReleaseReadinessStatus.FINALIZED;
}

function buildRecommendedActions(
  status: ReleaseReadinessStatus,
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[],
  score: number | null
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Analyze blocking issues
  const criticalBlocking = blocking.filter(i => i.severity === 'critical');
  const highBlocking = blocking.filter(i => i.severity === 'high');

  if (criticalBlocking.length > 0) {
    actions.push({
      action: 'block',
      priority: 1,
      rationale: `${criticalBlocking.length} critical blocking issue(s) must be resolved before release`,
      requiredMitigations: criticalBlocking.map(i => i.title),
    });
  }

  if (highBlocking.length > 0) {
    actions.push({
      action: 'conditionally_approve',
      priority: 2,
      rationale: `${highBlocking.length} high severity issue(s) require mitigation before release`,
      requiredMitigations: highBlocking.map(i => i.title),
    });
  }

  // Check if can approve directly
  if (blocking.length === 0 && score !== null && score >= READINESS_SCORE_CONFIG.GOOD_THRESHOLD) {
    actions.push({
      action: 'approve',
      priority: 0,
      rationale: `Release meets quality standards with score ${score}`,
    });
  }

  // Check if conditional approval is recommended
  if (blocking.length === 0 && warnings.length > 0) {
    actions.push({
      action: 'conditionally_approve',
      priority: 1,
      rationale: `${warnings.length} warning(s) should be addressed but do not block release`,
    });
  }

  // Check for rollback recommendation
  if (criticalBlocking.length > 3) {
    actions.push({
      action: 'rollback',
      priority: 0,
      rationale: 'Multiple critical issues suggest rollback should be considered',
    });
  }

  // Sort by priority
  return actions.sort((a, b) => a.priority - b.priority);
}

function identifyReleaseRisks(
  blocking: ReleaseBlockingIssue[],
  warnings: ReleaseWarningIssue[]
): string[] {
  const risks: string[] = [];

  // Analyze blocking risks
  if (blocking.length > 0) {
    const byType: Record<string, number> = {};
    blocking.forEach(issue => {
      byType[issue.signalType] = (byType[issue.signalType] || 0) + 1;
    });

    Object.entries(byType).forEach(([type, count]) => {
      risks.push(`${count} unresolved ${type} issue(s)`);
    });
  }

  // Analyze warning risks
  if (warnings.length > 5) {
    risks.push(`${warnings.length} warning issues pending resolution`);
  }

  // Add severity-specific risks
  const criticalCount = blocking.filter(i => i.severity === 'critical').length;
  if (criticalCount > 0) {
    risks.push(`${criticalCount} critical severity issue(s) in release`);
  }

  return risks;
}
