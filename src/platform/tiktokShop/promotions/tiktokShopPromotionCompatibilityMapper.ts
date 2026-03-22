/**
 * TikTok Shop Promotion Compatibility Mapper
 *
 * Maps TikTok Shop promotions to platform-neutral commerce promotion contracts.
 */

import type {
  TikTokShopPromotion,
  TikTokShopPromotionCompatibilityResult,
  TikTokShopPromotionGap,
} from '../types.js';
import { COMPATIBILITY_SCORE_THRESHOLDS } from '../constants.js';

/**
 * Map TikTok Shop promotion to commerce promotion
 */
export function mapTikTokShopPromotionToCommercePromotion(
  tiktokPromotion: TikTokShopPromotion
): {
  success: boolean;
  commercePromotion?: Record<string, unknown>;
  gaps: TikTokShopPromotionGap[];
  warnings: TikTokShopPromotionGap[];
} {
  const gaps: TikTokShopPromotionGap[] = [];
  const warnings: TikTokShopPromotionGap[] = [];

  // Build commerce promotion structure
  const commercePromotion: Record<string, unknown> = {
    promotionId: tiktokPromotion.promotionId,
    platform: 'tiktok_shop',
    promotionCode: tiktokPromotion.promotionCode,
    promotionType: mapPromotionType(tiktokPromotion.promotionType),
    title: tiktokPromotion.title,
    description: tiktokPromotion.description,
    scope: mapScope(tiktokPromotion.scope),
    benefit: {
      discountType: mapDiscountType(tiktokPromotion.benefit.discountType),
      discountValue: tiktokPromotion.benefit.discountValue,
      maxDiscount: tiktokPromotion.benefit.maxDiscount,
      currency: tiktokPromotion.benefit.currency,
    },
    eligibility: {
      eligibilityType: mapEligibilityType(tiktokPromotion.eligibility.eligibilityType),
      conditions: mapConstraints(tiktokPromotion.eligibility.constraints),
    },
    startDate: tiktokPromotion.startDate.toISOString(),
    endDate: tiktokPromotion.endDate.toISOString(),
    isStackable: tiktokPromotion.isStackable,
    maxUses: tiktokPromotion.maxUses,
    currentUses: tiktokPromotion.currentUses,
  };

  // Check for gaps
  if (!tiktokPromotion.promotionCode) {
    gaps.push({
      field: 'promotionCode',
      gapType: 'missing',
      severity: 'medium',
      description: 'TikTok Shop promotion does not have a code - may limit user-facing application',
      commerceEquivalent: 'promotionCode',
    });
  }

  if (tiktokPromotion.scope === 'user_segment') {
    gaps.push({
      field: 'scope',
      gapType: 'unsupported',
      severity: 'high',
      description: 'User segment scope not directly supported in commerce contracts',
      commerceEquivalent: 'Use eligibility conditions instead',
    });
  }

  if (tiktokPromotion.benefit.discountType === 'bogo') {
    gaps.push({
      field: 'benefit.discountType',
      gapType: 'unsupported',
      severity: 'medium',
      description: 'Buy-one-get-one promotions require custom handling',
      commerceEquivalent: 'Fixed amount discount with complex eligibility',
    });
  }

  // Check warnings
  if (tiktokPromotion.maxUses && !tiktokPromotion.currentUses) {
    warnings.push({
      field: 'usage_tracking',
      gapType: 'missing',
      severity: 'low',
      description: 'Usage tracking not available in current context',
      commerceEquivalent: 'Track separately',
    });
  }

  return {
    success: gaps.filter(g => g.severity === 'critical').length === 0,
    commercePromotion,
    gaps,
    warnings,
  };
}

/**
 * Evaluate TikTok promotion compatibility
 */
export function evaluateTikTokPromotionCompatibility(
  tiktokPromotion: TikTokShopPromotion
): TikTokShopPromotionCompatibilityResult {
  const mapped = mapTikTokShopPromotionToCommercePromotion(tiktokPromotion);

  // Calculate compatibility score
  let score = 1.0;

  // Deduct for gaps
  for (const gap of mapped.gaps) {
    switch (gap.severity) {
      case 'critical':
        score -= 0.3;
        break;
      case 'high':
        score -= 0.2;
        break;
      case 'medium':
        score -= 0.1;
        break;
      case 'low':
        score -= 0.05;
        break;
    }
  }

  // Deduct for warnings
  for (const warning of mapped.warnings) {
    score -= 0.02;
  }

  score = Math.max(0, Math.min(1, score));

  // Determine compatibility level
  let compatibilityLevel: 'full' | 'partial' | 'unsupported' = 'full';
  if (score < COMPATIBILITY_SCORE_THRESHOLDS.MINIMUM) {
    compatibilityLevel = 'unsupported';
  } else if (score < COMPATIBILITY_SCORE_THRESHOLDS.PARTIAL) {
    compatibilityLevel = 'partial';
  }

  const fullFields = ['promotionId', 'title', 'scope', 'benefit', 'eligibility', 'dates'];
  const partialFields = mapped.gaps.filter(g => g.gapType === 'missing').map(g => g.field);
  const unsupportedFields = mapped.gaps.filter(g => g.gapType === 'unsupported').map(g => g.field);

  return {
    isCompatible: score >= COMPATIBILITY_SCORE_THRESHOLDS.PARTIAL,
    compatibilityLevel,
    compatibilityScore: score,
    mappedFields: fullFields,
    partialFields,
    unsupportedFields,
    blockers: mapped.gaps.filter(g => g.severity === 'critical' || g.severity === 'high'),
    warnings: mapped.warnings,
  };
}

