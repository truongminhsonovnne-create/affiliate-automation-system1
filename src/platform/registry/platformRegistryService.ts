/**
 * Platform Registry Service
 *
 * Manages the platform registry including registration, updates, and queries.
 */

import type { PlatformRegistryRecord, PlatformStatus, PlatformSupportLevel, CommercePlatform, PlatformGovernanceConfig } from '../types.js';
import { PLATFORM_STATUS_DEFAULTS, PLATFORM_SUPPORT_DEFAULTS } from '../constants.js';
import { getPlatformRegistryRepository } from '../repositories/platformRegistryRepository.js';
import { logger } from '../../utils/logger.js';

/**
 * Get all registered platforms
 */
export async function getRegisteredPlatforms(): Promise<PlatformRegistryRecord[]> {
  const repo = getPlatformRegistryRepository();
  return repo.findAll();
}

/**
 * Get platform by key
 */
export async function getPlatformByKey(platformKey: string): Promise<PlatformRegistryRecord | null> {
  const repo = getPlatformRegistryRepository();
  return repo.findByKey(platformKey);
}

/**
 * Get platforms by status
 */
export async function getPlatformsByStatus(status: PlatformStatus): Promise<PlatformRegistryRecord[]> {
  const repo = getPlatformRegistryRepository();
  return repo.findByStatus(status);
}

/**
 * Register a new platform
 */
export async function registerPlatform(params: {
  platformKey: string;
  platformName: string;
  platformType?: string;
  supportLevel?: PlatformSupportLevel;
  governanceConfig?: PlatformGovernanceConfig;
}): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();

  const existing = await repo.findByKey(params.platformKey);
  if (existing) {
    throw new Error(`Platform ${params.platformKey} is already registered`);
  }

  const record = await repo.create({
    platformKey: params.platformKey,
    platformName: params.platformName,
    platformStatus: PLATFORM_STATUS_DEFAULTS.DEFAULT,
    supportLevel: params.supportLevel || 'none',
    platformType: params.platformType as any || 'marketplace',
    capabilityPayload: {},
    governanceConfig: params.governanceConfig || null,
  });

  logger.info({ msg: 'Platform registered', platformKey: params.platformKey });
  return record;
}

/**
 * Update platform status
 */
export async function updatePlatformStatus(
  platformKey: string,
  status: PlatformStatus
): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();
  const platform = await repo.findByKey(platformKey);

  if (!platform) {
    throw new Error(`Platform ${platformKey} not found`);
  }

  const updated = await repo.updateStatus(platformKey, status);
  logger.info({ msg: 'Platform status updated', platformKey, status });
  return updated;
}

/**
 * Update platform support level
 */
export async function updatePlatformSupportLevel(
  platformKey: string,
  supportLevel: PlatformSupportLevel
): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();
  const platform = await repo.findByKey(platformKey);

  if (!platform) {
    throw new Error(`Platform ${platformKey} not found`);
  }

  const updated = await repo.updateSupportLevel(platformKey, supportLevel);
  logger.info({ msg: 'Platform support level updated', platformKey, supportLevel });
  return updated;
}

/**
 * Update platform capabilities
 */
export async function updatePlatformCapabilities(
  platformKey: string,
  capabilities: Record<string, unknown>
): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();
  const platform = await repo.findByKey(platformKey);

  if (!platform) {
    throw new Error(`Platform ${platformKey} not found`);
  }

  const updated = await repo.updateCapabilities(platformKey, capabilities);
  logger.info({ msg: 'Platform capabilities updated', platformKey });
  return updated;
}

/**
 * Update platform governance config
 */
export async function updatePlatformGovernance(
  platformKey: string,
  governanceConfig: PlatformGovernanceConfig
): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();
  const platform = await repo.findByKey(platformKey);

  if (!platform) {
    throw new Error(`Platform ${platformKey} not found`);
  }

  const updated = await repo.updateGovernance(platformKey, governanceConfig);
  logger.info({ msg: 'Platform governance updated', platformKey });
  return updated;
}

/**
 * Initialize Shopee as default platform
 */
export async function initializeShopeePlatform(): Promise<PlatformRegistryRecord> {
  const repo = getPlatformRegistryRepository();

  const existing = await repo.findByKey('shopee');
  if (existing) {
    return existing;
  }

  return repo.create({
    platformKey: 'shopee',
    platformName: 'Shopee',
    platformStatus: 'active',
    supportLevel: 'full',
    platformType: 'marketplace',
    capabilityPayload: {
      productReference: 'complete',
      productContext: 'complete',
      promotion: 'complete',
      publicFlow: 'complete',
      commercialAttribution: 'complete',
      growthSurface: 'complete',
    },
    governanceConfig: {
      requiresApproval: false,
      riskLevel: 'low',
      complianceRequirements: [],
      monitoringEnabled: true,
    },
  });
}

/**
 * Get platform summary
 */
export async function getPlatformSummary(): Promise<{
  total: number;
  active: number;
  preparing: number;
  planned: number;
  bySupportLevel: Record<string, number>;
}> {
  const platforms = await getRegisteredPlatforms();

  const summary = {
    total: platforms.length,
    active: platforms.filter(p => p.platformStatus === 'active').length,
    preparing: platforms.filter(p => p.platformStatus === 'preparing').length,
    planned: platforms.filter(p => p.platformStatus === 'planned').length,
    bySupportLevel: {} as Record<string, number>,
  };

  for (const platform of platforms) {
    summary.bySupportLevel[platform.supportLevel] = (summary.bySupportLevel[platform.supportLevel] || 0) + 1;
  }

  return summary;
}
