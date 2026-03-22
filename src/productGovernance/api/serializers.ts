/**
 * Product Governance API Serializers
 *
 * Serializes domain objects to DTOs.
 */

import {
  ReleaseReadinessReview,
  ProductGovernanceSignal,
  ProductGovernanceDecision,
  ProductGovernanceFollowup,
  ProductQualityCadenceRun,
  ContinuousImprovementReport,
  ReleaseBlockingIssue,
  ReleaseWarningIssue,
} from '../types';

import type {
  ReleaseReadinessReviewDto,
  ProductGovernanceSignalDto,
  ProductGovernanceDecisionDto,
  GovernanceFollowupDto,
  QualityCadenceRunDto,
  ContinuousImprovementReportDto,
} from './types';

/**
 * Serialize ReleaseReadinessReview to DTO
 */
export function serializeReleaseReadinessReview(review: ReleaseReadinessReview): ReleaseReadinessReviewDto {
  return {
    id: review.id,
    releaseKey: review.releaseKey,
    environment: review.environment,
    status: review.status,
    readinessScore: review.readinessScore,
    blockingIssuesCount: review.blockingIssuesCount,
    warningIssuesCount: review.warningIssuesCount,
    reviewedBy: review.reviewedBy,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    finalizedAt: review.finalizedAt?.toISOString() || null,
  };
}

/**
 * Serialize ProductGovernanceSignal to DTO
 */
export function serializeGovernanceSignal(signal: ProductGovernanceSignal): ProductGovernanceSignalDto {
  return {
    id: signal.id,
    signalType: signal.signalType,
    signalSource: signal.signalSource,
    severity: signal.severity,
    targetEntityType: signal.targetEntityType,
    targetEntityId: signal.targetEntityId,
    payload: signal.payload,
    isActive: signal.isActive,
    createdAt: signal.createdAt.toISOString(),
  };
}

/**
 * Serialize ProductGovernanceDecision to DTO
 */
export function serializeGovernanceDecision(decision: ProductGovernanceDecision): ProductGovernanceDecisionDto {
  return {
    id: decision.id,
    decisionType: decision.decisionType,
    decisionStatus: decision.decisionStatus,
    targetEntityType: decision.targetEntityType,
    targetEntityId: decision.targetEntityId,
    payload: decision.payload,
    rationale: decision.rationale,
    actorId: decision.actorId,
    actorRole: decision.actorRole,
    createdAt: decision.createdAt.toISOString(),
  };
}

/**
 * Serialize ProductGovernanceFollowup to DTO
 */
export function serializeGovernanceFollowup(followup: ProductGovernanceFollowup): GovernanceFollowupDto {
  return {
    id: followup.id,
    followupType: followup.followupType,
    followupStatus: followup.followupStatus,
    targetEntityType: followup.targetEntityType,
    targetEntityId: followup.targetEntityId,
    payload: followup.payload,
    assignedTo: followup.assignedTo,
    dueAt: followup.dueAt?.toISOString() || null,
    createdAt: followup.createdAt.toISOString(),
    completedAt: followup.completedAt?.toISOString() || null,
  };
}

/**
 * Serialize ProductQualityCadenceRun to DTO
 */
export function serializeCadenceRun(run: ProductQualityCadenceRun): QualityCadenceRunDto {
  return {
    id: run.id,
    cadenceType: run.cadenceType,
    status: run.status,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    summary: run.summary,
    createdBy: run.createdBy,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() || null,
  };
}

/**
 * Serialize ContinuousImprovementReport to DTO
 */
export function serializeContinuousImprovementReport(report: ContinuousImprovementReport): ContinuousImprovementReportDto {
  return {
    periodStart: report.periodStart.toISOString(),
    periodEnd: report.periodEnd.toISOString(),
    generatedAt: report.generatedAt.toISOString(),
    qualityTrends: {
      signalsTrend: report.qualityTrends.signalsTrend.map(t => ({
        period: t.period,
        value: t.value,
        change: t.change,
      })),
      resolutionRate: report.qualityTrends.resolutionRate,
      averageResolutionTime: report.qualityTrends.averageResolutionTime,
      recurringIssueCount: report.qualityTrends.recurringIssueCount,
    },
    improvementBacklog: {
      totalOpen: report.improvementBacklog.totalOpen,
      byType: report.improvementBacklog.byType,
      bySeverity: report.improvementBacklog.bySeverity,
      overdueCount: report.improvementBacklog.overdueCount,
    },
    governanceEffectiveness: {
      decisionsMade: report.governanceEffectiveness.decisionsMade,
      decisionsOverturned: report.governanceEffectiveness.decisionsOverturned,
      followupCompletionRate: report.governanceEffectiveness.followupCompletionRate,
      averageResolutionTime: report.governanceEffectiveness.averageResolutionTime,
    },
    unresolvedHotspots: report.unresolvedHotspots.map(h => ({
      entityType: h.entityType,
      entityId: h.entityId,
      title: h.title,
      severity: h.severity,
      daysOpen: h.daysOpen,
      lastActivity: h.lastActivity.toISOString(),
    })),
  };
}

/**
 * Serialize blocking issue to DTO
 */
export function serializeBlockingIssue(issue: ReleaseBlockingIssue): ReleaseBlockingIssueDto {
  return {
    id: issue.id,
    signalType: issue.signalType,
    signalSource: issue.signalSource,
    severity: issue.severity,
    targetEntityType: issue.targetEntityType,
    targetEntityId: issue.targetEntityId,
    title: issue.title,
    description: issue.description,
    createdAt: issue.createdAt.toISOString(),
  };
}

/**
 * Serialize warning issue to DTO
 */
export function serializeWarningIssue(issue: ReleaseWarningIssue): ReleaseWarningIssueDto {
  return {
    id: issue.id,
    signalType: issue.signalType,
    signalSource: issue.signalSource,
    severity: issue.severity,
    targetEntityType: issue.targetEntityType,
    targetEntityId: issue.targetEntityId,
    title: issue.title,
    description: issue.description,
    createdAt: issue.createdAt.toISOString(),
  };
}

// Import types
import type { ReleaseBlockingIssueDto, ReleaseWarningIssueDto } from './types';
