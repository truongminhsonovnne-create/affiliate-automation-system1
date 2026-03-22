/**
 * TikTok Shop Capability Gap Service
 */

import type { TikTokShopBacklogItem, TikTokShopBacklogType, TikTokShopBacklogPriority } from '../types.js';

/**
 * Detect TikTok Shop capability gaps
 */
export function detectTikTokShopCapabilityGaps(
  capabilities: Record<string, number>
): Array<{ category: string; gap: string; priority: 'critical' | 'high' | 'medium' | 'low' }> {
  const gaps: Array<{ category: string; gap: string; priority: 'critical' | 'high' | 'medium' | 'low' }> = [];

  if (!capabilities.referenceParsing || capabilities.referenceParsing < 0.5) {
    gaps.push({ category: 'reference', gap: 'Reference parsing not implemented', priority: 'critical' });
  }

  if (!capabilities.contextModeling || capabilities.contextModeling < 0.5) {
    gaps.push({ category: 'context', gap: 'Context modeling incomplete', priority: 'high' });
  }

  if (!capabilities.promotionCompatibility || capabilities.promotionCompatibility < 0.5) {
    gaps.push({ category: 'promotion', gap: 'Promotion compatibility not established', priority: 'high' });
  }

  if (!capabilities.integration || capabilities.integration < 0.3) {
    gaps.push({ category: 'integration', gap: 'Integration not complete', priority: 'medium' });
  }

  return gaps;
}

/**
 * Build backlog items from capability gaps
 */
export function buildTikTokShopBacklogItems(
  gaps: Array<{ category: string; gap: string; priority: 'critical' | 'high' | 'medium' | 'low' }>
): Array<Omit<TikTokShopBacklogItem, 'id' | 'createdAt' | 'completedAt'>> {
  return gaps.map(gap => ({
    backlogType: gap.category as TikTokShopBacklogType,
    backlogStatus: 'pending',
    priority: gap.priority,
    title: gap.gap,
    description: `Capability gap in ${gap.category}: ${gap.gap}`,
  }));
}
