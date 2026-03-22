/**
 * TikTok Shop Promotion Constraint Compiler
 *
 * Compiles TikTok Shop promotion constraints to runtime-friendly structures.
 */

import type { TikTokShopPromotionConstraint, TikTokShopPromotionEligibility } from '../types.js';

/**
 * Compile TikTok Shop promotion constraints
 */
export function compileTikTokShopPromotionConstraints(
  constraints: TikTokShopPromotionConstraint[]
): {
  minSpend?: number;
  maxDiscount?: number;
  minQuantity?: number;
  productIds?: string[];
  categoryIds?: string[];
  regions?: string[];
  custom: Array<{ type: string; operator: string; value: unknown }>;
} {
  const compiled = {
    custom: [] as Array<{ type: string; operator: string; value: unknown }>,
  };

  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'min_spend':
        if (constraint.operator === 'gte' || constraint.operator === 'gt') {
          compiled.minSpend = Number(constraint.value);
        }
        break;

      case 'max_discount':
        if (constraint.operator === 'lte') {
          compiled.maxDiscount = Number(constraint.value);
        }
        break;

      case 'min_quantity':
        if (constraint.operator === 'gte') {
          compiled.minQuantity = Number(constraint.value);
        }
        break;

      case 'product_id':
        if (!compiled.productIds) compiled.productIds = [];
        if (constraint.operator === 'in' && Array.isArray(constraint.value)) {
          compiled.productIds.push(...constraint.value.map(String));
        } else {
          compiled.productIds.push(String(constraint.value));
        }
        break;

      case 'category_id':
        if (!compiled.categoryIds) compiled.categoryIds = [];
        if (constraint.operator === 'in' && Array.isArray(constraint.value)) {
          compiled.categoryIds.push(...constraint.value.map(String));
        } else {
          compiled.categoryIds.push(String(constraint.value));
        }
        break;

      case 'region':
        if (!compiled.regions) compiled.regions = [];
        if (constraint.operator === 'in' && Array.isArray(constraint.value)) {
          compiled.regions.push(...constraint.value.map(String));
        } else {
          compiled.regions.push(String(constraint.value));
        }
        break;

      default:
        compiled.custom.push({
          type: constraint.type,
          operator: constraint.operator,
          value: constraint.value,
        });
    }
  }

  return compiled;
}

/**
 * Compile TikTok promotion eligibility
 */
export function compileTikTokPromotionEligibility(
  eligibility: TikTokShopPromotionEligibility
): {
  isEligible: (context: {
    userType?: string;
    cartValue?: number;
    productIds?: string[];
    categoryIds?: string[];
    region?: string;
  }) => { eligible: boolean; reason?: string };
} {
  return {
    isEligible: (context) => {
      // Check eligibility type
      switch (eligibility.eligibilityType) {
        case 'all':
          break;

        case 'new_user':
          if (context.userType !== 'new') {
            return { eligible: false, reason: 'Only available for new users' };
          }
          break;

        case 'vip':
          if (context.userType !== 'vip') {
            return { eligible: false, reason: 'Only available for VIP users' };
          }
          break;

        case 'first_purchase':
          if (context.userType !== 'new') {
            return { eligible: false, reason: 'Only available for first purchase' };
          }
          break;

        case 'region':
          if (context.region && eligibility.constraints.length > 0) {
            const regionConstraint = eligibility.constraints.find(c => c.type === 'region');
            if (regionConstraint) {
              const allowedRegions = Array.isArray(regionConstraint.value)
                ? regionConstraint.value.map(String)
                : [String(regionConstraint.value)];
              if (!allowedRegions.includes(context.region)) {
                return { eligible: false, reason: 'Not available in your region' };
              }
            }
          }
          break;
      }

      // Check constraints
      const constraints = compileTikTokShopPromotionConstraints(eligibility.constraints);

      if (constraints.minSpend && (context.cartValue || 0) < constraints.minSpend) {
        return {
          eligible: false,
          reason: `Minimum spend of ${constraints.minSpend} required`,
        };
      }

      if (constraints.productIds && constraints.productIds.length > 0) {
        const hasProduct = context.productIds?.some(id => constraints.productIds!.includes(id));
        if (!hasProduct) {
          return { eligible: false, reason: 'Not applicable to this product' };
        }
      }

      return { eligible: true };
    },
  };
}

/**
 * Build constraint summary
 */
export function buildTikTokPromotionConstraintSummary(
  constraints: TikTokShopPromotionConstraint[]
): {
  summary: string;
  isSimple: boolean;
} {
  const compiled = compileTikTokShopPromotionConstraints(constraints);

  const parts: string[] = [];

  if (compiled.minSpend) {
    parts.push(`Min spend: ${compiled.minSpend}`);
  }

  if (compiled.maxDiscount) {
    parts.push(`Max discount: ${compiled.maxDiscount}`);
  }

  if (compiled.minQuantity) {
    parts.push(`Min quantity: ${compiled.minQuantity}`);
  }

  if (compiled.productIds?.length) {
    parts.push(`${compiled.productIds.length} products`);
  }

  if (compiled.categoryIds?.length) {
    parts.push(`${compiled.categoryIds.length} categories`);
  }

  return {
    summary: parts.length > 0 ? parts.join(', ') : 'No constraints',
    isSimple: compiled.custom.length === 0,
  };
}
