/**
 * Voucher Catalog Loader
 *
 * Loads voucher universe for matching.
 */

import {
  VoucherCatalogRecord,
  SupportedVoucherPlatform,
  ProductContext,
} from '../types';
import {
  DEFAULT_VOUCHER_SORT_ORDER,
  MAX_VOUCHERS_PER_PLATFORM,
  MIN_VOUCHERS_FOR_MATCHING,
} from '../constants';

/**
 * Voucher catalog loader options
 */
export interface VoucherCatalogLoaderOptions {
  maxVouchers?: number;
  sortOrder?: 'priority_desc' | 'priority_asc' | 'expires_asc' | 'expires_desc';
  includeExpired?: boolean;
  includeInactive?: boolean;
}

/**
 * Voucher catalog loader result
 */
export interface VoucherCatalogLoaderResult {
  vouchers: VoucherCatalogRecord[];
  total: number;
  loadedFrom: 'database' | 'cache' | 'fallback';
  warnings: string[];
}

/**
 * Load active vouchers for a platform
 */
export async function loadActiveVouchersForPlatform(
  platform: SupportedVoucherPlatform,
  options?: VoucherCatalogLoaderOptions
): Promise<VoucherCatalogLoaderResult> {
  const opts = {
    maxVouchers: options?.maxVouchers ?? MAX_VOUCHERS_PER_PLATFORM,
    sortOrder: options?.sortOrder ?? DEFAULT_VOUCHER_SORT_ORDER,
    includeExpired: options?.includeExpired ?? false,
    includeInactive: options?.includeInactive ?? false,
  };

  // Placeholder: In production, this would query the database
  // For now, return sample vouchers for testing
  const sampleVouchers = getSampleVouchers(platform, opts.maxVouchers);

  if (sampleVouchers.length < MIN_VOUCHERS_FOR_MATCHING) {
    return {
      vouchers: sampleVouchers,
      total: sampleVouchers.length,
      loadedFrom: 'fallback',
      warnings: [`Loaded only ${sampleVouchers.length} vouchers, expected at least ${MIN_VOUCHERS_FOR_MATCHING}`],
    };
  }

  return {
    vouchers: sampleVouchers,
    total: sampleVouchers.length,
    loadedFrom: 'database',
    warnings: [],
  };
}

/**
 * Load relevant voucher universe based on product context
 */
export async function loadRelevantVoucherUniverse(
  context: ProductContext,
  options?: VoucherCatalogLoaderOptions
): Promise<VoucherCatalogLoaderResult> {
  // Load all active vouchers for the platform
  const platformResult = await loadActiveVouchersForPlatform(context.platform, {
    ...options,
    maxVouchers: options?.maxVouchers ?? MAX_VOUCHERS_PER_PLATFORM,
  });

  // Pre-filter vouchers based on product context to reduce matching load
  const relevantVouchers = filterRelevantVouchers(platformResult.vouchers, context);

  return {
    vouchers: relevantVouchers,
    total: relevantVouchers.length,
    loadedFrom: platformResult.loadedFrom,
    warnings: [
      ...platformResult.warnings,
      relevantVouchers.length < platformResult.vouchers.length
        ? `Filtered from ${platformResult.vouchers.length} to ${relevantVouchers.length} relevant vouchers`
        : '',
    ].filter(Boolean),
  };
}

/**
 * Filter vouchers relevant to product context
 */
function filterRelevantVouchers(
  vouchers: VoucherCatalogRecord[],
  context: ProductContext
): VoucherCatalogRecord[] {
  return vouchers.filter((voucher) => {
    // Platform-wide vouchers are always relevant
    if (voucher.appliesToScope === 'all') {
      return true;
    }

    // Shop-specific vouchers - check shop match
    if (voucher.appliesToScope === 'shop' && context.shopId) {
      return voucher.shopId === context.shopId;
    }

    // Category-specific vouchers - check category match
    if (voucher.appliesToScope === 'category' && context.categoryPath) {
      if (!voucher.categoryPath) return false;

      // Check if any category in product matches voucher categories
      return context.categoryPath.some((cat) =>
        voucher.categoryPath!.includes(cat)
      );
    }

    // Product-specific would need product ID matching
    if (voucher.appliesToScope === 'product' && context.productId) {
      // In production, check product_constraints
      return true;
    }

    return false;
  });
}

/**
 * Filter expired or inactive vouchers
 */
