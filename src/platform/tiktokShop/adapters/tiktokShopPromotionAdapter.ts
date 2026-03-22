/**
 * TikTok Shop Promotion Adapter
 */

import type { PlatformPromotionAdapter } from '../../abstraction/platformAdapterContracts.js';

export function createTikTokShopPromotionAdapter(): PlatformPromotionAdapter {
  return {
    platform: 'tiktok_shop',
    resolvePromotions: async () => {
      // Placeholder - promotions not yet implemented
      return {
        success: false,
        candidates: [],
        resolutionContext: { cartValue: 0, platform: 'tiktok_shop' },
        resolvedAt: new Date(),
        errors: ['TikTok Shop promotion resolution not implemented'],
      };
    },
    getPromotionByCode: async () => null,
    evaluatePromotion: async () => ({
      applicable: false,
      reason: 'TikTok Shop promotion evaluation not implemented',
    }),
  };
}
