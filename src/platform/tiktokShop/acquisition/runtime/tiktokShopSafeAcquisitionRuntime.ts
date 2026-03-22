/**
 * TikTok Shop Safe Acquisition Runtime
 * Production-grade safe acquisition runtime with failure isolation
 */

import type {
  TikTokShopAcquisitionRuntimeProfile,
  TikTokShopRuntimeSafetyProfile,
  TikTokShopSessionPolicy,
  TikTokShopRuntimeHealthSnapshot,
  TikTokShopRuntimeHealthStatus,
} from '../types.js';
import { TikTokShopRuntimeHealthStatus, TikTokShopRuntimeRole } from '../types.js';
import { TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG } from '../constants.js';
import { buildTikTokShopRuntimeProfile, buildTikTokShopRuntimeSafetyProfile, buildTikTokShopRuntimeIdentity } from './tiktokShopRuntimeProfile.js';
import { logger } from '../../../../utils/logger.js';

export interface TikTokShopSafeRuntime {
  runtimeId: string;
  profile: TikTokShopAcquisitionRuntimeProfile;
  safetyProfile: TikTokShopRuntimeSafetyProfile;
  session: TikTokShopSessionPolicy | null;
  stats: TikTokShopRuntimeStats;
}

export interface TikTokShopRuntimeStats {
  requestsTotal: number;
  requestsSuccess: number;
  requestsFailed: number;
  requestsThrottled: number;
  sessionRecycles: number;
  startedAt: Date;
  lastRequestAt?: Date;
}

let activeRuntime: TikTokShopSafeRuntime | null = null;

/**
 * Create safe acquisition runtime
 */
export async function createTikTokShopSafeAcquisitionRuntime(
  role: TikTokShopRuntimeRole,
  mode: 'browser' | 'api' | 'hybrid' = 'browser'
): Promise<TikTokShopSafeRuntime> {
  logger.info({ msg: 'Creating TikTok Shop safe acquisition runtime', role, mode });

  const profile = buildTikTokShopRuntimeProfile(role, mode as any);
  const safetyProfile = buildTikTokShopRuntimeSafetyProfile(role);
  const identity = buildTikTokShopRuntimeIdentity(role);

  const runtime: TikTokShopSafeRuntime = {
    runtimeId: identity.runtimeId,
    profile,
    safetyProfile,
    session: null,
    stats: {
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsFailed: 0,
      requestsThrottled: 0,
      sessionRecycles: 0,
      startedAt: new Date(),
    },
  };

  activeRuntime = runtime;

  logger.info({
    msg: 'TikTok Shop safe acquisition runtime created',
    runtimeId: runtime.runtimeId,
    profile: runtime.profile,
  });

  return runtime;
}

/**
 * Run runtime session with safe execution
 */
