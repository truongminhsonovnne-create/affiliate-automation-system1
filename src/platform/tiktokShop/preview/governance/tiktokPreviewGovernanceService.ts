/**
 * TikTok Shop Preview Governance Service
 *
 * Governance service for preview layer management.
 */

import { tiktokMonetizationGovernanceRepository, tiktokPreviewBacklogRepository } from '../repositories/tiktokMonetizationGovernanceRepository.js';
import type {
  TikTokShopPreviewGovernanceSummary,
  TikTokShopMonetizationGovernanceAction,
  TikTokShopPreviewBacklogItem,
  TikTokShopMonetizationEnablementStage,
} from '../types.js';
import { MONETIZATION_STAGES } from '../constants.js';
import logger from '../../../../utils/logger.js';

/**
 * Run preview governance review
 */
export async function runTikTokPreviewGovernanceReview(): Promise<TikTokShopPreviewGovernanceSummary> {
  logger.info({ msg: 'Running TikTok preview governance review' });

  // Get current stage
  const currentStage = await getCurrentMonetizationStage();

  // Get recent actions
  const recentActions = await tiktokMonetizationGovernanceRepository.getRecentActions(20);

  // Get pending actions
  const pendingActions = await tiktokMonetizationGovernanceRepository.getPendingActions(10);

  // Get open blockers
  const openItems = await tiktokPreviewBacklogRepository.getOpenItems(50);
  const criticalItems = await tiktokPreviewBacklogRepository.getCriticalItems(10);

  // Determine risk level
  const riskLevel = determineRiskLevel(currentStage, openItems, criticalItems);

  const summary: TikTokShopPreviewGovernanceSummary = {
    currentStage,
    stageHistory: recentActions,
    recentActions: recentActions.slice(0, 10),
    pendingActions,
    openBlockers: criticalItems,
    riskLevel,
  };

  logger.info({
    msg: 'TikTok preview governance review complete',
    currentStage,
    riskLevel,
    openBlockers: criticalItems.length,
  });

  return summary;
}

/**
 * Build preview governance summary
 */
export function buildTikTokPreviewGovernanceSummary(
  summary: TikTokShopPreviewGovernanceSummary
): Record<string, unknown> {
  return {
    currentStage: summary.currentStage,
    riskLevel: summary.riskLevel,
    recentActionCount: summary.recentActions.length,
    pendingActionCount: summary.pendingActions.length,
    openBlockerCount: summary.openBlockers.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create governance action
 */
export async function createTikTokPreviewGovernanceAction(
  actionType: string,
  payload: Record<string, unknown>,
  rationale?: string,
  actorId?: string,
  actorRole?: string
): Promise<TikTokShopMonetizationGovernanceAction> {
  logger.info({ msg: 'Creating TikTok preview governance action', actionType });

  const action = await tiktokMonetizationGovernanceRepository.createAction({
    actionType: actionType as TikTokShopMonetizationGovernanceAction['actionType'],
    actionPayload: payload,
    rationale,
    actorId,
    actorRole,
  });

  return action;
}

/**
 * Mark preview needs hold
 */
export async function markTikTokPreviewNeedsHold(
  reason: string,
  actorId?: string
): Promise<TikTokShopMonetizationGovernanceAction> {
  return createTikTokPreviewGovernanceAction(
    'hold_monetization',
    { reason, timestamp: new Date().toISOString() },
    reason,
    actorId,
    'system'
  );
}

/**
 * Get current monetization stage
 */
export async function getCurrentMonetizationStage(): Promise<TikTokShopMonetizationEnablementStage> {
  // Get latest executed action
  const recentActions = await tiktokMonetizationGovernanceRepository.getRecentActions(50);

  const executedActions = recentActions.filter(
    (a) => a.actionStatus === 'executed' || a.actionStatus === 'approved'
  );

  // Find the most recent stage-setting action
  const stageActions = executedActions.filter((a) => {
    const type = a.actionType;
    return (
      type === 'enable_sandbox_monetization' ||
      type === 'enable_preview_monetization' ||
      type === 'enable_production_monetization' ||
      type === 'hold_monetization' ||
      type === 'rollback_monetization' ||
      type === 'extend_preview'
    );
  });

  if (stageActions.length === 0) {
    return MONETIZATION_STAGES.DISABLED;
  }

  // Map action to stage
  const latestAction = stageActions[0];

  switch (latestAction.actionType) {
    case 'enable_production_monetization':
      return MONETIZATION_STAGES.PRODUCTION_ENABLED;
    case 'enable_preview_monetization':
      return MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW;
    case 'enable_sandbox_monetization':
      return MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION;
    case 'hold_monetization':
      return MONETIZATION_STAGES.DISABLED;
    case 'rollback_monetization':
      return MONETIZATION_STAGES.DISABLED;
    case 'extend_preview':
      return MONETIZATION_STAGES.PREVIEW_SIGNAL_COLLECTION;
    default:
      return MONETIZATION_STAGES.DISABLED;
  }
}

/**
 * Determine risk level
 */
function determineRiskLevel(
  currentStage: TikTokShopMonetizationEnablementStage,
  openItems: TikTokShopPreviewBacklogItem[],
  criticalItems: TikTokShopPreviewBacklogItem[]
): 'low' | 'medium' | 'high' {
  // High risk if many critical items
  if (criticalItems.length >= 5) return 'high';

  // Medium risk if critical items exist or many open items
  if (criticalItems.length > 0 || openItems.length >= 10) return 'medium';

  // Low risk if production enabled with no issues
  if (currentStage === MONETIZATION_STAGES.PRODUCTION_ENABLED && criticalItems.length === 0) {
    return 'low';
  }

  // Default to medium for preview stages
  return 'medium';
}

/**
 * Get governance status
 */
export async function getTikTokPreviewGovernanceStatus(): Promise<{
  currentStage: TikTokShopMonetizationEnablementStage;
  canEnableMonetization: boolean;
  canProceedToProduction: boolean;
  blockers: TikTokShopPreviewBacklogItem[];
}> {
  const currentStage = await getCurrentMonetizationStage();
  const criticalItems = await tiktokPreviewBacklogRepository.getCriticalItems(10);

  const canEnableMonetization =
    currentStage !== MONETIZATION_STAGES.PRODUCTION_ENABLED &&
    criticalItems.length === 0;

  const canProceedToProduction =
    currentStage === MONETIZATION_STAGES.LIMITED_MONETIZATION_PREVIEW &&
    criticalItems.length === 0;

  return {
    currentStage,
    canEnableMonetization,
    canProceedToProduction,
    blockers: criticalItems,
  };
}
