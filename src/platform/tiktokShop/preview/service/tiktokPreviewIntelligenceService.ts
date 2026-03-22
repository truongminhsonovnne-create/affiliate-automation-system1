/**
 * TikTok Shop Preview Intelligence Service
 *
 * Main orchestrator service for TikTok Shop preview intelligence.
 */

import { aggregateTikTokPreviewFunnel } from '../funnel/tiktokPreviewFunnelAggregator.js';
import { evaluateTikTokPreviewUsefulness } from '../quality/tiktokPreviewUsefulnessEvaluator.js';
import { evaluateTikTokPreviewStability } from '../quality/tiktokPreviewStabilityEvaluator.js';
import { evaluateTikTokCommercialReadiness } from '../commercial/tiktokCommercialReadinessEvaluator.js';
import { evaluateTikTokMonetizationGuardrails } from '../commercial/tiktokMonetizationGuardrailEvaluator.js';
import { runTikTokPreviewGovernanceReview } from '../governance/tiktokPreviewGovernanceService.js';
import { getCurrentMonetizationStage } from '../governance/tiktokMonetizationEnablementService.js';
import { tiktokPreviewBacklogRepository } from '../repositories/tiktokMonetizationGovernanceRepository.js';
import type {
  TikTokShopPreviewFunnelSummary,
  TikTokShopPreviewUsefulnessResult,
  TikTokShopPreviewStabilityResult,
  TikTokShopCommercialReadinessResult,
  TikTokShopMonetizationGuardrailResult,
  TikTokShopPreviewGovernanceSummary,
  TikTokShopPreviewDecisionSupport,
  TikTokShopPreviewBacklogReport,
} from '../types.js';
import logger from '../../../../utils/logger.js';

/**
 * Run preview intelligence cycle
 */
export async function runTikTokPreviewIntelligenceCycle(params?: {
  from?: Date;
  to?: Date;
}): Promise<{
  funnelSummary: TikTokShopPreviewFunnelSummary;
  usefulnessResult: TikTokShopPreviewUsefulnessResult;
  stabilityResult: TikTokShopPreviewStabilityResult;
}> {
  const from = params?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const to = params?.to || new Date();

  logger.info({ msg: 'Running TikTok preview intelligence cycle', from, to });

  // 1. Aggregate preview funnel
  const funnelSummary = await aggregateTikTokPreviewFunnel(from, to);

  // 2. Evaluate usefulness
  const usefulnessResult = await evaluateTikTokPreviewUsefulness(funnelSummary);

  // 3. Evaluate stability
  const stabilityResult = await evaluateTikTokPreviewStability(funnelSummary);

  logger.info({
    msg: 'TikTok preview intelligence cycle complete',
    sessions: funnelSummary.totalSessions,
    usefulness: usefulnessResult.overallScore,
    stability: stabilityResult.overallScore,
  });

  return { funnelSummary, usefulnessResult, stabilityResult };
}

/**
 * Run commercial readiness review
 */
export async function runTikTokCommercialReadinessReview(params?: {
  from?: Date;
  to?: Date;
}): Promise<{
  commercialReadinessResult: TikTokShopCommercialReadinessResult;
  guardrailResult: TikTokShopMonetizationGuardrailResult;
  governanceSummary: TikTokShopPreviewGovernanceSummary;
}> {
  logger.info({ msg: 'Running TikTok commercial readiness review' });

  // Get intelligence results
  const { usefulnessResult, stabilityResult } = await runTikTokPreviewIntelligenceCycle(params);

  // Evaluate commercial readiness
  const commercialReadinessResult = await evaluateTikTokCommercialReadiness({
    usefulnessResult,
    stabilityResult,
    lineageConfidence: 0.5, // Would fetch from lineage service
    productContextScore: 60, // Would calculate from data
    governanceScore: 70, // Would fetch from governance
    operatorScore: 80, // Would fetch from ops
    biIntegrationScore: 50, // Would fetch from BI
  });

  // Evaluate guardrails
  const guardrailResult = await evaluateTikTokMonetizationGuardrails({
    usefulnessResult,
    stabilityResult,
    commercialReadinessResult,
    lineageConfidence: 0.5,
    unsupportedRate: stabilityResult.errorRate / 100,
  });

  // Get governance summary
  const governanceSummary = await runTikTokPreviewGovernanceReview();

  logger.info({
    msg: 'TikTok commercial readiness review complete',
    readinessScore: commercialReadinessResult.overallScore,
    status: commercialReadinessResult.status,
    guardrailDecision: guardrailResult.decision,
  });

  return { commercialReadinessResult, guardrailResult, governanceSummary };
}

/**
 * Build preview performance report
 */
