/**
 * Platform Rollout Orchestrator
 *
 * Main orchestrator for rollout planning and execution.
 */

import type {
  PlatformRolloutPlan,
  PlatformRolloutStage,
  PlatformRolloutDecisionSupport,
  RolloutPlanBuildResponse,
  RolloutExecutionResponse,
  PostEnablementReviewResponse,
} from '../types/index.js';
import {
  buildPlatformRolloutPlan,
  buildTikTokShopRolloutPlan,
} from '../planning/platformRolloutPlanBuilder.js';
import {
  evaluateStageCheckpointSet,
  buildCheckpointDecision,
} from '../checkpoints/checkpointEvaluator.js';
import {
  collectRolloutGuardrailSignals,
} from '../checkpoints/guardrailSignalCollector.js';
import {
  platformRolloutPlanRepository,
} from '../repositories/platformRolloutPlanRepository.js';
import { platformPostEnablementBacklogRepository } from '../repositories/platformPostEnablementBacklogRepository.js';
import logger from '../../../utils/logger.js';

/**
 * Run platform rollout planning cycle
 */
export async function runPlatformRolloutPlanningCycle(params: {
  platformKey: string;
  targetStage?: string;
  createdBy?: string;
}): Promise<RolloutPlanBuildResponse> {
  const { platformKey, targetStage, createdBy } = params;

  logger.info({ msg: 'Running platform rollout planning', platformKey, targetStage });

  try {
    // Build rollout plan
    const planData = buildPlatformRolloutPlan(
      platformKey,
      targetStage || 'full_production',
      { createdBy }
    );

    // Persist plan
    let plan: PlatformRolloutPlan;
    try {
      plan = await platformRolloutPlanRepository.createPlan({
        platformKey: planData.plan.platformKey,
        rolloutKey: planData.plan.rolloutKey,
        rolloutStatus: planData.plan.rolloutStatus,
        targetEnablementStage: planData.plan.targetEnablementStage,
        rolloutPayload: planData.plan.rolloutPayload,
        createdBy: planData.plan.createdBy,
      });
    } catch (e) {
      logger.warn({ msg: 'Failed to persist plan', error: e });
      plan = {
        id: crypto.randomUUID(),
        ...planData.plan,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PlatformRolloutPlan;
    }

    logger.info({
      msg: 'Platform rollout plan created',
      platformKey,
      rolloutKey: plan.rolloutKey,
    });

    return {
      success: true,
      plan,
      stages: [] as PlatformRolloutStage[],
      errors: [],
    };
  } catch (error) {
    logger.error({ msg: 'Rollout planning failed', platformKey, error });
    return {
      success: false,
      plan: null,
      stages: [],
      errors: [{ code: 'PLANNING_FAILED', message: String(error) }],
    };
  }
}

/**
 * Run platform rollout execution cycle
 */
export async function runPlatformRolloutExecutionCycle(params: {
  platformKey: string;
  stageKey: string;
}): Promise<RolloutExecutionResponse> {
  const { platformKey, stageKey } = params;

  logger.info({ msg: 'Running rollout execution', platformKey, stageKey });

  try {
    // Get current plan
    const plan = await platformRolloutPlanRepository.getPlanByPlatform(platformKey);
    if (!plan) {
      return {
        success: false,
        currentStage: null,
        checkpointResults: [],
        decision: {
          recommendation: 'hold',
          summary: 'No active rollout plan',
          confidence: 0,
          guardrailSummary: {
            overallScore: null,
            checkpointSignals: [],
            canProceed: false,
            blockers: ['No rollout plan'],
            warnings: [],
          },
          nextSteps: ['Create rollout plan first'],
          blockers: ['No rollout plan'],
          warnings: [],
        },
        errors: [{ code: 'NO_PLAN', message: 'No active rollout plan' }],
      };
    }

    // Collect guardrail signals
    const signals = await collectRolloutGuardrailSignals(platformKey);

    // Evaluate checkpoints
    const guardrailSummary = await evaluateStageCheckpointSet(stageKey, signals);

    // Build decision
    const checkpointDecision = buildCheckpointDecision(guardrailSummary);

    // Build decision support
    const decision: PlatformRolloutDecisionSupport = {
      recommendation: checkpointDecision.decision,
      summary: checkpointDecision.rationale,
      confidence: guardrailSummary.overallScore ? guardrailSummary.overallScore / 100 : 0,
      guardrailSummary,
      nextSteps: buildNextSteps(checkpointDecision.decision),
      blockers: guardrailSummary.blockers,
      warnings: guardrailSummary.warnings,
    };

    logger.info({
      msg: 'Rollout execution complete',
      platformKey,
      stageKey,
      decision: checkpointDecision.decision,
      score: guardrailSummary.overallScore,
    });

    return {
      success: true,
      currentStage: {
        id: crypto.randomUUID(),
        rolloutPlanId: plan.id,
        stageKey,
        stageOrder: 1,
        stageStatus: 'in_progress',
        exposureScope: 'limited_public',
        trafficPercentage: 5,
        stagePayload: {},
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        createdAt: new Date(),
      },
      checkpointResults: guardrailSummary.checkpointSignals,
      decision,
      errors: [],
    };
  } catch (error) {
    logger.error({ msg: 'Rollout execution failed', platformKey, error });
    return {
      success: false,
      currentStage: null,
      checkpointResults: [],
      decision: {
        recommendation: 'hold',
        summary: 'Execution failed',
        confidence: 0,
        guardrailSummary: {
          overallScore: null,
          checkpointSignals: [],
          canProceed: false,
          blockers: [String(error)],
          warnings: [],
        },
        nextSteps: ['Check system status'],
        blockers: [String(error)],
        warnings: [],
      },
      errors: [{ code: 'EXECUTION_FAILED', message: String(error) }],
    };
  }
}

/**
 * Run platform post-enablement review cycle
 */
export async function runPlatformPostEnablementReviewCycle(params: {
  platformKey: string;
}): Promise<PostEnablementReviewResponse> {
  const { platformKey } = params;

  logger.info({ msg: 'Running post-enablement review', platformKey });

  try {
    // Collect signals
    const signals = await collectRolloutGuardrailSignals(platformKey);

    // Evaluate checkpoints
    const guardrailSummary = await evaluateStageCheckpointSet('post_enablement', signals);

    // Build health summary
    const healthSummary = {
      healthScore: guardrailSummary.overallScore,
      stabilityScore: signals.stabilityScore as number | null,
      qualityScore: signals.qualityScore as number | null,
      latencyScore: null,
      errorScore: signals.errorRate ? 100 - (signals.errorRate as number) * 10 : null,
      issuesDetected: guardrailSummary.blockers,
      driftDetected: false,
    };

    // Create backlog items if needed
    const newBacklogItems = [];

    logger.info({
      msg: 'Post-enablement review complete',
      platformKey,
      healthScore: healthSummary.healthScore,
    });

    return {
      success: true,
      healthSummary,
      guardrailSummary,
      newBacklogItems,
      recommendation: guardrailSummary.canProceed ? 'proceed' : 'hold',
      errors: [],
    };
  } catch (error) {
    logger.error({ msg: 'Post-enablement review failed', platformKey, error });
    return {
      success: false,
      healthSummary: {
        healthScore: null,
        stabilityScore: null,
        qualityScore: null,
        latencyScore: null,
        errorScore: null,
        issuesDetected: [],
        driftDetected: false,
      },
      guardrailSummary: {
        overallScore: null,
        checkpointSignals: [],
        canProceed: false,
        blockers: [String(error)],
        warnings: [],
      },
      newBacklogItems: [],
      recommendation: 'hold',
      errors: [{ code: 'REVIEW_FAILED', message: String(error) }],
    };
  }
}

/**
 * Build platform rollout report
 */
export async function buildPlatformRolloutReport(platformKey: string): Promise<{
  plan: PlatformRolloutPlan | null;
  currentStage: PlatformRolloutStage | null;
  decisionSupport: PlatformRolloutDecisionSupport | null;
}> {
  const plan = await platformRolloutPlanRepository.getPlanByPlatform(platformKey);

  return {
    plan,
    currentStage: null,
    decisionSupport: null,
  };
}

/**
 * Build platform launch decision support
 */
export async function buildPlatformLaunchDecisionSupport(platformKey: string): Promise<PlatformRolloutDecisionSupport> {
  const signals = await collectRolloutGuardrailSignals(platformKey);
  const guardrailSummary = await evaluateStageCheckpointSet('launch', signals);
  const checkpointDecision = buildCheckpointDecision(guardrailSummary);

  return {
    recommendation: checkpointDecision.decision as 'proceed' | 'hold' | 'rollback',
    summary: checkpointDecision.rationale,
    confidence: guardrailSummary.overallScore ? guardrailSummary.overallScore / 100 : 0,
    guardrailSummary,
    nextSteps: buildNextSteps(checkpointDecision.decision),
    blockers: guardrailSummary.blockers,
    warnings: guardrailSummary.warnings,
  };
}

function buildNextSteps(decision: string): string[] {
  switch (decision) {
    case 'proceed':
      return ['Advance to next stage', 'Update exposure scope', 'Continue monitoring'];
    case 'hold':
      return ['Address checkpoint failures', 'Re-run checkpoint evaluation', 'Re-evaluate in 24h'];
    case 'rollback':
      return ['Initiate rollback', 'Notify stakeholders', 'Document root cause'];
    default:
      return ['Review system status'];
  }
}