export async function runTikTokShopRuntimeSession<T>(
  runtime: TikTokShopSafeRuntime,
  operation: () => Promise<T>,
  options?: {
    operationName?: string;
    timeout?: number;
  }
): Promise<{ success: boolean; result?: T; error?: Error; duration: number }> {
  const startTime = Date.now();
  const operationName = options?.operationName || 'operation';

  logger.debug({ msg: 'Starting runtime session', runtimeId: runtime.runtimeId, operationName });

  try {
    // Check if runtime should be throttled
    if (shouldThrottle(runtime)) {
      runtime.stats.requestsThrottled++;
      throw new Error('Runtime throttled - too many requests');
    }

    // Execute operation
    const result = await operation();

    // Update stats
    runtime.stats.requestsTotal++;
    runtime.stats.requestsSuccess++;
    runtime.stats.lastRequestAt = new Date();

    const duration = Date.now() - startTime;

    logger.debug({
      msg: 'Runtime session completed',
      runtimeId: runtime.runtimeId,
      operationName,
      duration,
      success: true,
    });

    return { success: true, result, duration };
  } catch (error) {
    runtime.stats.requestsTotal++;
    runtime.stats.requestsFailed++;

    const duration = Date.now() - startTime;

    logger.error({
      msg: 'Runtime session failed',
      runtimeId: runtime.runtimeId,
      operationName,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
      duration,
    };
  }
}

/**
 * Shutdown runtime gracefully
 */
export async function shutdownTikTokShopRuntime(runtime: TikTokShopSafeRuntime): Promise<void> {
  logger.info({ msg: 'Shutting down TikTok Shop runtime', runtimeId: runtime.runtimeId });

  // Log final stats
  logger.info({
    msg: 'Runtime shutdown stats',
    runtimeId: runtime.runtimeId,
    stats: runtime.stats,
    uptime: Date.now() - runtime.stats.startedAt.getTime(),
  });

  // Clean up session if exists
  if (runtime.session) {
    runtime.session = null;
  }

  // Clear active runtime
  if (activeRuntime?.runtimeId === runtime.runtimeId) {
    activeRuntime = null;
  }

  logger.info({ msg: 'TikTok Shop runtime shutdown complete', runtimeId: runtime.runtimeId });
}

/**
 * Build runtime health snapshot
 */
export function buildTikTokShopRuntimeHealthSnapshot(
  runtime: TikTokShopSafeRuntime
): TikTokShopRuntimeHealthSnapshot {
  const now = Date.now();
  const uptime = now - runtime.stats.startedAt.getTime();

  // Calculate health metrics
  const successRate = runtime.stats.requestsTotal > 0
    ? runtime.stats.requestsSuccess / runtime.stats.requestsTotal
    : 1;

  const errorRate = runtime.stats.requestsTotal > 0
    ? runtime.stats.requestsFailed / runtime.stats.requestsTotal
    : 0;

  // Determine health status
  let healthStatus: TikTokShopRuntimeHealthStatus;

  if (errorRate > 0.3) {
    healthStatus = TikTokShopRuntimeHealthStatus.UNHEALTHY;
  } else if (errorRate > 0.15 || successRate < 0.7) {
    healthStatus = TikTokShopRuntimeHealthStatus.DEGRADED;
  } else if (runtime.stats.requestsThrottled > runtime.stats.requestsSuccess * 0.5) {
    healthStatus = TikTokShopRuntimeHealthStatus.PAUSED;
  } else {
    healthStatus = TikTokShopRuntimeHealthStatus.HEALTHY;
  }

  return {
    id: `snapshot-${Date.now()}`,
    runtimeRole: runtime.profile.role,
    healthStatus,
    snapshotPayload: {
      runtimeId: runtime.runtimeId,
      uptime,
      successRate,
      errorRate,
      stats: runtime.stats,
      profile: runtime.profile,
    },
    createdAt: new Date(),
  };
}

/**
 * Check if runtime should throttle
 */
function shouldThrottle(runtime: TikTokShopSafeRuntime): boolean {
  const now = Date.now();

  // Check if we have a recent request
  if (runtime.stats.lastRequestAt) {
    const timeSinceLastRequest = now - runtime.stats.lastRequestAt.getTime();
    const minDelay = runtime.safetyProfile.requestDelayMs;

    if (timeSinceLastRequest < minDelay) {
      return true;
    }
  }

  // Check if we've exceeded rate limits
  const requestsInLastMinute = runtime.stats.requestsTotal; // Simplified - would need sliding window in production

  if (requestsInLastMinute >= runtime.safetyProfile.maxRequestsPerMinute) {
    return true;
  }

  return false;
}

/**
 * Get active runtime
 */
export function getActiveTikTokShopRuntime(): TikTokShopSafeRuntime | null {
  return activeRuntime;
}

/**
 * Update session policy
 */
export function updateTikTokShopSessionPolicy(
  runtime: TikTokShopSafeRuntime,
  policy: Partial<TikTokShopSessionPolicy>
): void {
  if (runtime.session) {
    runtime.session = { ...runtime.session, ...policy };
  } else {
    runtime.session = {
      sessionId: policy.sessionId || `session-${Date.now()}`,
      createdAt: new Date(),
      requestCount: 0,
      isHealthy: true,
      healthScore: 1,
      ...policy,
    };
  }
}

/**
 * Increment session request count
 */
export function incrementTikTokShopSessionRequests(runtime: TikTokShopSafeRuntime): void {
  if (runtime.session) {
    runtime.session.requestCount++;

    // Check if session should be recycled
    if (runtime.session.requestCount >= runtime.safetyProfile.recycleAfterRequests) {
      runtime.stats.sessionRecycles++;
      runtime.session.requestCount = 0;
      logger.info({ msg: 'Session recycled due to request limit', runtimeId: runtime.runtimeId });
    }
  }
}

/**
 * Validate session health
 */
export function validateTikTokShopSessionHealth(runtime: TikTokShopSafeRuntime): boolean {
  if (!runtime.session) {
    return false;
  }

  // Check if session is healthy
  if (!runtime.session.isHealthy) {
    return false;
  }

  // Check session timeout
  const now = Date.now();
  const sessionAge = now - runtime.session.createdAt.getTime();

  if (sessionAge > runtime.safetyProfile.sessionTimeoutMs) {
    return false;
  }

  // Check idle timeout
  if (runtime.session.lastRequestAt) {
    const idleTime = now - runtime.session.lastRequestAt.getTime();
    if (idleTime > TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.IDLE_SESSION_TIMEOUT_MS) {
      return false;
    }
  }

  return true;
}
