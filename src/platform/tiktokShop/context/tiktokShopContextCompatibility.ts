/**
 * TikTok Shop Context Compatibility Evaluator
 *
 * Evaluates context readiness for TikTok Shop.
 */

import type { TikTokShopProductContext, TikTokShopDomainWarning } from '../types.js';
import { SUPPORT_LEVEL_THRESHOLDS } from '../constants.js';

/**
 * Evaluate TikTok Shop context readiness
 */
export function evaluateTikTokShopContextReadiness(
  context: TikTokShopProductContext | null
): {
  isReady: boolean;
  supportLevel: 'supported' | 'partial' | 'unsupported';
  score: number;
  blockers: TikTokShopDomainWarning[];
  warnings: TikTokShopDomainWarning[];
  missingFields: string[];
} {
  const blockers: TikTokShopDomainWarning[] = [];
  const warnings: TikTokShopDomainWarning[] = [];
  const missingFields: string[] = [];
  let score = 0;

  if (!context) {
    return {
      isReady: false,
      supportLevel: 'unsupported',
      score: 0,
      blockers: [{
        category: 'context',
        severity: 'critical',
        title: 'No product context available',
        description: 'Cannot evaluate context without product data',
      }],
      warnings: [],
      missingFields: ['productContext'],
    };
  }

  // Check required fields
  if (!context.productId) {
    blockers.push({
      category: 'context',
      severity: 'critical',
      title: 'Missing product ID',
      description: 'Product ID is required for promotion resolution',
    });
    missingFields.push('productId');
  } else {
    score += 0.2;
  }

  if (!context.title) {
    blockers.push({
      category: 'context',
      severity: 'high',
      title: 'Missing product title',
      description: 'Product title is required',
    });
    missingFields.push('title');
  } else {
    score += 0.1;
  }

  // Check seller context
  if (!context.seller?.shopId) {
    blockers.push({
      category: 'context',
      severity: 'critical',
      title: 'Missing seller context',
      description: 'Seller ID is required for promotion eligibility',
    });
    missingFields.push('seller.shopId');
  } else {
    score += 0.2;
  }

  // Check price context
  if (!context.price?.currentPrice) {
    blockers.push({
      category: 'context',
      severity: 'critical',
      title: 'Missing price context',
      description: 'Current price is required for min spend calculations',
    });
    missingFields.push('price.currentPrice');
  } else {
    score += 0.2;
  }

  // Check category context
  if (!context.category?.categoryId) {
    warnings.push({
      category: 'context',
      severity: 'medium',
      title: 'Missing category context',
      description: 'Category ID enables category-specific promotions',
    });
    missingFields.push('category.categoryId');
  } else {
    score += 0.1;
  }

  // Check images
  if (!context.images || context.images.length === 0) {
    warnings.push({
      category: 'context',
      severity: 'low',
      title: 'Missing images',
      description: 'Product images improve conversion but not required',
    });
  } else {
    score += 0.1;
  }

  // Check inventory
  if (!context.inventory) {
    warnings.push({
      category: 'context',
      severity: 'medium',
      title: 'Missing inventory context',
      description: 'Inventory status affects promotion eligibility',
    });
  } else {
    score += 0.1;
  }

  const supportLevel = score >= SUPPORT_LEVEL_THRESHOLDS.FULL
    ? 'supported'
    : score >= SUPPORT_LEVEL_THRESHOLDS.PARTIAL
      ? 'partial'
      : 'unsupported';

  return {
    isReady: blockers.length === 0,
    supportLevel,
    score,
    blockers,
    warnings,
    missingFields,
  };
}

/**
 * Detect gaps in context model
 */
export function detectTikTokShopContextGaps(
  context: TikTokShopProductContext | null
): {
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
} {
  const gaps = {
    critical: [] as string[],
    high: [] as string[],
    medium: [] as string[],
    low: [] as string[],
  };

  if (!context) {
    gaps.critical.push('productContext');
    return gaps;
  }

  // Critical gaps
  if (!context.productId) gaps.critical.push('productId');
  if (!context.seller?.shopId) gaps.critical.push('seller.shopId');
  if (!context.price?.currentPrice) gaps.critical.push('price.currentPrice');

  // High gaps
  if (!context.title) gaps.high.push('title');
  if (!context.category?.categoryId) gaps.high.push('category.categoryId');

  // Medium gaps
  if (!context.description) gaps.medium.push('description');
  if (!context.inventory) gaps.medium.push('inventory');

  // Low gaps
  if (!context.images || context.images.length === 0) gaps.low.push('images');
  if (!context.seller?.rating) gaps.low.push('seller.rating');

  return gaps;
}

/**
 * Build context compatibility summary
 */
export function buildTikTokShopContextCompatibilitySummary(
  context: TikTokShopProductContext | null
): {
  completeness: number;
  readiness: string;
  gaps: string[];
  recommendations: string[];
} {
  const gaps = detectTikTokShopContextGaps(context);
  const allGaps = [...gaps.critical, ...gaps.high, ...gaps.medium, ...gaps.low];
  const completeness = 1 - (allGaps.length / 20); // 20 fields total

  const recommendations: string[] = [];

  if (gaps.critical.length > 0) {
    recommendations.push('Address critical context gaps before enabling promotion resolution');
  }

  if (gaps.high.length > 0) {
    recommendations.push('Complete high-priority context fields for better promotion matching');
  }

  if (gaps.medium.length > 0) {
    recommendations.push('Consider adding medium-priority fields for enhanced targeting');
  }

  return {
    completeness: Math.max(0, completeness),
    readiness: completeness >= 0.8 ? 'ready' : completeness >= 0.5 ? 'partial' : 'not_ready',
    gaps: allGaps,
    recommendations,
  };
}