export async function buildTikTokPreviewPerformanceReport(params?: {
  from?: Date;
  to?: Date;
}): Promise<Record<string, unknown>> {
  logger.info({ msg: 'Building TikTok preview performance report' });

  const { funnelSummary, usefulnessResult, stabilityResult } = await runTikTokPreviewIntelligenceCycle(params);

  return {
    platform: 'tiktok_shop',
    period: {
      from: params?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: params?.to || new Date(),
    },
    funnel: {
      totalSessions: funnelSummary.totalSessions,
      totalEvents: funnelSummary.totalEvents,
      surfaceViews: funnelSummary.surfaceViews,
      inputSubmissions: funnelSummary.inputSubmissions,
      resolutionAttempts: funnelSummary.resolutionAttempts,
      supportedResolutions: funnelSummary.supportedResolutions,
      partialResolutions: funnelSummary.partialResolutions,
      unavailableResolutions: funnelSummary.unavailableResolutions,
    },
    quality: {
      usefulness: usefulnessResult.overallScore,
      stability: stabilityResult.overallScore,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build preview decision support report
 */
export async function buildTikTokPreviewDecisionSupportReport(): Promise<TikTokShopPreviewDecisionSupport> {
  logger.info({ msg: 'Building TikTok preview decision support report' });

  // Get all required data
  const { usefulnessResult, stabilityResult } = await runTikTokPreviewIntelligenceCycle();
  const { commercialReadinessResult, guardrailResult, governanceSummary } = await runTikTokCommercialReadinessReview();

  // Get current stage
  const currentStage = await getCurrentMonetizationStage();

  // Build decision support
  const decisionSupport: TikTokShopPreviewDecisionSupport = {
    recommendation: guardrailResult.decision === 'hold'
      ? 'hold'
      : guardrailResult.decision === 'proceed'
        ? governanceSummary.riskLevel === 'low'
          ? 'proceed_to_production'
          : 'proceed_cautiously'
        : 'extend_preview',
    summary: `Preview readiness: ${commercialReadinessResult.overallScore}, Guardrail: ${guardrailResult.decision}`,
    evidence: {
      usefulnessScore: usefulnessResult.overallScore,
      stabilityScore: stabilityResult.overallScore,
      commercialScore: commercialReadinessResult.overallScore,
      guardrailScore: guardrailResult.overallScore,
      currentStage,
    },
    nextSteps: generateNextSteps(guardrailResult.decision, governanceSummary),
    blockers: commercialReadinessResult.blockers,
    warnings: [...commercialReadinessResult.warnings, ...guardrailResult.warnings],
  };

  logger.info({
    msg: 'TikTok preview decision support complete',
    recommendation: decisionSupport.recommendation,
  });

  return decisionSupport;
}

/**
 * Build backlog report
 */
export async function buildTikTokPreviewBacklogReport(): Promise<TikTokShopPreviewBacklogReport> {
  logger.info({ msg: 'Building TikTok preview backlog report' });

  const stats = await tiktokPreviewBacklogRepository.getBacklogStats();
  const criticalItems = await tiktokPreviewBacklogRepository.getCriticalItems(10);
  const highPriorityItems = await tiktokPreviewBacklogRepository.getHighPriorityItems(20);

  const report: TikTokShopPreviewBacklogReport = {
    totalItems: stats.total,
    openItems: stats.open,
    inProgressItems: stats.inProgress,
    blockedItems: stats.blocked,
    resolvedItems: stats.resolved,
    byType: stats.byType as Record<string, number>,
    byPriority: stats.byPriority as Record<string, number>,
    criticalItems: criticalItems as unknown as TikTokShopPreviewBacklogReport['criticalItems'],
    highPriorityItems: highPriorityItems as unknown as TikTokShopPreviewBacklogReport['highPriorityItems'],
  };

  logger.info({
    msg: 'TikTok preview backlog report complete',
    totalItems: report.totalItems,
    openItems: report.openItems,
  });

  return report;
}

/**
 * Generate next steps based on guardrail decision
 */
function generateNextSteps(
  decision: string,
  governanceSummary: TikTokShopPreviewGovernanceSummary
): string[] {
  const nextSteps: string[] = [];

  switch (decision) {
    case 'hold':
      nextSteps.push('Review blockers and resolve critical issues');
      nextSteps.push('Improve preview quality and stability');
      nextSteps.push('Re-evaluate in next cycle');
      break;

    case 'proceed_cautiously':
      nextSteps.push('Enable limited monetization');
      nextSteps.push('Monitor closely for issues');
      nextSteps.push('Plan production transition');
      break;

    case 'proceed':
      nextSteps.push('Enable monetization');
      nextSteps.push('Notify stakeholders');
      nextSteps.push('Monitor metrics');
      break;

    case 'production_ready':
      nextSteps.push('Prepare production rollout');
      nextSteps.push('Enable full production monetization');
      nextSteps.push('Monitor revenue metrics');
      break;
  }

  // Add governance-related next steps
  if (governanceSummary.openBlockers.length > 0) {
    nextSteps.push(`Address ${governanceSummary.openBlockers.length} critical blockers`);
  }

  return nextSteps;
}