/**
 * Detect TikTok promotion compatibility gaps
 */
export function detectTikTokPromotionCompatibilityGaps(
  promotions: TikTokShopPromotion[]
): {
  critical: TikTokShopPromotionGap[];
  high: TikTokShopPromotionGap[];
  medium: TikTokShopPromotionGap[];
  low: TikTokShopPromotionGap[];
} {
  const allGaps = {
    critical: [] as TikTokShopPromotionGap[],
    high: [] as TikTokShopPromotionGap[],
    medium: [] as TikTokShopPromotionGap[],
    low: [] as TikTokShopPromotionGap[],
  };

  for (const promotion of promotions) {
    const result = evaluateTikTokPromotionCompatibility(promotion);

    for (const blocker of result.blockers) {
      allGaps[blocker.severity].push(blocker);
    }

    for (const warning of result.warnings) {
      allGaps[warning.severity].push(warning);
    }
  }

  return allGaps;
}

/**
 * Build TikTok promotion compatibility summary
 */
export function buildTikTokPromotionCompatibilitySummary(
  promotions: TikTokShopPromotion[]
): {
  total: number;
  fullyCompatible: number;
  partiallyCompatible: number;
  notCompatible: number;
  averageScore: number;
  commonGaps: string[];
  recommendations: string[];
} {
  let fullyCompatible = 0;
  let partiallyCompatible = 0;
  let notCompatible = 0;
  let totalScore = 0;

  const gapFrequency: Record<string, number> = {};

  for (const promotion of promotions) {
    const result = evaluateTikTokPromotionCompatibility(promotion);
    totalScore += result.compatibilityScore;

    if (result.compatibilityLevel === 'full') {
      fullyCompatible++;
    } else if (result.compatibilityLevel === 'partial') {
      partiallyCompatible++;
    } else {
      notCompatible++;
    }

    // Track gap frequency
    for (const gap of [...result.blockers, ...result.warnings]) {
      gapFrequency[gap.field] = (gapFrequency[gap.field] || 0) + 1;
    }
  }

  const commonGaps = Object.entries(gapFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field]) => field);

  const recommendations: string[] = [];
  if (notCompatible > fullyCompatible) {
    recommendations.push('Majority of promotions are not compatible - review promotion modeling');
  }
  if (commonGaps.length > 0) {
    recommendations.push(`Address common gaps: ${commonGaps.join(', ')}`);
  }

  return {
    total: promotions.length,
    fullyCompatible,
    partiallyCompatible,
    notCompatible,
    averageScore: promotions.length > 0 ? totalScore / promotions.length : 0,
    commonGaps,
    recommendations,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function mapPromotionType(tiktokType: string): string {
  const mapping: Record<string, string> = {
    discount: 'discount',
    voucher: 'voucher',
    coupon: 'coupon',
    flash_sale: 'flash_sale',
    bundle: 'bundle',
    free_shipping: 'shipping',
    new_user: 'discount',
    loyalty: 'discount',
    campaign: 'discount',
    unknown: 'discount',
  };
  return mapping[tiktokType] || 'discount';
}

function mapScope(tiktokScope: string): string {
  const mapping: Record<string, string> = {
    global: 'global',
    shop: 'seller',
    product: 'product',
    category: 'category',
    user_segment: 'global', // Not directly supported
    cart: 'cart',
  };
  return mapping[tiktokScope] || 'global';
}

function mapDiscountType(tiktokType: string): string {
  const mapping: Record<string, string> = {
    percentage: 'percentage',
    fixed_amount: 'fixed_amount',
    bogo: 'percentage', // Simplified
    shipping: 'shipping',
  };
  return mapping[tiktokType] || 'percentage';
}

function mapEligibilityType(tiktokType: string): string {
  const mapping: Record<string, string> = {
    all: 'all',
    new_user: 'new_user',
    vip: 'vip',
    specific_users: 'specific_users',
    first_purchase: 'first_purchase',
    region: 'all',
  };
  return mapping[tiktokType] || 'all';
}

function mapConstraints(
  constraints: { type: string; operator: string; value: unknown }[]
): Array<{
  type: string;
  operator: string;
  value: unknown;
}> {
  return constraints.map(c => ({
    type: c.type,
    operator: c.operator,
    value: c.value,
  }));
}
