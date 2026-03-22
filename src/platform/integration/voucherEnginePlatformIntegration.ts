/**
 * Voucher Engine Platform Integration
 *
 * Integrates voucher engine with multi-platform foundation.
 */

import type { CommercePlatform, CommercePromotion } from '../types.js';
import type { CommercePromotionResolutionResult } from '../contracts/promotion.js';
import { resolvePromotionCandidates } from '../contracts/promotion.js';

/**
 * Build platform-aware voucher resolution context
 */
export function buildPlatformAwareVoucherResolutionContext(params: {
  platform: CommercePlatform;
  productId?: string;
  categoryId?: string;
  sellerId?: string;
  cartValue: number;
  userType?: string;
}): CommercePromotionResolutionResult['resolutionContext'] {
  return {
    productId: params.productId,
    categoryId: params.categoryId,
    sellerId: params.sellerId,
    cartValue: params.cartValue,
    userType: params.userType,
    platform: params.platform,
  };
}

/**
 * Resolve promotion candidates for a specific platform
 */
export async function resolvePromotionCandidatesForPlatform(
  platform: CommercePlatform,
  promotions: CommercePromotion[],
  context: CommercePromotionResolutionResult['resolutionContext']
): Promise<CommercePromotionResolutionResult> {
  // Filter promotions to the specified platform
  const platformPromotions = promotions.filter(p => p.platform === platform);

  // Resolve candidates
  const candidates = resolvePromotionCandidates(platformPromotions, context);

  // Select the best candidate
  const selectedPromotion = candidates.find(c => c.applicable)?.promotion;

  return {
    success: true,
    candidates,
    selectedPromotion,
    resolutionContext: context,
    resolvedAt: new Date(),
  };
}

/**
 * Apply platform promotion contracts
 */
export function applyPlatformPromotionContracts(
  platform: CommercePlatform,
  promotions: CommercePromotion[]
): {
  platform: CommercePlatform;
  promotionCount: number;
  promotions: CommercePromotion[];
} {
  // Filter to platform-specific promotions
  const platformPromotions = promotions.filter(p => p.platform === platform);

  return {
    platform,
    promotionCount: platformPromotions.length,
    promotions: platformPromotions,
  };
}

/**
 * Get promotion resolution summary
 */
export function getPromotionResolutionSummary(result: CommercePromotionResolutionResult): {
  totalCandidates: number;
  applicableCount: number;
  selected: boolean;
  platform: CommercePlatform;
} {
  return {
    totalCandidates: result.candidates.length,
    applicableCount: result.candidates.filter(c => c.applicable).length,
    selected: !!result.selectedPromotion,
    platform: result.resolutionContext.platform,
  };
}
