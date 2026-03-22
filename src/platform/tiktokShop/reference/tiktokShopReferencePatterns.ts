/**
 * TikTok Shop Reference Patterns
 *
 * Manages reference patterns for TikTok Shop URL parsing.
 */

import type { TikTokShopReferenceType } from '../types.js';

export interface TikTokShopReferencePattern {
  patternKey: string;
  patternType: TikTokShopReferenceType;
  regex: RegExp;
  extractors: Record<string, (match: RegExpMatchArray) => string | undefined>;
  normalizationRules: Record<string, string>;
}

const REFERENCE_PATTERNS: TikTokShopReferencePattern[] = [
  {
    patternKey: 'product_detail_full',
    patternType: 'product_detail',
    regex: /shop\.tiktok\.com\/([^/]+)\/product\/([^/?]+)/i,
    extractors: {
      shopId: (match) => match[1],
      productId: (match) => match[2],
    },
    normalizationRules: {
      baseUrl: 'https://shop.tiktok.com',
      pathTemplate: '/{shopId}/product/{productId}',
    },
  },
  {
    patternKey: 'product_detail_query',
    patternType: 'product_detail',
    regex: /[?&]itemId=([^&]+)/i,
    extractors: {
      productId: (match) => match[1],
    },
    normalizationRules: {
      queryParam: 'itemId',
    },
  },
  {
    patternKey: 'shop_username',
    patternType: 'shop',
    regex: /tiktok\.com\/@([^/?]+)/i,
    extractors: {
      shopId: (match) => match[1],
    },
    normalizationRules: {
      pathTemplate: '/@{shopId}',
    },
  },
  {
    patternKey: 'short_link',
    patternType: 'affiliate_link',
    regex: /(?:vm|vt)\.tiktok\.com\/([^/?]+)/i,
    extractors: {
      shortId: (match) => match[1],
    },
    normalizationRules: {
      baseUrl: 'https://vm.tiktok.com',
    },
  },
  {
    patternKey: 'video_detail',
    patternType: 'video',
    regex: /tiktok\.com\/@[^/]+\/video\/(\d+)/i,
    extractors: {
      videoId: (match) => match[1],
    },
    normalizationRules: {
      pathTemplate: '/video/{videoId}',
    },
  },
];

/**
 * Get all reference patterns
 */
export function getTikTokShopReferencePatterns(type?: TikTokShopReferenceType): TikTokShopReferencePattern[] {
  if (type) {
    return REFERENCE_PATTERNS.filter(p => p.patternType === type);
  }
  return [...REFERENCE_PATTERNS];
}

/**
 * Match input against reference patterns
 */
export function matchTikTokShopReferencePattern(input: string): {
  matched: boolean;
  pattern?: TikTokShopReferencePattern;
  extracted?: Record<string, string>;
} {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = input.match(pattern.regex);
    if (match) {
      const extracted: Record<string, string> = {};

      for (const [key, extractor] of Object.entries(pattern.extractors)) {
        const value = extractor(match);
        if (value) {
          extracted[key] = value;
        }
      }

      return {
        matched: true,
        pattern,
        extracted,
      };
    }
  }

  return { matched: false };
}

/**
 * Validate pattern set
 */
export function validateTikTokShopReferencePatternSet(): {
  valid: boolean;
  patterns: number;
  types: string[];
  warnings: string[];
} {
  const types = new Set(REFERENCE_PATTERNS.map(p => p.patternType));

  return {
    valid: REFERENCE_PATTERNS.length > 0,
    patterns: REFERENCE_PATTERNS.length,
    types: Array.from(types),
    warnings: types.has('unknown') ? ['Unknown reference type found in patterns'] : [],
  };
}

/**
 * Get supported reference types
 */
export function getSupportedTikTokShopReferenceTypes(): TikTokShopReferenceType[] {
  return ['product_detail', 'product_detail_short', 'shop', 'video', 'affiliate_link', 'search'];
}
