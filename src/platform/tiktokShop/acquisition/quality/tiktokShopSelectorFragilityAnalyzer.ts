/**
 * TikTok Shop Selector Fragility Analyzer
 * Analyzes selector fragility for extraction logic
 */

import type { TikTokShopSelectorFragility } from '../types.js';
import { TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Analyze selector fragility
 */
export function analyzeTikTokShopSelectorFragility(
  selector: string,
  options?: { selectorType?: string }
): TikTokShopSelectorFragility {
  let fragilityScore = 0;
  let pattern = 'stable';
  const recommendations: string[] = [];

  // Check for dynamic selectors
  if (selector.includes('$') || selector.includes('[') || selector.includes(':')) {
    fragilityScore += TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.DYNAMIC_SELECTOR_WEIGHT;
    pattern = 'dynamic';
    recommendations.push('Selector contains dynamic parts - consider using more stable selectors');
  }

  // Check for generic selectors
  const genericPatterns = ['div', 'span', 'a', 'li', 'ul'];
  if (genericPatterns.some((p) => selector === p || selector.startsWith(`${p} `))) {
    fragilityScore += TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.GENERIC_SELECTOR_WEIGHT;
    pattern = 'generic';
    recommendations.push('Selector is too generic - add more specific attributes');
  }

  // Check for partial selectors
  if (selector.length < 5 || selector.match(/^[a-z]+$/)) {
    fragilityScore += TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.PARTIAL_SELECTOR_WEIGHT;
    pattern = 'partial';
    recommendations.push('Selector is too short - may match multiple elements');
  }

  // Check for class-based selectors
  if (selector.includes('.') && !selector.includes('[class')) {
    fragilityScore += 0.1;
    recommendations.push('Class selectors may change - consider data-testid or ID');
  }

  // Cap score
  fragilityScore = Math.min(fragilityScore, 1);

  return {
    selector,
    fragilityScore,
    pattern,
    recommendation: recommendations.join('; ') || 'Selector appears stable',
  };
}

/**
 * Detect fragile extraction patterns
 */
export function detectFragileExtractionPatterns(
  selectors: Record<string, string>
): TikTokShopSelectorFragility[] {
  const results: TikTokShopSelectorFragility[] = [];

  for (const [field, selector] of Object.entries(selectors)) {
    if (selector) {
      const analysis = analyzeTikTokShopSelectorFragility(selector, { selectorType: field });
      results.push(analysis);
    }
  }

  return results;
}

/**
 * Build selector fragility summary
 */
export function buildSelectorFragilitySummary(
  analyses: TikTokShopSelectorFragility[]
): {
  totalSelectors: number;
  stableSelectors: number;
  fragileSelectors: number;
  veryFragileSelectors: number;
  averageFragility: number;
  recommendations: string[];
} {
  const stable = analyses.filter((a) => a.fragilityScore <= TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.STABLE).length;
  const fragile = analyses.filter(
    (a) => a.fragilityScore > TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.STABLE &&
      a.fragilityScore <= TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.FRAGILE
  ).length;
  const veryFragile = analyses.filter((a) => a.fragilityScore > TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.FRAGILE).length;

  const totalScore = analyses.reduce((sum, a) => sum + a.fragilityScore, 0);
  const averageFragility = analyses.length > 0 ? totalScore / analyses.length : 0;

  const recommendations = analyses
    .filter((a) => a.fragilityScore > TIKTOK_SHOP_SELECTOR_FRAGILITY_THRESHOLDS.FRAGILE)
    .map((a) => a.recommendation);

  return {
    totalSelectors: analyses.length,
    stableSelectors: stable,
    fragileSelectors: fragile,
    veryFragileSelectors: veryFragile,
    averageFragility,
    recommendations,
  };
}
