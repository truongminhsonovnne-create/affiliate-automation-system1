/**
 * Platform-Neutral Promotion/Voucher Contract
 *
 * Standardizes voucher/coupon/promotion across e-commerce platforms.
 */

import type { CommercePlatform } from '../types.js';

// ============================================================
// A. Promotion Types
// ============================================================

export type CommercePromotionType = 'voucher' | 'coupon' | 'discount' | 'flash_sale' | 'bundle' | 'loyalty';

export type CommercePromotionScope = 'product' | 'category' | 'seller' | 'cart' | 'global';

export type CommerceDiscountType = 'percentage' | 'fixed_amount' | 'bogo' | 'shipping';

export type CommerceEligibilityType = 'all' | 'new_user' | 'vip' | 'specific_users' | 'first_purchase';

export interface CommercePromotionCondition {
  type: 'min_spend' | 'min_quantity' | 'product_id' | 'category_id' | 'seller_id' | 'user_type';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: unknown;
}

export interface CommercePromotionBenefit {
  discountType: CommerceDiscountType;
  discountValue: number;
  maxDiscount?: number;
  currency?: string;
}

export interface CommercePromotionEligibility {
  eligibilityType: CommerceEligibilityType;
  conditions: CommercePromotionCondition[];
  excludedUserIds?: string[];
}

