/**
 * Platform Adapter Registry
 *
 * Resolves and manages platform-specific adapters.
 */

import type { CommercePlatform, PlatformAdapterHealth } from '../types.js';
import type { PlatformAdapterRegistry, PlatformAdapterHealthResult } from './platformAdapterContracts.js';
import { logger } from '../../utils/logger.js';

// In-memory adapter registry
const adapters: Map<CommercePlatform, any> = new Map();

/**
 * Register a platform adapter
 */
export function registerPlatformAdapter(platform: CommercePlatform, adapter: any): void {
  adapters.set(platform, adapter);
  logger.info({ msg: 'Platform adapter registered', platform });
}

/**
 * Get platform adapters
 */
export function getPlatformAdapters(platform: CommercePlatform): any | null {
  return adapters.get(platform) || null;
}

/**
 * Get platform reference adapter
 */
export function getPlatformReferenceAdapter(platform: CommercePlatform): any | null {
  const adapter = adapters.get(platform);
  return adapter?.referenceAdapter || null;
}

/**
 * Get platform context adapter
 */
export function getPlatformContextAdapter(platform: CommercePlatform): any | null {
  const adapter = adapters.get(platform);
  return adapter?.contextAdapter || null;
}

/**
 * Get platform promotion adapter
 */
export function getPlatformPromotionAdapter(platform: CommercePlatform): any | null {
  const adapter = adapters.get(platform);
  return adapter?.promotionAdapter || null;
}

/**
 * Get platform commercial adapter
 */
export function getPlatformCommercialAdapter(platform: CommercePlatform): any | null {
  const adapter = adapters.get(platform);
  return adapter?.commercialAdapter || null;
}

/**
 * Get platform growth adapter
 */
export function getPlatformGrowthAdapter(platform: CommercePlatform): any | null {
  const adapter = adapters.get(platform);
  return adapter?.growthAdapter || null;
}

/**
 * Check if platform has adapter registered
 */
export function hasPlatformAdapter(platform: CommercePlatform): boolean {
  return adapters.has(platform);
}

/**
 * Get supported platforms
 */
export function getSupportedPlatforms(): CommercePlatform[] {
  return Array.from(adapters.keys());
}

/**
 * Validate platform adapter registry
 */
export function validatePlatformAdapterRegistry(): PlatformAdapterHealthResult[] {
  const results: PlatformAdapterHealthResult[] = [];
  const now = new Date();

  for (const [platform, adapter] of adapters.entries()) {
    const result: PlatformAdapterHealthResult = {
      platform,
      isHealthy: true,
      errors: [],
      warnings: [],
      lastCheck: now,
      adapters: {
        reference: checkAdapter(adapter?.referenceAdapter),
        context: checkAdapter(adapter?.contextAdapter),
        promotion: checkAdapter(adapter?.promotionAdapter),
        commercial: checkAdapter(adapter?.commercialAdapter),
        growth: checkAdapter(adapter?.growthAdapter),
      },
    };

    // Check for missing adapters
    if (!result.adapters.reference.isHealthy) {
      result.errors.push('Reference adapter missing or unhealthy');
      result.isHealthy = false;
    }
    if (!result.adapters.context.isHealthy) {
      result.warnings.push('Context adapter missing or unhealthy');
    }
    if (!result.adapters.promotion.isHealthy) {
      result.warnings.push('Promotion adapter missing or unhealthy');
    }
    if (!result.adapters.commercial.isHealthy) {
      result.warnings.push('Commercial adapter missing or unhealthy');
    }
    if (!result.adapters.growth.isHealthy) {
      result.warnings.push('Growth adapter missing or unhealthy');
    }

    results.push(result);
  }

  return results;
}

function checkAdapter(adapter: any): PlatformAdapterHealth {
  if (!adapter) {
    return {
      isHealthy: false,
      errors: ['Adapter not registered'],
      warnings: [],
      lastCheck: new Date(),
    };
  }

  return {
    isHealthy: true,
    errors: [],
    warnings: [],
    lastCheck: new Date(),
  };
}

/**
 * Get full adapter registry
 */
export function getPlatformAdapterRegistry(): PlatformAdapterRegistry {
  return {
    getReferenceAdapter: getPlatformReferenceAdapter,
    getContextAdapter: getPlatformContextAdapter,
    getPromotionAdapter: getPlatformPromotionAdapter,
    getCommercialAdapter: getPlatformCommercialAdapter,
    getGrowthAdapter: getPlatformGrowthAdapter,
    hasAdapter: hasPlatformAdapter,
    getSupportedPlatforms,
  };
}
