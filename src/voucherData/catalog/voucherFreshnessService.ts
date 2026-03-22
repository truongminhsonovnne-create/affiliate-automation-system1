// =============================================================================
// Voucher Freshness Service
// Production-grade service for voucher freshness evaluation
// =============================================================================

import { VoucherNormalizedRecord, VoucherFreshnessStatus } from '../types.js';
import { FRESHNESS } from '../constants.js';
import { voucherCatalogRepository } from '../repositories/voucherCatalogRepository.js';

export interface EvaluateFreshnessOptions {
  currentTime?: Date;
  freshThresholdMs?: number;
  staleThresholdMs?: number;
}

/**
 * Evaluate freshness status for a single voucher
 */
export function evaluateVoucherFreshness(
  voucher: VoucherNormalizedRecord,
  options?: EvaluateFreshnessOptions
): VoucherFreshnessStatus {
  const now = options?.currentTime || new Date();
  const freshThreshold = options?.freshThresholdMs || FRESHNESS.FRESH_THRESHOLD_MS;
  const staleThreshold = options?.staleThresholdMs || FRESHNESS.STALE_THRESHOLD_MS;

  // Check if voucher has expired
  if (voucher.endDate && now > voucher.endDate) {
    return 'expired';
  }

  // Check if voucher hasn't started yet
  if (voucher.startDate && now < voucher.startDate) {
    return 'unknown';
  }

  // Calculate time until expiry
  const timeUntilExpiry = voucher.endDate ? voucher.endDate.getTime() - now.getTime() : Infinity;

  // Determine freshness based on time until expiry
  if (timeUntilExpiry < 0) {
    return 'expired';
  }

  if (timeUntilExpiry < staleThreshold) {
    return 'stale';
  }

  if (timeUntilExpiry < freshThreshold) {
    return 'fresh';
  }

  return 'fresh';
}

/**
 * Filter vouchers to only return fresh and usable ones
 */
export function filterFreshAndUsableVouchers(
  vouchers: VoucherNormalizedRecord[],
  options?: EvaluateFreshnessOptions
): VoucherNormalizedRecord[] {
  return vouchers.filter((voucher) => {
    // Must be active
    if (!voucher.isActive) {
      return false;
    }

    // Check freshness
    const freshness = evaluateVoucherFreshness(voucher, options);

    return freshness === 'fresh';
  });
}

/**
 * Detect stale voucher records
 */
export async function detectStaleVoucherRecords(
  vouchers?: VoucherNormalizedRecord[],
  options?: EvaluateFreshnessOptions
): Promise<VoucherNormalizedRecord[]> {
  let targetVouchers = vouchers;

  // If no vouchers provided, fetch from repository
  if (!targetVouchers) {
    const allVouchers = await voucherCatalogRepository.findAll({ limit: 10000 });
    targetVouchers = allVouchers;
  }

  const staleVouchers: VoucherNormalizedRecord[] = [];

  for (const voucher of targetVouchers) {
    const freshness = evaluateVoucherFreshness(voucher, options);

    if (freshness === 'stale' || freshness === 'expired') {
      staleVouchers.push(voucher);
    }
  }

  return staleVouchers;
}

/**
 * Update freshness status for all vouchers in catalog
 */
export async function refreshAllVoucherFreshness(
  options?: EvaluateFreshnessOptions
): Promise<{
  updated: number;
  fresh: number;
  stale: number;
  expired: number;
}> {
  const allVouchers = await voucherCatalogRepository.findAll({ limit: 10000 });

  let fresh = 0;
  let stale = 0;
  let expired = 0;
  let updated = 0;

  for (const voucher of allVouchers) {
    const newFreshness = evaluateVoucherFreshness(voucher, options);

    if (voucher.freshnessStatus !== newFreshness) {
      await voucherCatalogRepository.updateFreshnessStatus(voucher.id!, newFreshness);
      updated++;
    }

    switch (newFreshness) {
      case 'fresh':
        fresh++;
        break;
      case 'stale':
        stale++;
        break;
      case 'expired':
        expired++;
        break;
    }
  }

  return { updated, fresh, stale, expired };
}

/**
 * Get freshness statistics for the catalog
 */
export async function getVoucherFreshnessStats(): Promise<{
  total: number;
  fresh: number;
  stale: number;
  expired: number;
  unknown: number;
  freshPercentage: number;
  stalePercentage: number;
}> {
  const allVouchers = await voucherCatalogRepository.findAll({ limit: 10000 });

  let fresh = 0;
  let stale = 0;
  let expired = 0;
  let unknown = 0;

  for (const voucher of allVouchers) {
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

  const total = allVouchers.length;

  return {
    total,
    fresh,
    stale,
    expired,
    unknown,
    freshPercentage: total > 0 ? (fresh / total) * 100 : 0,
    stalePercentage: total > 0 ? (stale / total) * 100 : 0,
  };
}

/**
 * Check if a voucher is currently usable
 */
export function isVoucherUsable(
  voucher: VoucherNormalizedRecord,
  options?: EvaluateFreshnessOptions
): boolean {
  // Must be active
  if (!voucher.isActive) {
    return false;
  }

  // Check freshness
  const freshness = evaluateVoucherFreshness(voucher, options);

  return freshness === 'fresh';
}

/**
 * Get vouchers that are about to expire soon
 */
export function getVouchersExpiringSoon(
  vouchers: VoucherNormalizedRecord[],
  hoursAhead: number = 24,
  options?: EvaluateFreshnessOptions
): VoucherNormalizedRecord[] {
  const now = options?.currentTime || new Date();
  const threshold = now.getTime() + hoursAhead * 60 * 60 * 1000;

  return vouchers.filter((voucher) => {
    if (!voucher.endDate || !voucher.isActive) {
      return false;
    }

    return voucher.endDate.getTime() <= threshold;
  });
}
