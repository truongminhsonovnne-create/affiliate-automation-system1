/**
 * TikTok Shop Support Level Service
 */

import type { TikTokShopDomainSupportLevel } from '../types.js';
import { SUPPORT_LEVEL_THRESHOLDS } from '../constants.js';

/**
 * Evaluate TikTok Shop support level
 */
export function evaluateTikTokShopSupportLevel(
  capabilities: Record<string, number>
): {
  supportLevel: TikTokShopDomainSupportLevel;
  scores: Record<string, number>;
  notSupportedReasons: string[];
} {
  const scores: Record<string, number> = {};
  const notSupportedReasons: string[] = [];

  // Reference parsing
  scores.reference = capabilities.referenceParsing ?? 0;
  if (scores.reference < SUPPORT_LEVEL_THRESHOLDS.MINIMUM) {
    notSupportedReasons.push('Reference parsing not implemented');
  }

  // Context modeling
  scores.context = capabilities.contextModeling ?? 0;
  if (scores.context < SUPPORT_LEVEL_THRESHOLDS.MINIMUM) {
    notSupportedReasons.push('Product context modeling not implemented');
  }

  // Promotion compatibility
  scores.promotion = capabilities.promotionCompatibility ?? 0;
  if (scores.promotion < SUPPORT_LEVEL_THRESHOLDS.MINIMUM) {
    notSupportedReasons.push('Promotion compatibility not implemented');
  }

  // Integration
  scores.integration = capabilities.integration ?? 0;
  if (scores.integration < SUPPORT_LEVEL_THRESHOLDS.MINIMUM) {
    notSupportedReasons.push('Integration not complete');
  }

  // Calculate overall
  const overall = (scores.reference + scores.context + scores.promotion + scores.integration) / 4;

  let supportLevel: TikTokShopDomainSupportLevel;
  if (overall >= SUPPORT_LEVEL_THRESHOLDS.FULL) {
    supportLevel = 'supported';
  } else if (overall >= SUPPORT_LEVEL_THRESHOLDS.PARTIAL) {
    supportLevel = 'partial';
  } else {
    supportLevel = 'unsupported';
  }

  return { supportLevel, scores, notSupportedReasons };
}

/**
 * Build support summary
 */
export function buildTikTokShopSupportSummary(
  supportLevel: TikTokShopDomainSupportLevel,
  scores: Record<string, number>
): {
  level: string;
  ready: boolean;
  summary: string;
} {
  const summary = Object.entries(scores)
    .map(([key, score]) => `${key}: ${(score * 100).toFixed(0)}%`)
    .join(', ');

  return {
    level: supportLevel,
    ready: supportLevel === 'supported',
    summary: `Support level: ${supportLevel}. Scores: ${summary}`,
  };
}
