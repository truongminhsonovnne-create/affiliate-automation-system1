/**
 * TikTok Shop Monetization Enablement Service
 *
 * Manages staged monetization enablement decisions.
 */

import { tiktokMonetizationGovernanceRepository } from '../repositories/tiktokMonetizationGovernanceRepository.js';
import type {
  TikTokShopMonetizationGovernanceAction,
  TikTokShopPreviewDecisionSupport,
  TikTokShopMonetizationEnablementStage,
} from '../types.js';
import { MONETIZATION_STAGES, GOVERNANCE_CONFIG } from '../constants.js';
import logger from '../../../../utils/logger.js';

/**
 * Evaluate monetization enablement
 */
export async function evaluateTikTokMonetizationEnablement(
  readinessScore: number,
  blockersCount: number,
  warningsCount: number,
  currentStage: TikTokShopMonetizationEnablementStage
): Promise<{
  canProceed: boolean;
  recommendedStage: TikTokShopMonetizationEnablementStage;
  reasons: string[];
}> {
  logger.info({
    msg: 'Evaluating TikTok monetization enablement',
    readinessScore,
    blockersCount,
    currentStage,
  });

  const reasons: string[] = [];
  let canProceed = false;
  let recommendedStage = currentStage;

  // Cannot proceed with blockers
  if (blockersCount > 0) {
    reasons.push('Blockers must be resolved before proceeding');
    canProceed = false;
    recommendedStage = MONETIZATION_STAGES.DISABLED;
  } else if (readinessScore >= 80) {
    // High readiness - can proceed to production
    canProceed = true;
    if (currentStage === MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW) {
      recommendedStage = MONETIZATION_STAGES.PRODUCTION_CANDIDATE;
      reasons.push('High readiness score supports production candidate');
    } else if (currentStage === MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION) {
      recommendedStage = MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW;
      reasons.push('Good readiness supports limited monetization preview');
    } else if (currentStage === MONETIZATION_STAGES.DISABLED) {
      recommendedStage = MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION;
      reasons.push('Baseline readiness supports signal collection');
    }
  } else if (readinessScore >= 60) {
    // Medium readiness - proceed cautiously
    canProceed = true;
    if (currentStage === MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW) {
      recommendedStage = MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW;
      reasons.push('Maintain limited preview with caution');
    } else if (currentStage === MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION) {
      recommendedStage = MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION;
      reasons.push('Maintain signal collection with caution');
    } else {
      recommendedStage = MONETIZATION_STAGES.INTERNAL_VALIDATION_ONLY;
      reasons.push('Proceed with internal validation only');
    }
  } else {
    // Low readiness - hold
    canProceed = false;
    recommendedStage = MONETIZATION_STAGES.DISABLED;
    reasons.push('Readiness score too low for monetization');
  }

  // Check warnings
  if (warningsCount > 5) {
    reasons.push(`Warning: ${warningsCount} warnings should be addressed`);
  }

  return { canProceed, recommendedStage, reasons };
}

/**
 * Approve monetization stage
 */
export async function approveTikTokMonetizationStage(
  targetStage: TikTokShopMonetizationEnablementStage,
  actorId: string,
  rationale?: string
): Promise<TikTokShopMonetizationGovernanceAction> {
  logger.info({ msg: 'Approving TikTok monetization stage', targetStage, actorId });

  // Determine action type based on stage
  let actionType: string;
  switch (targetStage) {
    case MONETIZATION_STAGES.INTERNAL_VALIDATION_ONLY:
      actionType = 'enable_sandbox_monetization';
      break;
    case MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION:
      actionType = 'enable_sandbox_monetization';
      break;
    case MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW:
      actionType = 'enable_preview_monetization';
      break;
    case MONETIZATION_STAGES.PRODUCTION_CANDIDATE:
    case MONETIZATION_STAGES.PRODUCTION_ENABLED:
      actionType = 'enable_production_monetization';
      break;
    default:
      actionType = 'request_review';
  }

  const action = await tiktokMonetizationGovernanceRepository.createAction({
    actionType: actionType as TikTokShopMonetizationGovernanceAction['actionType'],
    targetEntityType: 'monetization_stage',
    targetEntityId: targetStage,
    actionPayload: { targetStage },
    rationale: rationale || `Approving stage: ${targetStage}`,
    actorId,
    actorRole: 'admin',
  });

  // Execute immediately (auto-approve for now)
  await tiktokMonetizationGovernanceRepository.executeAction(action.id);

  logger.info({ msg: 'TikTok monetization stage approved', actionId: action.id, targetStage });

  return action;
}

/**
 * Hold monetization
 */
