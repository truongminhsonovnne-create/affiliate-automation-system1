/**
 * TikTok Shop Promotion Model
 *
 * Models TikTok Shop promotions/coupons/campaigns.
 */

import type {
  TikTokShopPromotion,
  TikTokShopPromotionType,
  TikTokShopPromotionScope,
  TikTokShopPromotionConstraint,
  TikTokShopPromotionEligibility,
  TikTokShopPromotionBenefit,
} from '../types.js';
import { PROMOTION_TYPES, SCOPE_TYPES, DISCOUNT_TYPES } from '../constants.js';

/**
 * Build TikTok Shop promotion from raw data
 */
export function buildTikTokShopPromotionModel(
  rawData: Record<string, unknown>
): TikTokShopPromotion | null {
  try {
    const promotionId = String(rawData.promotionId || rawData.id || '');
    const title = String(rawData.title || rawData.name || '');

    if (!promotionId || !title) {
      return null;
    }

    return {
      promotionId,
      promotionCode: rawData.promotionCode ? String(rawData.promotionCode) : undefined,
      promotionType: normalizePromotionType(rawData.promotionType),
      title,
      description: rawData.description ? String(rawData.description) : undefined,
      scope: normalizeScope(rawData.scope),
      benefit: normalizeBenefit(rawData.benefit, rawData),
      eligibility: normalizeEligibility(rawData.eligibility, rawData),
      startDate: normalizeDate(rawData.startDate),
      endDate: normalizeDate(rawData.endDate),
      isStackable: rawData.isStackable !== false,
      maxUses: rawData.maxUses ? Number(rawData.maxUses) : undefined,
      currentUses: rawData.currentUses ? Number(rawData.currentUses) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build TikTok Shop promotion from campaign data
 */
export function buildTikTokShopCampaignPromotion(
  campaignData: Record<string, unknown>
): TikTokShopPromotion | null {
  const campaignId = String(campaignData.campaignId || campaignData.id || '');

  if (!campaignId) {
    return null;
  }

  const title = String(campaignData.campaignName || campaignData.title || 'Campaign');

  // Extract discount info
  let benefit: TikTokShopPromotionBenefit = {
    discountType: 'percentage',
    discountValue: 0,
  };

  if (campaignData.discountPercentage) {
    benefit = {
      discountType: 'percentage',
      discountValue: Number(campaignData.discountPercentage),
    };
  } else if (campaignData.discountAmount) {
    benefit = {
      discountType: 'fixed_amount',
      discountValue: Number(campaignData.discountAmount),
    };
  } else if (campaignData.isFreeShipping) {
    benefit = {
      discountType: 'shipping',
      discountValue: 0,
    };
  }

  // Extract eligibility
  const eligibility: TikTokShopPromotionEligibility = {
    eligibilityType: campaignData.isNewUser ? 'new_user' : 'all',
    constraints: buildConstraints(campaignData),
  };

  return {
    promotionId: campaignId,
    promotionType: 'campaign',
    title,
    description: campaignData.description ? String(campaignData.description) : undefined,
    scope: 'global',
    benefit,
    eligibility,
    startDate: normalizeDate(campaignData.startTime || campaignData.startDate),
    endDate: normalizeDate(campaignData.endTime || campaignData.endDate),
    isStackable: false,
  };
}

/**
 * Build TikTok Shop voucher promotion
 */
export function buildTikTokShopVoucherPromotion(
  voucherData: Record<string, unknown>
): TikTokShopPromotion | null {
  const voucherId = String(voucherData.voucherCode || voucherData.voucherId || voucherData.id || '');

  if (!voucherId) {
    return null;
  }

  const title = String(voucherData.title || voucherData.voucherName || `Voucher ${voucherId}`);

  // Determine discount type
  let benefit: TikTokShopPromotionBenefit = {
    discountType: 'percentage',
    discountValue: 0,
  };

  if (voucherData.discountValue) {
    const value = Number(voucherData.discountValue);
    if (voucherData.discountType === 'PERCENTAGE' || voucherData.isPercentage) {
      benefit = { discountType: 'percentage', discountValue: value };
    } else {
      benefit = { discountType: 'fixed_amount', discountValue: value };
    }
  }

  // Build constraints
  const constraints: TikTokShopPromotionConstraint[] = [];

  if (voucherData.minSpend || voucherData.minOrderAmount) {
    constraints.push({
      type: 'min_spend',
      operator: 'gte',
      value: Number(voucherData.minSpend || voucherData.minOrderAmount),
    });
  }

  if (voucherData.maxDiscount || voucherData.capAmount) {
    constraints.push({
      type: 'max_discount',
      operator: 'lte',
      value: Number(voucherData.maxDiscount || voucherData.capAmount),
    });
  }

  const eligibility: TikTokShopPromotionEligibility = {
    eligibilityType: 'all',
    constraints,
  };

  return {
    promotionId: voucherId,
    promotionCode: voucherId,
    promotionType: 'voucher',
    title,
    description: voucherData.description ? String(voucherData.description) : undefined,
    scope: voucherData.scope === 'PRODUCT' ? 'product' : 'global',
    benefit,
    eligibility,
    startDate: normalizeDate(voucherData.startTime || voucherData.startDate),
    endDate: normalizeDate(voucherData.endTime || voucherData.endDate),
    isStackable: voucherData.isStackable ?? true,
    maxUses: voucherData.maxClaim ? Number(voucherData.maxClaim) : undefined,
    currentUses: voucherData.usedCount ? Number(voucherData.usedCount) : undefined,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function normalizePromotionType(type: unknown): TikTokShopPromotionType {
  if (!type) return 'unknown';

  const typeStr = String(type).toLowerCase();

  if (typeStr.includes('discount')) return 'discount';
  if (typeStr.includes('voucher')) return 'voucher';
  if (typeStr.includes('coupon')) return 'coupon';
  if (typeStr.includes('flash') || typeStr.includes('deal')) return 'flash_sale';
  if (typeStr.includes('bundle')) return 'bundle';
  if (typeStr.includes('ship') || typeStr.includes('shipping')) return 'free_shipping';
  if (typeStr.includes('new') || typeStr.includes('new_user')) return 'new_user';
  if (typeStr.includes('loyalty') || typeStr.includes('points')) return 'loyalty';
  if (typeStr.includes('campaign')) return 'campaign';

  return 'unknown';
}

function normalizeScope(scope: unknown): TikTokShopPromotionScope {
  if (!scope) return 'global';

  const scopeStr = String(scope).toUpperCase();

  if (scopeStr === 'SHOP' || scopeStr === 'STORE') return 'shop';
  if (scopeStr === 'PRODUCT' || scopeStr === 'ITEM') return 'product';
  if (scopeStr === 'CATEGORY') return 'category';
  if (scopeStr === 'USER' || scopeStr === 'USER_SEGMENT') return 'user_segment';
  if (scopeStr === 'CART' || scopeStr === 'ORDER') return 'cart';

  return 'global';
}

function normalizeBenefit(
  benefit: unknown,
  rawData: Record<string, unknown>
): TikTokShopPromotionBenefit {
  if (benefit && typeof benefit === 'object') {
    const b = benefit as Record<string, unknown>;
    return {
      discountType: normalizeDiscountType(b.discountType),
      discountValue: Number(b.discountValue || b.value || 0),
      maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : undefined,
      currency: b.currency ? String(b.currency) : undefined,
    };
  }

  // Try to infer from raw data
  if (rawData.discountPercentage || rawData.isPercentage) {
    return {
      discountType: 'percentage',
      discountValue: Number(rawData.discountPercentage || rawData.discountValue || 0),
      maxDiscount: rawData.maxDiscount ? Number(rawData.maxDiscount) : undefined,
    };
  }

  if (rawData.discountAmount || rawData.discountValue) {
    return {
      discountType: 'fixed_amount',
      discountValue: Number(rawData.discountAmount || rawData.discountValue || 0),
      maxDiscount: rawData.maxDiscount ? Number(rawData.maxDiscount) : undefined,
    };
  }

  return {
    discountType: 'percentage',
    discountValue: 0,
  };
}

function normalizeDiscountType(type: unknown): TikTokShopPromotionBenefit['discountType'] {
  if (!type) return 'percentage';

  const typeStr = String(type).toLowerCase();

  if (typeStr.includes('percent') || typeStr.includes('%')) return 'percentage';
  if (typeStr.includes('fixed') || typeStr.includes('amount')) return 'fixed_amount';
  if (typeStr.includes('bogo') || typeStr.includes('buy')) return 'bogo';
  if (typeStr.includes('ship') || typeStr.includes('shipping')) return 'shipping';

  return 'percentage';
}

function normalizeEligibility(
  eligibility: unknown,
  rawData: Record<string, unknown>
): TikTokShopPromotionEligibility {
  if (eligibility && typeof eligibility === 'object') {
    const e = eligibility as Record<string, unknown>;
    return {
      eligibilityType: normalizeEligibilityType(e.eligibilityType),
      constraints: buildConstraints(e),
    };
  }

  // Infer from raw data
  if (rawData.isNewUser) {
    return { eligibilityType: 'new_user', constraints: [] };
  }

  return {
    eligibilityType: 'all',
    constraints: buildConstraints(rawData),
  };
}

function normalizeEligibilityType(type: unknown): TikTokShopPromotionEligibility['eligibilityType'] {
  if (!type) return 'all';

  const typeStr = String(type).toLowerCase();

  if (typeStr.includes('new')) return 'new_user';
  if (typeStr.includes('vip')) return 'vip';
  if (typeStr.includes('specific')) return 'specific_users';
  if (typeStr.includes('first')) return 'first_purchase';

  return 'all';
}

function buildConstraints(data: Record<string, unknown>): TikTokShopPromotionConstraint[] {
  const constraints: TikTokShopPromotionConstraint[] = [];

  if (data.minSpend || data.minOrderAmount) {
    constraints.push({
      type: 'min_spend',
      operator: 'gte',
      value: Number(data.minSpend || data.minOrderAmount),
    });
  }

  if (data.maxDiscount || data.capAmount) {
    constraints.push({
      type: 'max_discount',
      operator: 'lte',
      value: Number(data.maxDiscount || data.capAmount),
    });
  }

  if (data.minQuantity) {
    constraints.push({
      type: 'min_quantity',
      operator: 'gte',
      value: Number(data.minQuantity),
    });
  }

  return constraints;
}

function normalizeDate(date: unknown): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date * 1000); // Unix timestamp
  return new Date(date);
}
