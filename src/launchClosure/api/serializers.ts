/**
 * Launch Closure API Serializers
 */

import type { LaunchReadinessReview, LaunchHardeningChecklist, LaunchRiskRecord, LaunchSignoffRecord, LaunchWatchPlan, LaunchGoNoGoDecision, LaunchClosureReport } from '../types.js';

export function serializeReview(review: LaunchReadinessReview) {
  return {
    id: review.id,
    launchKey: review.launchKey,
    reviewStatus: review.reviewStatus,
    readinessStatus: review.readinessStatus,
    readinessScore: review.readinessScore,
    blockerCount: review.blockerCount,
    warningCount: review.warningCount,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function serializeChecklist(checklist: LaunchHardeningChecklist) {
  return {
    id: checklist.id,
    checklistKey: checklist.checklistKey,
    checklistStatus: checklist.checklistStatus,
    checklistPayload: checklist.checklistPayload,
    createdAt: checklist.createdAt.toISOString(),
    completedAt: checklist.completedAt?.toISOString() ?? null,
  };
}

export function serializeRisk(risk: LaunchRiskRecord) {
  return {
    id: risk.id,
    riskType: risk.riskType,
    severity: risk.severity,
    riskStatus: risk.riskStatus,
    riskPayload: risk.riskPayload,
    ownerId: risk.ownerId,
    dueAt: risk.dueAt?.toISOString() ?? null,
    createdAt: risk.createdAt.toISOString(),
  };
}

export function serializeSignoff(signoff: LaunchSignoffRecord) {
  return {
    id: signoff.id,
    signoffArea: signoff.signoffArea,
    signoffStatus: signoff.signoffStatus,
    actorId: signoff.actorId,
    createdAt: signoff.createdAt.toISOString(),
  };
}

export function serializeWatchPlan(plan: LaunchWatchPlan) {
  return {
    id: plan.id,
    planStatus: plan.planStatus,
    watchWindowStart: plan.watchWindowStart?.toISOString() ?? null,
    watchWindowEnd: plan.watchWindowEnd?.toISOString() ?? null,
    planPayload: plan.planPayload,
    createdAt: plan.createdAt.toISOString(),
  };
}

export function serializeGoNoGo(decision: LaunchGoNoGoDecision) {
  return {
    decision: decision.decision,
    readinessStatus: decision.readinessStatus,
    readinessScore: decision.readinessScore,
    blockerCount: decision.blockerCount,
    warningCount: decision.warningCount,
    rationale: decision.rationale,
    decidedAt: decision.decidedAt.toISOString(),
  };
}

export function serializeClosureReport(report: LaunchClosureReport) {
  return {
    reportId: report.reportId,
    launchKey: report.launchKey,
    generatedAt: report.generatedAt.toISOString(),
    readinessStatus: report.readinessStatus,
    readinessScore: report.readinessScore,
    goNoGoDecision: serializeGoNoGo(report.goNoGoDecision),
    checklistCompletion: report.checklistCompletion,
    riskSummary: report.riskSummary,
    signoffSummary: report.signoffSummary,
  };
}