export interface CommercePromotion {
  promotionId: string;
  platform: CommercePlatform;
  promotionCode?: string;
  promotionType: CommercePromotionType;
  title: string;
  description?: string;
  scope: CommercePromotionScope;
  benefit: CommercePromotionBenefit;
  eligibility: CommercePromotionEligibility;
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableSellers?: string[];
  startDate: Date;
  endDate: Date;
  isStackable: boolean;
  maxUses?: number;
  currentUses?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CommercePromotionCandidate {
  promotion: CommercePromotion;
  matchScore: number;
  matchReasons: string[];
  applicable: boolean;
  inapplicableReason?: string;
}

export interface CommercePromotionResolutionResult {
  success: boolean;
  candidates: CommercePromotionCandidate[];
  selectedPromotion?: CommercePromotion;
  resolutionContext: {
    productId?: string;
    categoryId?: string;
    sellerId?: string;
    cartValue: number;
    userType?: string;
    platform: CommercePlatform;
  };
  resolvedAt: Date;
}

// ============================================================
// B. Promotion Resolution
// ============================================================

/**
 * Resolve applicable promotions for a given context
 */
export function resolvePromotionCandidates(
  promotions: CommercePromotion[],
  context: CommercePromotionResolutionResult['resolutionContext']
): CommercePromotionCandidate[] {
  const candidates: CommercePromotionCandidate[] = [];

  for (const promotion of promotions) {
    const candidate = evaluatePromotionFit(promotion, context);
    candidates.push(candidate);
  }

  // Sort by match score descending
  return candidates.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Evaluate how well a promotion fits a given context
 */
export function evaluatePromotionFit(
  promotion: CommercePromotion,
  context: CommercePromotionResolutionResult['resolutionContext']
): CommercePromotionCandidate {
  const matchReasons: string[] = [];
  let applicable = true;
  let inapplicableReason: string | undefined;
  let matchScore = 0;

  // Check if promotion is active
  const now = new Date();
  if (now < promotion.startDate) {
    applicable = false;
    inapplicableReason = 'Promotion has not started yet';
  } else if (now > promotion.endDate) {
    applicable = false;
    inapplicableReason = 'Promotion has expired';
  } else {
    matchScore += 0.3;
    matchReasons.push('Promotion is active');
  }

  // Check usage limits
  if (promotion.maxUses && promotion.currentUses !== undefined) {
    if (promotion.currentUses >= promotion.maxUses) {
      applicable = false;
      inapplicableReason = 'Promotion usage limit reached';
    }
  }

  // Check platform
  if (promotion.platform === context.platform) {
    matchScore += 0.2;
    matchReasons.push('Platform matches');
  }

  // Check scope
  if (applicable && promotion.scope === 'global') {
    matchScore += 0.3;
    matchReasons.push('Global promotion');
  } else if (applicable && promotion.scope === 'cart') {
    if (context.cartValue > 0) {
      matchScore += 0.2;
      matchReasons.push('Cart-level promotion applicable');
    }
  }

  // Check eligibility
  if (applicable) {
    const eligibilityResult = checkEligibility(promotion.eligibility, context);
    if (!eligibilityResult.eligible) {
      applicable = false;
      inapplicableReason = eligibilityResult.reason;
    } else {
      matchScore += 0.2;
      matchReasons.push('User eligible');
    }
  }

  return {
    promotion,
    matchScore: applicable ? Math.min(matchScore, 1) : 0,
    matchReasons,
    applicable,
    inapplicableReason,
  };
}

// ============================================================
// C. Eligibility Check
// ============================================================

function checkEligibility(
  eligibility: CommercePromotionEligibility,
  context: { userType?: string; cartValue: number }
): { eligible: boolean; reason?: string } {
  // Check eligibility type
  switch (eligibility.eligibilityType) {
    case 'all':
      return { eligible: true };

    case 'new_user':
      if (context.userType !== 'new') {
        return { eligible: false, reason: 'Only available for new users' };
      }
      return { eligible: true };

    case 'vip':
      if (context.userType !== 'vip') {
        return { eligible: false, reason: 'Only available for VIP users' };
      }
      return { eligible: true };

    case 'first_purchase':
      if (context.userType !== 'new') {
        return { eligible: false, reason: 'Only available for first purchase' };
      }
      return { eligible: true };

    default:
      return { eligible: true };
  }
}

// ============================================================
// D. Promotion Normalization
// ============================================================

/**
 * Normalize a raw promotion to platform-neutral format
 */
export function normalizePromotion(
  platform: CommercePlatform,
  rawPromotion: Record<string, unknown>
): CommercePromotion {
  const benefit = normalizeBenefit(rawPromotion.benefit);
  const eligibility = normalizeEligibility(rawPromotion.eligibility);

  return {
    promotionId: String(rawPromotion.promotionId || rawPromotion.id || ''),
    platform,
    promotionCode: rawPromotion.promotionCode ? String(rawPromotion.promotionCode) : undefined,
    promotionType: normalizePromotionType(rawPromotion.promotionType),
    title: String(rawPromotion.title || rawPromotion.name || ''),
    description: rawPromotion.description ? String(rawPromotion.description) : undefined,
    scope: normalizeScope(rawPromotion.scope),
    benefit,
    eligibility,
    applicableProducts: normalizeApplicableList(rawPromotion.applicableProducts),
    applicableCategories: normalizeApplicableList(rawPromotion.applicableCategories),
    applicableSellers: normalizeApplicableList(rawPromotion.applicableSellers),
    startDate: normalizeDate(rawPromotion.startDate),
    endDate: normalizeDate(rawPromotion.endDate),
    isStackable: Boolean(rawPromotion.isStackable ?? true),
    maxUses: rawPromotion.maxUses ? Number(rawPromotion.maxUses) : undefined,
    currentUses: rawPromotion.currentUses ? Number(rawPromotion.currentUses) : undefined,
    metadata: rawPromotion.metadata ? Object(rawPromotion.metadata) : {},
    createdAt: normalizeDate(rawPromotion.createdAt),
  };
}

function normalizeBenefit(benefit: unknown): CommercePromotionBenefit {
  const b = benefit as Record<string, unknown> || {};
  return {
    discountType: normalizeDiscountType(b.discountType),
    discountValue: Number(b.discountValue || b.value || 0),
    maxDiscount: b.maxDiscount ? Number(b.maxDiscount) : undefined,
    currency: b.currency ? String(b.currency) : undefined,
  };
}

function normalizeDiscountType(type: unknown): CommerceDiscountType {
  const typeStr = String(type || '').toLowerCase();
  if (typeStr.includes('percent') || typeStr.includes('%')) {
    return 'percentage';
  }
  if (typeStr.includes('fixed') || typeStr.includes('amount')) {
    return 'fixed_amount';
  }
  if (typeStr.includes('bogo') || typeStr.includes('buy one')) {
    return 'bogo';
  }
  if (typeStr.includes('ship') || typeStr.includes('shipping')) {
    return 'shipping';
  }
  return 'percentage';
}

function normalizeEligibility(eligibility: unknown): CommercePromotionEligibility {
  const e = eligibility as Record<string, unknown> || {};
  return {
    eligibilityType: normalizeEligibilityType(e.eligibilityType),
    conditions: normalizeConditions(e.conditions),
    excludedUserIds: e.excludedUserIds ? Array(e.excludedUserIds).map(String) : undefined,
  };
}

function normalizeEligibilityType(type: unknown): CommerceEligibilityType {
  const typeStr = String(type || 'all').toLowerCase();
  if (typeStr.includes('new')) return 'new_user';
  if (typeStr.includes('vip')) return 'vip';
  if (typeStr.includes('first')) return 'first_purchase';
  if (typeStr.includes('specific')) return 'specific_users';
  return 'all';
}

function normalizeConditions(conditions: unknown): CommercePromotionCondition[] {
  if (!Array.isArray(conditions)) return [];
  return conditions.map(c => c as CommercePromotionCondition);
}

function normalizeScope(scope: unknown): CommercePromotionScope {
  const scopeStr = String(scope || 'global').toLowerCase();
  if (scopeStr.includes('product')) return 'product';
  if (scopeStr.includes('category')) return 'category';
  if (scopeStr.includes('seller')) return 'seller';
  if (scopeStr.includes('cart')) return 'cart';
  return 'global';
}

function normalizePromotionType(type: unknown): CommercePromotionType {
  const typeStr = String(type || 'voucher').toLowerCase();
  if (typeStr.includes('coupon')) return 'coupon';
  if (typeStr.includes('discount')) return 'discount';
  if (typeStr.includes('flash') || typeStr.includes('deal')) return 'flash_sale';
  if (typeStr.includes('bundle')) return 'bundle';
  if (typeStr.includes('loyalty') || typeStr.includes('points')) return 'loyalty';
  return 'voucher';
}

function normalizeApplicableList(list: unknown): string[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.map(String);
}

function normalizeDate(date: unknown): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  return new Date(date);
}