export async function holdTikTokMonetizationStage(
  reason: string,
  actorId: string
): Promise<TikTokShopMonetizationGovernanceAction> {
  logger.info({ msg: 'Holding TikTok monetization', reason, actorId });

  const action = await tiktokMonetizationGovernanceRepository.createAction({
    actionType: 'hold_monetization',
    targetEntityType: 'monetization',
    actionPayload: { reason },
    rationale: reason,
    actorId,
    actorRole: 'system',
  });

  await tiktokMonetizationGovernanceRepository.executeAction(action.id);

  logger.info({ msg: 'TikTok monetization held', actionId: action.id });

  return action;
}

/**
 * Rollback monetization stage
 */
export async function rollbackTikTokMonetizationStage(
  targetStage: TikTokShopMonetizationEnablementStage,
  reason: string,
  actorId: string
): Promise<TikTokShopMonetizationGovernanceAction> {
  logger.info({ msg: 'Rolling back TikTok monetization', targetStage, reason, actorId });

  const action = await tiktokMonetizationGovernanceRepository.createAction({
    actionType: 'rollback_monetization',
    targetEntityType: 'monetization_stage',
    targetEntityId: targetStage,
    actionPayload: { targetStage, reason },
    rationale: reason,
    actorId,
    actorRole: 'admin',
  });

  await tiktokMonetizationGovernanceRepository.executeAction(action.id);

  logger.info({ msg: 'TikTok monetization rolled back', actionId: action.id, targetStage });

  return action;
}

/**
 * Build monetization decision support
 */
export async function buildTikTokMonetizationDecisionSupport(
  readinessScore: number,
  blockersCount: number,
  warningsCount: number,
  currentStage: TikTokShopMonetizationEnablementStage,
  stabilityScore: number,
  usefulnessScore: number,
  lineageConfidence: number
): Promise<TikTokShopPreviewDecisionSupport> {
  // Evaluate enablement
  const { canProceed, recommendedStage, reasons } = await evaluateTikTokMonetizationEnablement(
    readinessScore,
    blockersCount,
    warningsCount,
    currentStage
  );

  // Determine recommendation
  let recommendation: 'hold' | 'extend_preview' | 'proceed_cautiously' | 'proceed_to_production';

  if (!canProceed || blockersCount > 0) {
    recommendation = 'hold';
  } else if (readinessScore >= 80 && currentStage === MONETIZATION_STATES.LIMITED_MONETIZATION_PREVIEW) {
    recommendation = 'proceed_to_production';
  } else if (readinessScore >= 60) {
    recommendation = 'proceed_cautiously';
  } else {
    recommendation = 'extend_preview';
  }

  // Build evidence
  const evidence: Record<string, unknown> = {
    readinessScore,
    blockersCount,
    warningsCount,
    currentStage,
    stabilityScore,
    usefulnessScore,
    lineageConfidence,
    reasons,
    canProceed,
    recommendedStage,
  };

  // Build next steps
  const nextSteps: string[] = [];

  if (recommendation === 'hold') {
    nextSteps.push('Address all blockers');
    nextSteps.push('Review stability and usefulness metrics');
    nextSteps.push('Re-evaluate after improvements');
  } else if (recommendation === 'extend_preview') {
    nextSteps.push('Continue preview data collection');
    nextSteps.push('Address warnings');
    nextSteps.push('Re-evaluate in next cycle');
  } else if (recommendation === 'proceed_cautiously') {
    nextSteps.push('Enable limited monetization');
    nextSteps.push('Monitor closely');
    nextSteps.push('Address warnings');
    nextSteps.push('Plan production transition');
  } else if (recommendation === 'proceed_to_production') {
    nextSteps.push('Prepare production infrastructure');
    nextSteps.push('Notify stakeholders');
    nextSteps.push('Enable full monetization');
    nextSteps.push('Monitor revenue metrics');
  }

  // Identify blockers and warnings
  const blockers = [];
  const warnings = [];

  if (blockersCount > 0) {
    blockers.push({
      code: 'ACTIVE_BLOCKERS',
      message: `${blockersCount} blockers must be resolved`,
      severity: 'critical' as const,
      category: 'governance_gap',
    });
  }

  if (readinessScore < 60) {
    warnings.push({
      code: 'LOW_READINESS',
      message: `Readiness score (${readinessScore}) below threshold`,
      severity: 'high' as const,
      category: 'quality_issue',
    });
  }

  if (stabilityScore < 60) {
    warnings.push({
      code: 'LOW_STABILITY',
      message: `Stability score (${stabilityScore}) below threshold`,
      severity: 'high' as const,
      category: 'stability_issue',
    });
  }

  if (lineageConfidence < 0.5) {
    warnings.push({
      code: 'LOW_LINEAGE_CONFIDENCE',
      message: `Lineage confidence (${(lineageConfidence * 100).toFixed(0)}%) below threshold`,
      severity: 'medium' as const,
      category: 'lineage_gap',
    });
  }

  return {
    recommendation,
    summary: reasons.join('; ') || 'Evaluation complete',
    evidence,
    nextSteps,
    blockers,
    warnings,
  };
}
