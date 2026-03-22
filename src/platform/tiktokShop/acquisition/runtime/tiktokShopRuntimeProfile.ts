/**
 * TikTok Shop Runtime Profile
 * Defines runtime profile for TikTok Shop acquisition
 */

import type {
  TikTokShopAcquisitionRuntimeProfile,
  TikTokShopRuntimeSafetyProfile,
  TikTokShopAcquisitionMode,
  TikTokShopRuntimeRole,
  TikTokShopAcquisitionSupportState,
} from '../types.js';
import { TikTokShopAcquisitionSupportState, TikTokShopRuntimeRole } from '../types.js';
import { TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG, TIKTOK_SHOP_DISCOVERY_CONFIG, TIKTOK_SHOP_DETAIL_CONFIG } from '../constants.js';

/**
 * Build acquisition runtime profile
 */
export function buildTikTokShopAcquisitionRuntimeProfile(
  role: TikTokShopRuntimeRole,
  mode: TikTokShopAcquisitionMode
): TikTokShopAcquisitionRuntimeProfile {
  const baseProfile: TikTokShopAcquisitionRuntimeProfile = {
    role,
    mode,
    supportState: TikTokShopAcquisitionSupportState.PARTIAL,
    concurrency: 1,
    throttlingMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.DEFAULT_REQUEST_DELAY_MS,
    navigationTimeoutMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.NAVIGATION_TIMEOUT_MS,
    retryLimit: 3,
    backoffMultiplier: 2,
  };

  // Adjust based on role
  switch (role) {
    case TikTokShopRuntimeRole.DISCOVERY:
      return {
        ...baseProfile,
        concurrency: Math.min(TIKTOK_SHOP_DISCOVERY_CONFIG.MAX_CONCURRENT_DISCOVERY, 2),
        throttlingMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.DEFAULT_REQUEST_DELAY_MS * 1.5,
      };

    case TikTokShopRuntimeRole.DETAIL:
      return {
        ...baseProfile,
        concurrency: Math.min(TIKTOK_SHOP_DETAIL_CONFIG.MAX_CONCURRENT_DETAIL, 3),
        throttlingMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.DEFAULT_REQUEST_DELAY_MS,
        navigationTimeoutMs: TIKTOK_SHOP_DETAIL_CONFIG.NAVIGATION_TIMEOUT_MS,
      };

    case TikTokShopRuntimeRole.MIXED:
      return {
        ...baseProfile,
        concurrency: 1,
        throttlingMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.DEFAULT_REQUEST_DELAY_MS * 2,
      };

    default:
      return baseProfile;
  }
}

/**
 * Resolve acquisition mode based on support state
 */
export function resolveTikTokShopAcquisitionMode(
  mode: TikTokShopAcquisitionMode,
  supportState: TikTokShopAcquisitionSupportState
): TikTokShopAcquisitionMode {
  // If unsupported, default to browser mode
  if (supportState === TikTokShopAcquisitionSupportState.UNSUPPORTED) {
    return TikTokShopAcquisitionMode.BROWSER;
  }

  // If fragile, reduce to safer mode
  if (supportState === TikTokShopAcquisitionSupportState.FRAGILE) {
    return TikTokShopAcquisitionMode.BROWSER;
  }

  return mode;
}

/**
 * Build runtime identity
 */
export function buildTikTokShopRuntimeIdentity(
  role: TikTokShopRuntimeRole,
  instanceId?: string
): {
  runtimeId: string;
  role: TikTokShopRuntimeRole;
  instanceId: string;
  startedAt: Date;
} {
  const instance = instanceId || `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    runtimeId: `tiktok-shop-${role}-${instance}`,
    role,
    instanceId: instance,
    startedAt: new Date(),
  };
}

/**
 * Build runtime safety profile
 */
export function buildTikTokShopRuntimeSafetyProfile(
  role: TikTokShopRuntimeRole
): TikTokShopRuntimeSafetyProfile {
  const base: TikTokShopRuntimeSafetyProfile = {
    maxConcurrentSessions: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MAX_CONCURRENT_SESSIONS,
    maxRequestsPerMinute: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MAX_REQUESTS_PER_MINUTE,
    maxRequestsPerHour: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.MAX_REQUESTS_PER_HOUR,
    requestDelayMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.DEFAULT_REQUEST_DELAY_MS,
    pageLoadDelayMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.PAGE_LOAD_DELAY_MS,
    sessionTimeoutMs: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.SESSION_TIMEOUT_MS,
    recycleAfterRequests: TIKTOK_SHOP_RUNTIME_SAFETY_CONFIG.SESSION_RECYCLE_AFTER_REQUESTS,
  };

  // Adjust based on role
  switch (role) {
    case TikTokShopRuntimeRole.DISCOVERY:
      return {
        ...base,
        maxRequestsPerMinute: Math.floor(base.maxRequestsPerMinute * 0.7),
        maxRequestsPerHour: Math.floor(base.maxRequestsPerHour * 0.7),
        requestDelayMs: Math.floor(base.requestDelayMs * 1.5),
      };

    case TikTokShopRuntimeRole.DETAIL:
      return {
        ...base,
        maxRequestsPerMinute: Math.floor(base.maxRequestsPerMinute * 0.5),
        maxRequestsPerHour: Math.floor(base.maxRequestsPerHour * 0.6),
        requestDelayMs: Math.floor(base.requestDelayMs * 2),
      };

    default:
      return base;
  }
}

/**
 * Get support state description
 */
export function getTikTokShopSupportStateDescription(state: TikTokShopAcquisitionSupportState): string {
  switch (state) {
    case TikTokShopAcquisitionSupportState.SUPPORTED:
      return 'Full extraction capability with stable selectors';
    case TikTokShopAcquisitionSupportState.PARTIAL:
      return 'Partial extraction capability with some gaps';
    case TikTokShopAcquisitionSupportState.FRAGILE:
      return 'Extraction may break easily - use with caution';
    case TikTokShopAcquisitionSupportState.UNSUPPORTED:
      return 'Not supported - requires implementation';
    default:
      return 'Unknown support state';
  }
}

/**
 * Check if runtime can operate
 */
export function canTikTokShopRuntimeOperate(
  supportState: TikTokShopAcquisitionSupportState
): boolean {
  return (
    supportState === TikTokShopAcquisitionSupportState.SUPPORTED ||
    supportState === TikTokShopAcquisitionSupportState.PARTIAL
  );
}
