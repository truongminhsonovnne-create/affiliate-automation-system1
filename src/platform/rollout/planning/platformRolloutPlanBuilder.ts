/**
 * Platform Rollout Plan Builder
 *
 * Builds rollout plans for platform production enablement.
 */

import type {
  PlatformRolloutPlan,
  PlatformRolloutStage,
  PlatformRolloutCheckpoint,
  CreateRolloutPlanInput,
} from '../types/index.js';
import { ROLLOUT_STAGES, ROLLOUT_TIMING } from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Build platform rollout plan
 */
export function buildPlatformRolloutPlan(
  platformKey: string,
  targetEnablementStage: string,
  params?: {
    createdBy?: string;
    candidateScore?: number;
    candidateStatus?: string;
  }
): {
  plan: Omit<PlatformRolloutPlan, 'id' | 'createdAt' | 'updatedAt'>;
  stages: Omit<PlatformRolloutStage, 'id' | 'rolloutPlanId' | 'createdAt'>[];
  checkpoints: Omit<PlatformRolloutCheckpoint, 'id' | 'rolloutStageId' | 'createdAt'>[];
} {
  const rolloutKey = `${platformKey}-rollout-${Date.now()}`;

  // Build plan
  const plan: Omit<PlatformRolloutPlan, 'id' | 'createdAt' | 'updatedAt'> = {
    platformKey,
    rolloutKey,
    rolloutStatus: 'planned',
    targetEnablementStage,
    rolloutPayload: {
      candidateScore: params?.candidateScore,
      candidateStatus: params?.candidateStatus,
      targetStage: targetEnablementStage,
    },
    createdBy: params?.createdBy || null,
    finalizedAt: null,
    startedAt: null,
    completedAt: null,
  };

  // Build stages
  const stages = buildRolloutStages(platformKey, targetEnablementStage);

  // Build checkpoints
  const checkpoints = buildRolloutCheckpointPlan(stages);

  logger.info({
    msg: 'Platform rollout plan built',
    platformKey,
    rolloutKey,
    stageCount: stages.length,
    checkpointCount: checkpoints.length,
  });

  return { plan, stages, checkpoints };
}

/**
 * Build TikTok Shop rollout plan
 */
export function buildTikTokShopRolloutPlan(
  params?: {
    createdBy?: string;
    candidateScore?: number;
  }
): ReturnType<typeof buildPlatformRolloutPlan> {
  return buildPlatformRolloutPlan('tiktok_shop', 'production_enabled', params);
}

/**
 * Build rollout stages
 */
export function buildRolloutStages(
  platformKey: string,
  targetEnablementStage: string
): Omit<PlatformRolloutStage, 'id' | 'rolloutPlanId' | 'createdAt'>[] {
  const stages: Omit<PlatformRolloutStage, 'id' | 'rolloutPlanId' | 'createdAt'>[] = [];

  // Stage 1: Internal Only
  stages.push({
    stageKey: ROLLOUT_STAGES.INTERNAL_ONLY.key,
    stageOrder: ROLLOUT_STAGES.INTERNAL_ONLY.order,
    stageStatus: 'pending',
    exposureScope: ROLLOUT_STAGES.INTERNAL_ONLY.exposureScope,
    trafficPercentage: ROLLOUT_STAGES.INTERNAL_ONLY.trafficPercentage,
    stagePayload: {
      description: ROLLOUT_STAGES.INTERNAL_ONLY.description,
      minDurationDays: ROLLOUT_STAGES.INTERNAL_ONLY.minDurationDays,
    },
    startedAt: null,
    completedAt: null,
    pausedAt: null,
  });

  // Stage 2: Limited Production Candidate
  stages.push({
    stageKey: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.key,
    stageOrder: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.order,
    stageStatus: 'pending',
    exposureScope: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.exposureScope,
    trafficPercentage: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.trafficPercentage,
    stagePayload: {
      description: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.description,
      minDurationDays: ROLLOUT_STAGES.LIMITED_PRODUCTION_CANDIDATE.minDurationDays,
    },
    startedAt: null,
    completedAt: null,
    pausedAt: null,
  });

  // Stage 3: Limited Production
  stages.push({
    stageKey: ROLLOUT_STAGES.LIMITED_PRODUCTION.key,
    stageOrder: ROLLOUT_STAGES.LIMITED_PRODUCTION.order,
    stageStatus: 'pending',
    exposureScope: ROLLOUT_STAGES.LIMITED_PRODUCTION.exposureScope,
    trafficPercentage: ROLLOUT_STAGES.LIMITED_PRODUCTION.trafficPercentage,
    stagePayload: {
      description: ROLLOUT_STAGES.LIMITED_PRODUCTION.description,
      minDurationDays: ROLLOUT_STAGES.LIMITED_PRODUCTION.minDurationDays,
    },
    startedAt: null,
    completedAt: null,
    pausedAt: null,
  });

  // Stage 4: Controlled Ramp
  stages.push({
    stageKey: ROLLOUT_STAGES.CONTROLLED_RAMP.key,
    stageOrder: ROLLOUT_STAGES.CONTROLLED_RAMP.order,
    stageStatus: 'pending',
    exposureScope: ROLLOUT_STAGES.CONTROLLED_RAMP.exposureScope,
    trafficPercentage: ROLLOUT_STAGES.CONTROLLED_RAMP.trafficPercentage,
    stagePayload: {
      description: ROLLOUT_STAGES.CONTROLLED_RAMP.description,
      minDurationDays: ROLLOUT_STAGES.CONTROLLED_RAMP.minDurationDays,
    },
    startedAt: null,
    completedAt: null,
    pausedAt: null,
  });

  // Stage 5: Broader Ramp (if full production)
  if (targetEnablementStage === 'full_production') {
    stages.push({
      stageKey: ROLLOUT_STAGES.BROADER_RAMP.key,
      stageOrder: ROLLOUT_STAGES.BROADER_RAMP.order,
      stageStatus: 'pending',
      exposureScope: ROLLOUT_STAGES.BROADER_RAMP.exposureScope,
      trafficPercentage: ROLLOUT_STAGES.BROADER_RAMP.trafficPercentage,
      stagePayload: {
        description: ROLLOUT_STAGES.BROADER_RAMP.description,
        minDurationDays: ROLLOUT_STAGES.BROADER_RAMP.minDurationDays,
      },
      startedAt: null,
      completedAt: null,
      pausedAt: null,
    });
  }

  // Stage 6: Full Production (if target)
  if (targetEnablementStage === 'full_production') {
    stages.push({
      stageKey: ROLLOUT_STAGES.FULL_PRODUCTION.key,
      stageOrder: ROLLOUT_STAGES.FULL_PRODUCTION.order,
      stageStatus: 'pending',
      exposureScope: ROLLOUT_STAGES.FULL_PRODUCTION.exposureScope,
      trafficPercentage: ROLLOUT_STAGES.FULL_PRODUCTION.trafficPercentage,
      stagePayload: {
        description: ROLLOUT_STAGES.FULL_PRODUCTION.description,
        minDurationDays: ROLLOUT_STAGES.FULL_PRODUCTION.minDurationDays,
      },
      startedAt: null,
      completedAt: null,
      pausedAt: null,
    });
  }

  return stages;
}