export function filterExpiredOrInactiveVouchers(
  vouchers: VoucherCatalogRecord[],
  options?: { includeExpired?: boolean; includeInactive?: boolean }
): VoucherCatalogLoaderResult {
  const now = new Date();

  const filtered = vouchers.filter((voucher) => {
    // Check active status
    if (!options?.includeInactive && !voucher.isActive) {
      return false;
    }

    // Check time window
    if (!options?.includeExpired) {
      if (voucher.startsAt && voucher.startsAt > now) {
        return false; // Not started yet
      }
      if (voucher.endsAt && voucher.endsAt < now) {
        return false; // Already expired
      }
    }

    return true;
  });

  return {
    vouchers: filtered,
    total: filtered.length,
    loadedFrom: 'database',
    warnings: [],
  };
}

/**
 * Get sample vouchers for testing
 */
function getSampleVouchers(platform: SupportedVoucherPlatform, maxCount: number): VoucherCatalogRecord[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const sampleVouchers: VoucherCatalogRecord[] = [
    // Platform-wide voucher
    {
      id: 'voucher-001',
      platform,
      voucherCode: 'GIAM10',
      voucherTitle: 'Giảm 10% toàn sàn',
      voucherType: 'platform',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountValue: 50000,
      minimumSpend: 150000,
      appliesToScope: 'all',
      shopId: null,
      shopName: null,
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 100,
      source: 'crawled',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // Shop-specific voucher
    {
      id: 'voucher-002',
      platform,
      voucherCode: 'SHOP20K',
      voucherTitle: 'Giảm 20K đơn 150K',
      voucherType: 'shop',
      discountType: 'fixed_amount',
      discountValue: 20000,
      maxDiscountValue: null,
      minimumSpend: 150000,
      appliesToScope: 'shop',
      shopId: '12345678',
      shopName: 'Fashion Store',
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 80,
      source: 'manual',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // Category-specific voucher
    {
      id: 'voucher-003',
      platform,
      voucherCode: 'THOIGIANG',
      voucherTitle: 'Giảm 15% áo thun',
      voucherType: 'category',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscountValue: 100000,
      minimumSpend: 200000,
      appliesToScope: 'category',
      shopId: null,
      shopName: null,
      categoryId: '110002',
      categoryPath: ['Fashion', 'Men', 'T-Shirts'],
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 70,
      source: 'crawled',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // Free shipping voucher
    {
      id: 'voucher-004',
      platform,
      voucherCode: 'FREESHIP',
      voucherTitle: 'Miễn phí vận chuyển',
      voucherType: 'shipping',
      discountType: 'free_shipping',
      discountValue: null,
      maxDiscountValue: null,
      minimumSpend: 99000,
      appliesToScope: 'all',
      shopId: null,
      shopName: null,
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 60,
      source: 'manual',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // High priority shop voucher
    {
      id: 'voucher-005',
      platform,
      voucherCode: 'SALE50K',
      voucherTitle: 'Giảm 50K đơn 300K',
      voucherType: 'shop',
      discountType: 'fixed_amount',
      discountValue: 50000,
      maxDiscountValue: null,
      minimumSpend: 300000,
      appliesToScope: 'shop',
      shopId: '12345678',
      shopName: 'Fashion Store',
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: tomorrow,
      isActive: true,
      priority: 90,
      source: 'partner',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // Flash sale voucher
    {
      id: 'voucher-006',
      platform,
      voucherCode: 'FLASHSALE',
      voucherTitle: 'Flash Sale 20%',
      voucherType: 'flash_sale',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscountValue: 200000,
      minimumSpend: 100000,
      appliesToScope: 'all',
      shopId: null,
      shopName: null,
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: now,
      endsAt: tomorrow,
      isActive: true,
      priority: 95,
      source: 'crawled',
      verificationStatus: 'unverified',
      lastVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    // New user voucher
    {
      id: 'voucher-007',
      platform,
      voucherCode: 'NEWUSER30',
      voucherTitle: 'New User -30%',
      voucherType: 'new_user',
      discountType: 'percentage',
      discountValue: 30,
      maxDiscountValue: 100000,
      minimumSpend: 0,
      appliesToScope: 'all',
      shopId: null,
      shopName: null,
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 50,
      source: 'manual',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
    // Fallback general voucher
    {
      id: 'voucher-008',
      platform,
      voucherCode: 'DEFAULT5K',
      voucherTitle: 'Giảm 5K đơn 100K',
      voucherType: 'general',
      discountType: 'fixed_amount',
      discountValue: 5000,
      maxDiscountValue: null,
      minimumSpend: 100000,
      appliesToScope: 'all',
      shopId: null,
      shopId: null,
      shopName: null,
      categoryId: null,
      categoryPath: null,
      productConstraints: null,
      eligibilityRules: null,
      campaignMetadata: null,
      startsAt: lastWeek,
      endsAt: nextWeek,
      isActive: true,
      priority: 10,
      source: 'manual',
      verificationStatus: 'verified',
      lastVerifiedAt: now,
      createdAt: lastWeek,
      updatedAt: now,
    },
  ];

  return sampleVouchers.slice(0, maxCount);
}
