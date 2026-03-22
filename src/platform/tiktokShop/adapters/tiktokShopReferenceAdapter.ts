/**
 * TikTok Shop Reference Adapter
 */

import type { PlatformProductReferenceAdapter } from '../../abstraction/platformAdapterContracts.js';
import type { PlatformReferenceNormalizationResult } from '../../contracts/productReference.js';
import { resolveTikTokShopProductReference } from '../reference/tiktokShopReferenceResolver.js';

/**
 * Create TikTok Shop reference adapter
 */
export function createTikTokShopReferenceAdapter(): PlatformProductReferenceAdapter {
  return {
    platform: 'tiktok_shop',
    canParse: (input: string) => {
      const lower = input.toLowerCase();
      return lower.includes('tiktok') || lower.includes('shop.tiktok');
    },
    normalize: async (input: string) => {
      const result = resolveTikTokShopProductReference(input);
      return {
        success: result.success,
        normalizedReference: result.data,
        platform: result.data?.platform,
        confidence: result.data?.confidence ?? 0,
        errors: result.error ? [result.error] : [],
      };
    },
    validate: () => ({ isValid: true, errors: [] }),
  };
}
