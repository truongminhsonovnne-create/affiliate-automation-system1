// =============================================================================
// Voucher Catalog Service
// Production-grade service for voucher catalog operations
// =============================================================================

import { VoucherNormalizedRecord, VoucherPlatform, VoucherFreshnessStatus, VoucherCatalogQueryParams } from '../types.js';
import { voucherCatalogRepository } from '../repositories/voucherCatalogRepository.js';
import { evaluateVoucherFreshness } from '../catalog/voucherFreshnessService.js';
import { logger } from '../../utils/logger.js';

/**
 * Get active voucher catalog for a platform
 */
export async function getActiveVoucherCatalogForPlatform(
  platform: VoucherPlatform,
  options?: {
    limit?: number;
    includeStale?: boolean;
  }
): Promise<VoucherNormalizedRecord[]> {
  const vouchers = await voucherCatalogRepository.findActiveForPlatform(platform, options?.limit);

  // Filter out stale if not requested
  if (!options?.includeStale) {
    return vouchers.filter((v) => {
      const freshness = evaluateVoucherFreshness(v);
      return freshness === 'fresh';
    });
  }

  return vouchers;
}

/**
 * Get a voucher catalog entry by ID
 */
export async function getVoucherCatalogEntry(id: string): Promise<VoucherNormalizedRecord | null> {
  return voucherCatalogRepository.findById(id);
}

/**
 * Search voucher catalog
 */
export async function searchVoucherCatalog(
  query: string,
  platform?: VoucherPlatform,
  options?: {
    limit?: number;
    isActive?: boolean;
  }
): Promise<VoucherNormalizedRecord[]> {
  return voucherCatalogRepository.search(query, platform, options?.limit);
}

/**
 * Refresh a voucher catalog entry
 */
export async function refreshVoucherCatalogEntry(
  id: string
): Promise<VoucherNormalizedRecord | null> {
  const voucher = await voucherCatalogRepository.findById(id);

  if (!voucher) {
    return null;
  }

  // Re-evaluate freshness
  const newFreshness = evaluateVoucherFreshness(voucher);

  // Update freshness status
  await voucherCatalogRepository.updateFreshnessStatus(id, newFreshness);

  // Return updated voucher
  return voucherCatalogRepository.findById(id);
}

/**
 * Get vouchers with filters
 */
export async function getVoucherCatalogWithFilters(
  params: VoucherCatalogQueryParams
): Promise<{
  data: VoucherNormalizedRecord[];
  total: number;
}> {
  const { platform, isActive, freshnessStatus, sourceId, limit = 50, offset = 0 } = params;

  const vouchers = await voucherCatalogRepository.findAll({
    platform,
    isActive,
    freshnessStatus,
    sourceId,
    limit,
    offset,
  });

  const total = await voucherCatalogRepository.count({
    platform,
    isActive,
    freshnessStatus,
  });

  return {
    data: vouchers,
    total,
  };
}

/**
 * Deactivate expired vouchers
 */
export async function deactivateExpiredVouchers(): Promise<number> {
  const allVouchers = await voucherCatalogRepository.findAll({ limit: 10000 });
  let deactivated = 0;

  for (const voucher of allVouchers) {
    const freshness = evaluateVoucherFreshness(voucher);

    if (freshness === 'expired' && voucher.isActive) {
      await voucherCatalogRepository.deactivate(voucher.id!);
      deactivated++;
    }
  }

  logger.info({ deactivated }, 'Expired vouchers deactivated');

  return deactivated;
}

/**
 * Get voucher statistics
 */
export async function getVoucherStatistics(platform?: VoucherPlatform): Promise<{
  total: number;
  active: number;
  inactive: number;
  fresh: number;
  stale: number;
  expired: number;
  unknown: number;
}> {
  const allVouchers = platform
    ? await voucherCatalogRepository.findAll({ platform, limit: 10000 })
    : await voucherCatalogRepository.findAll({ limit: 10000 });

  let active = 0;
  let inactive = 0;
  let fresh = 0;
  let stale = 0;
  let expired = 0;
  let unknown = 0;

  for (const voucher of allVouchers) {
    if (voucher.isActive) {
      active++;
    } else {
      inactive++;
    }

    const freshness = evaluateVoucherFreshness(voucher);
    switch (freshness) {
      case 'fresh':
        fresh++;
        break;
      case 'stale':
        stale++;
        break;
      case 'expired':
        expired++;
        break;
      case 'unknown':
        unknown++;
        break;
    }
  }

  return {
    total: allVouchers.length,
    active,
    inactive,
    fresh,
    stale,
    expired,
    unknown,
  };
}
