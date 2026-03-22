/**
 * TikTok Shop Session Policy
 * Session hygiene and persistence policy management
 */

import type { TikTokShopSessionPolicy, TikTokShopRuntimeSafetyProfile } from '../types.js';
import { TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Build session policy
 */
export function buildTikTokShopSessionPolicy(
  sessionId: string,
  safetyProfile: TikTokShopRuntimeSafetyProfile
): TikTokShopSessionPolicy {
  return {
    sessionId,
    createdAt: new Date(),
    requestCount: 0,
    lastRequestAt: undefined,
    isHealthy: true,
    healthScore: 1,
  };
}

/**
 * Validate session usage
 */
export function validateTikTokShopSessionUsage(
  session: TikTokShopSessionPolicy,
  safetyProfile: TikTokShopRuntimeSafetyProfile
): {
  isValid: boolean;
  reason?: string;
} {
  // Check if session is healthy
  if (!session.isHealthy) {
    return { isValid: false, reason: 'Session marked as unhealthy' };
  }

  // Check if session has expired
  const now = Date.now();
  const sessionAge = now - session.createdAt.getTime();

  if (sessionAge > safetyProfile.sessionTimeoutMs) {
    return { isValid: false, reason: 'Session timeout exceeded' };
  }

  // Check if session has too many requests
  if (session.requestCount >= safetyProfile.recycleAfterRequests) {
    return { isValid: false, reason: 'Session request limit reached' };
  }

  // Check idle timeout
  if (session.lastRequestAt) {
    const idleTime = now - session.lastRequestAt.getTime();

    if (idleTime > TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.IDLE_SESSION_TIMEOUT_MS) {
      return { isValid: false, reason: 'Session idle timeout exceeded' };
    }
  }

  return { isValid: true };
}

/**
 * Determine if session should be recycled
 */
export function shouldRecycleTikTokShopSession(
  session: TikTokShopSessionPolicy,
  safetyProfile: TikTokShopRuntimeSafetyProfile
): {
  shouldRecycle: boolean;
  reason?: string;
} {
  // Check request count
  if (session.requestCount >= safetyProfile.recycleAfterRequests) {
    return { shouldRecycle: true, reason: 'Request limit reached' };
  }

  // Check health score
  if (session.healthScore < 0.5) {
    return { shouldRecycle: true, reason: 'Health score too low' };
  }

  // Check if not healthy
  if (!session.isHealthy) {
    return { shouldRecycle: true, reason: 'Session unhealthy' };
  }

  return { shouldRecycle: false };
}

/**
 * Build session health summary
 */
export function buildTikTokShopSessionHealthSummary(
  session: TikTokShopSessionPolicy
): {
  sessionId: string;
  isHealthy: boolean;
  healthScore: number;
  requestCount: number;
  sessionAge: number;
  idleTime?: number;
  recommendations: string[];
} {
  const now = Date.now();
  const sessionAge = now - session.createdAt.getTime();
  const idleTime = session.lastRequestAt ? now - session.lastRequestAt.getTime() : undefined;

  const recommendations: string[] = [];

  if (session.requestCount > 40) {
    recommendations.push('Session approaching request limit - consider recycling soon');
  }

  if (session.healthScore < 0.7) {
    recommendations.push('Session health degraded - monitor closely');
  }

  if (idleTime && idleTime > 180000) {
    recommendations.push('Session idle for extended period - consider recycling');
  }

  return {
    sessionId: session.sessionId,
    isHealthy: session.isHealthy,
    healthScore: session.healthScore,
    requestCount: session.requestCount,
    sessionAge,
    idleTime,
    recommendations,
  };
}

/**
 * Update session after request
 */
export function updateTikTokShopSessionAfterRequest(
  session: TikTokShopSessionPolicy,
  success: boolean,
  responseTime?: number
): TikTokShopSessionPolicy {
  const now = Date.now();

  // Update request count
  const newRequestCount = session.requestCount + 1;

  // Calculate new health score
  let newHealthScore = session.healthScore;

  if (success) {
    // Improve health for successful requests
    newHealthScore = Math.min(1, newHealthScore + 0.01);
  } else {
    // Degrade health for failed requests
    newHealthScore = Math.max(0, newHealthScore - 0.1);
  }

  // Consider response time if provided
  if (responseTime) {
    if (responseTime > 15000) {
      newHealthScore = Math.max(0, newHealthScore - 0.05); // Slow response
    } else if (responseTime < 5000) {
      newHealthScore = Math.min(1, newHealthScore + 0.02); // Fast response
    }
  }

  return {
    ...session,
    requestCount: newRequestCount,
    lastRequestAt: new Date(),
    healthScore: newHealthScore,
    isHealthy: newHealthScore >= 0.3,
  };
}

/**
 * Mark session as unhealthy
 */
export function markTikTokShopSessionUnhealthy(
  session: TikTokShopSessionPolicy,
  reason: string
): TikTokShopSessionPolicy {
  logger.warn({ msg: 'Marking session unhealthy', sessionId: session.sessionId, reason });

  return {
    ...session,
    isHealthy: false,
    healthScore: Math.max(0, session.healthScore - 0.3),
  };
}
