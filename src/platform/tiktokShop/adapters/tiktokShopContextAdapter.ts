/**
 * TikTok Shop Context Adapter
 */

import type { PlatformProductContextAdapter } from '../../abstraction/platformAdapterContracts.js';
import type { CommerceProductReference } from '../../contracts/productReference.js';
import { buildTikTokShopProductContext } from '../context/tiktokShopProductContextModel.js';

export function createTikTokShopContextAdapter(): PlatformProductContextAdapter {
  return {
    platform: 'tiktok_shop',
    resolve: async (reference) => {
      // Placeholder - context resolution not yet implemented
      return {
        success: false,
        source: 'none',
        confidence: 0,
        errors: ['TikTok Shop context resolution not implemented - this is a placeholder'],
        resolvedAt: new Date(),
      };
    },
    resolveBulk: async (references) => {
      return references.map(() => ({
        success: false,
        source: 'none',
        confidence: 0,
        errors: ['Bulk resolution not implemented'],
        resolvedAt: new Date(),
      }));
    },
  };
}
