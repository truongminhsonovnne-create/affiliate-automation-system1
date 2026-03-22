/**
 * TikTok Shop Acquisition Governance
 * Governance decisions for acquisition rollout
 */

import type { TikTokShopAcquisitionGovernance } from '../types.js';
import { TIKTOK_SHOP_GOVERNANCE_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Evaluate acquisition governance
 */
export async function evaluateTikTokShopAcquisitionGovernance(
  health: {
    healthScore: number;
    errorRate: number;
    consecutiveFailures: number;
  }
): Promise<TikTokShopAcquisitionGovernance> {
  logger.info({ msg: 'Evaluating TikTok Shop acquisition governance', health });

  const canRunDiscovery = shouldAllowOperation(health, 'discovery');
  const canRunDetail = shouldAllowOperation(health, 'detail');
  const shouldThrottle = shouldThrottleTikTokShopAcquisition(health);
  const shouldPause = shouldPauseTikTokShopAcquisition(health);

  let recommendation: 'proceed' | 'throttle' | 'pause' | 'stop';

  if (shouldPause) {
    recommendation = 'pause';
  } else if (shouldThrottle) {
    recommendation = 'throttle';
  } else if (canRunDiscovery && canRunDetail) {
    recommendation = 'proceed';
  } else {
    recommendation = 'stop';
  }

  const reasons: string[] = [];

  if (!canRunDiscovery) {
    reasons.push('Discovery not allowed - health too low');
  }
  if (!canRunDetail) {
    reasons.push('Detail extraction not allowed - health too low');
  }
  if (shouldThrottle) {
    reasons.push('Throttling enabled due to elevated error rate');
  }
  if (shouldPause) {
    reasons.push('Paused due to critical error rate or failures');
  }

  return {
    canRunDiscovery,
    canRunDetail,
    shouldThrottle,
    shouldPause,
    recommendation,
    reasons,
    maxConcurrentJobs: TIKTOK_SHOP_GOVERNANCE_CONFIG.MAX_CONCURRENCY,
  };
}

/**
 * Check if should throttle acquisition
 */
export function shouldThrottleTikTokShopAcquisition(
  health: { healthScore: number; errorRate: number }
): boolean {
  return (
    health.healthScore < TIKTOK_SHOP_GOVERNANCE_CONFIG.THROTTLE_ON_HEALTH_BELOW ||
    health.errorRate > TIKTOK_SHOP_GOVERNANCE_CONFIG.THROTTLE_ON_ERROR_RATE_ABOVE
  );
}

/**
 * Check if should pause acquisition
 */
export function shouldPauseTikTokShopAcquisition(
  health: { healthScore: number; errorRate: number; consecutiveFailures: number }
): boolean {
  return (
    health.healthScore < TIKTOK_SHOP_GOVERNANCE_CONFIG.PAUSE_ON_HEALTH_BELOW ||
    health.errorRate > TIKTOK_SHOP_GOVERNANCE_CONFIG.PAUSE_ON_ERROR_RATE_ABOVE ||
    health.consecutiveFailures >= TIKTOK_SHOP_GOVERNANCE_CONFIG.PAUSE_ON_CONSECUTIVE_FAILURES
  );
}

/**
 * Build acquisition governance decision
 */
export function buildTikTokShopAcquisitionGovernanceDecision(
  governance: TikTokShopAcquisitionGovernance
): {
  decision: string;
  canProceed: boolean;
  action: string;
} {
  let action = 'continue_normal';

  if (governance.shouldPause) {
    action = 'pause_acquisition';
  } else if (governance.shouldThrottle) {
    action = 'throttle_acquisition';
  }

  return {
    decision: governance.recommendation,
    canProceed: governance.recommendation === 'proceed',
    action,
  };
}

function shouldAllowOperation(
  health: { healthScore: number; errorRate: number },
  _operation: 'discovery' | 'detail'
): boolean {
  return (
    health.healthScore >= TIKTOK_SHOP_GOVERNANCE_CONFIG.PAUSE_ON_HEALTH_BELOW &&
    health.errorRate <= TIKTOK_SHOP_GOVERNANCE_CONFIG.PAUSE_ON_ERROR_RATE_ABOVE
  );
}
