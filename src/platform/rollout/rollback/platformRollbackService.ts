/**
 * Platform Rollback Service
 *
 * Handles rollback operations for platform rollout.
 */

import type { PlatformRollbackAction, PlatformRolloutPlan, PlatformRolloutStage } from '../types/index.js';
import { platformRolloutPlanRepository } from '../repositories/platformRolloutPlanRepository.js';
import { ROLLBACK_TRIGGERS } from '../constants.js';
import logger from '../../../utils/logger.js';

/**
 * Rollback platform to previous stage
 */
export async function rollbackPlatformToPreviousStage(
  platformKey: string,
  rationale: string,
  actorId?: string
): Promise<{ success: boolean; rollback: PlatformRollbackAction | null; error?: string }> {
  logger.info({ msg: 'Rolling back platform to previous stage', platformKey, rationale });

  try {
    const plan = await platformRolloutPlanRepository.getPlanByPlatform(platformKey);
    if (!plan) {
      return { success: false, rollback: null, error: 'No active rollout plan' };
    }

    // Determine previous stage
    const previousStageKey = getPreviousStage(plan.targetEnablementStage);

    const rollback: PlatformRollbackAction = {
      id: crypto.randomUUID(),
      rolloutPlanId: plan.id,
      fromStageKey: plan.targetEnablementStage,
      toStageKey: previousStageKey,
      rollbackType: 'previous_stage',
      rollbackStatus: 'completed',
      rollbackPayload: {},
      rationale,
      triggerConditions: [],
      actorId: actorId || null,
      actorRole: null,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    // Update plan status
    await platformRolloutPlanRepository.updatePlanStatus(plan.id, 'rolled_back');

    logger.info({ msg: 'Platform rolled back', platformKey, toStage: previousStageKey });

    return { success: true, rollback };
  } catch (error) {
    logger.error({ msg: 'Rollback failed', platformKey, error });
    return { success: false, rollback: null, error: String(error) };
  }
}

/**
 * Rollback platform to preview only
 */
export async function rollbackPlatformToPreviewOnly(
  platformKey: string,
  rationale: string,
  actorId?: string
): Promise<{ success: boolean; rollback: PlatformRollbackAction | null; error?: string }> {
  logger.info({ msg: 'Rolling back platform to preview only', platformKey, rationale });

  try {
    const plan = await platformRolloutPlanRepository.getPlanByPlatform(platformKey);
    if (!plan) {
      return { success: false, rollback: null, error: 'No active rollout plan' };
    }

    const rollback: PlatformRollbackAction = {
      id: crypto.randomUUID(),
      rolloutPlanId: plan.id,
      fromStageKey: plan.targetEnablementStage,
      toStageKey: 'limited_public_preview',
      rollbackType: 'preview_only',
      rollbackStatus: 'completed',
      rollbackPayload: {},
      rationale,
      triggerConditions: [],
      actorId: actorId || null,
      actorRole: null,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    await platformRolloutPlanRepository.updatePlanStatus(plan.id, 'rolled_back');

    return { success: true, rollback };
  } catch (error) {
    return { success: false, rollback: null, error: String(error) };
  }
}

/**
 * Build rollback decision support
 */
export function buildRollbackDecisionSupport(
  guardrailScore: number,
  blockers: string[],
  triggers: string[]
): {
  shouldRollback: boolean;
  rollbackType: 'previous_stage' | 'preview_only' | 'monetization_only' | null;
  rationale: string;
} {
  const shouldRollback = guardrailScore < ROLLBACK_TRIGGERS.STABILITY_SCORE_MIN ||
    blockers.length >= 3 ||
    triggers.length >= 2;

  let rollbackType: 'previous_stage' | 'preview_only' | 'monetization_only' | null = null;
  let rationale = '';

  if (shouldRollback) {
    if (guardrailScore < 30) {
      rollbackType = 'preview_only';
      rationale = `Critical guardrail breach: score ${guardrailScore}%`;
    } else if (blockers.length >= 3) {
      rollbackType = 'previous_stage';
      rationale = `${blockers.length} blockers present`;
    } else {
      rollbackType = 'previous_stage';
      rationale = `Multiple trigger conditions: ${triggers.join(', ')}`;
    }
  }

  return { shouldRollback, rollbackType, rationale };
}

function getPreviousStage(currentStage: string): string {
  const stageOrder: Record<string, string> = {
    'full_production': 'broader_ramp',
    'broader_ramp': 'controlled_ramp',
    'controlled_ramp': 'limited_production',
    'limited_production': 'limited_production_candidate',
    'limited_production_candidate': 'internal_only',
    'internal_only': 'disabled',
  };
  return stageOrder[currentStage] || 'disabled';
}
