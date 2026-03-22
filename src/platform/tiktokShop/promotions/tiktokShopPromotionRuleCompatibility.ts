/**
 * TikTok Shop Promotion Rule Compatibility
 *
 * Compares TikTok Shop promotion semantics with Shopee rule system.
 */

import type { TikTokShopPromotion } from '../types.js';

/**
 * Evaluate TikTok promotion rule compatibility with Shopee
 */
export function evaluateTikTokPromotionRuleCompatibility(
  tiktokPromotion: TikTokShopPromotion
): {
  compatible: boolean;
  level: 'full' | 'partial' | 'incompatible';
  differences: string[];
  mappings: string[];
} {
  const differences: string[] = [];
  const mappings: string[] = [];

  // Scope differences
  if (tiktokPromotion.scope === 'user_segment') {
    differences.push('TikTok user_segment scope not available in Shopee');
  }

  // Benefit type differences
  if (tiktokPromotion.benefit.discountType === 'bogo') {
    differences.push('Shopee does not support BOGO promotions directly');
    mappings.push('Map to fixed discount with quantity constraint');
  }

  // Eligibility differences
  if (tiktokPromotion.eligibility.eligibilityType === 'vip') {
    differences.push('Shopee uses different VIP tier system');
    mappings.push('Map to Shopee membership levels');
  }

  // Constraint differences
  for (const constraint of tiktokPromotion.eligibility.constraints) {
    if (constraint.type === 'region') {
      differences.push('Shopee uses region-based restrictions differently');
    }
  }

  return {
    compatible: differences.length === 0,
    level: differences.length === 0 ? 'full' : differences.length <= 2 ? 'partial' : 'incompatible',
    differences,
    mappings,
  };
}

/**
 * Compare promotion models between TikTok and Shopee
 */
export function compareTikTokAndShopeePromotionModels(): {
  scope: string[];
  benefit: string[];
  eligibility: string[];
  constraints: string[];
  unsupported: string[];
} {
  return {
    scope: [
      'TikTok: global, shop, product, category, user_segment, cart',
      'Shopee: global, seller, product, category, cart',
    ],
    benefit: [
      'TikTok: percentage, fixed_amount, bogo, shipping',
      'Shopee: percentage, fixed_amount, shipping',
    ],
    eligibility: [
      'TikTok: all, new_user, vip, specific_users, first_purchase, region',
      'Shopee: all, new_user, specific_users',
    ],
    constraints: [
      'TikTok: min_spend, max_discount, product_id, category_id, user_type, region',
      'Shopee: min_spend, max_discount, product_id, category_id, seller_id',
    ],
    unsupported: [
      'user_segment scope - TikTok specific',
      'bogo benefit type - requires workaround',
      'VIP eligibility - different tier system',
      'region constraint - different implementation',
    ],
  };
}