/**
 * Build rollout checkpoint plan
 */
export function buildRolloutCheckpointPlan(
  stages: Omit<PlatformRolloutStage, 'id' | 'rolloutPlanId' | 'createdAt'>[]
): Omit<PlatformRolloutCheckpoint, 'id' | 'rolloutStageId' | 'createdAt'>[] {
  const checkpoints: Omit<PlatformRolloutCheckpoint, 'id' | 'rolloutStageId' | 'createdAt'>[] = [];

  // Add checkpoints for each stage
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Each stage gets these checkpoints
    const stageCheckpoints = [
      {
        checkpointType: 'support_state_stability' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Verify support state remains stable',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
      {
        checkpointType: 'resolution_quality' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Verify resolution quality meets thresholds',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
      {
        checkpointType: 'no_match_regression' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Check for no-match pattern regressions',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
      {
        checkpointType: 'latency_quality' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Verify latency within acceptable bounds',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
      {
        checkpointType: 'error_quality' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Verify error rates acceptable',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
      {
        checkpointType: 'governance_clearance' as const,
        checkpointStatus: 'pending' as const,
        checkpointPayload: {
          description: 'Verify governance remains cleared',
        },
        guardrailScore: null,
        blockerCount: 0,
        warningCount: 0,
        evaluatedAt: null,
        decision: null,
      },
    ];

    // Add checkpoints to each production-facing stage
    if (stage.exposureScope !== 'internal_only') {
      checkpoints.push(...stageCheckpoints);
    }
  }

  return checkpoints;
}

/**
 * Build rollout owner summary
 */
export function buildRolloutOwnerSummary(
  plan: PlatformRolloutPlan,
  stages: PlatformRolloutStage[]
): {
  currentStage: PlatformRolloutStage | null;
  nextStage: PlatformRolloutStage | null;
  progress: number;
  blockers: string[];
  recommendations: string[];
} {
  const currentStage = stages.find(s => s.stageStatus === 'in_progress') || null;
  const nextStage = stages.find(s => s.stageStatus === 'pending') || null;

  const completedStages = stages.filter(s => s.stageStatus === 'completed').length;
  const progress = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;

  const blockers: string[] = [];
  const recommendations: string[] = [];

  if (!currentStage && plan.rolloutStatus === 'planned') {
    recommendations.push('Start the rollout plan to begin internal enablement');
  }

  if (currentStage) {
    recommendations.push(`Currently in ${currentStage.stageKey} stage`);
  }

  if (nextStage) {
    recommendations.push(`Next: ${nextStage.stageKey}`);
  }

  return {
    currentStage,
    nextStage,
    progress,
    blockers,
    recommendations,
  };
}
