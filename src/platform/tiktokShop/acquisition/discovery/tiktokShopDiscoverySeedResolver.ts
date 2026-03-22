/**
 * TikTok Shop Discovery Seed Resolver
 * Resolves discovery seeds for TikTok Shop acquisition
 */

import type { TikTokShopDiscoverySeed } from '../types.js';
import { TikTokShopDiscoverySeedType } from '../types.js';
import { TIKTOK_SHOP_URL_PATTERNS, TIKTOK_SHOP_DEFAULT_SEEDS } from '../constants.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Resolve discovery seeds from various inputs
 */
export async function resolveTikTokShopDiscoverySeeds(
  input: {
    seedType?: TikTokShopDiscoverySeedType;
    seeds?: string[];
    categories?: string[];
  }
): Promise<TikTokShopDiscoverySeed[]> {
  logger.info({ msg: 'Resolving TikTok Shop discovery seeds', input });

  const seeds: TikTokShopDiscoverySeed[] = [];

  // Process curated URLs
  if (input.seeds && input.seeds.length > 0) {
    for (const seed of input.seeds) {
      const validated = validateTikTokShopDiscoverySeed(seed, TikTokShopDiscoverySeedType.CURATED_URL);
      if (validated) {
        seeds.push({
          seedType: TikTokShopDiscoverySeedType.CURATED_URL,
          seedValue: seed,
          metadata: { source: 'input' },
        });
      }
    }
  }

  // Process category seeds
  if (input.categories && input.categories.length > 0) {
    for (const category of input.categories) {
      const categoryUrl = `https://shop.tiktok.com/category/${category.toLowerCase().replace(/\s+/g, '-')}`;
      seeds.push({
        seedType: TikTokShopDiscoverySeedType.CATEGORY,
        seedValue: categoryUrl,
        metadata: { category },
      });
    }
  }

  // If no seeds provided, use defaults
  if (seeds.length === 0) {
    logger.info({ msg: 'No seeds provided, using defaults' });
    return buildTikTokShopSeedSet(TIKTOK_SHOP_DEFAULT_SEEDS.CURATED_URLS);
  }

  return seeds;
}

/**
 * Build seed set from predefined sources
 */
export function buildTikTokShopSeedSet(
  predefinedSeeds: Array<{
    seedType: 'curated_url' | 'keyword' | 'category' | 'manual';
    seedValue: string;
    metadata?: Record<string, unknown>;
  }>
): TikTokShopDiscoverySeed[] {
  return predefinedSeeds.map((seed) => ({
    seedType: seed.seedType as TikTokShopDiscoverySeedType,
    seedValue: seed.seedValue,
    metadata: seed.metadata,
  }));
}

/**
 * Validate discovery seed
 */
export function validateTikTokShopDiscoverySeed(
  seed: string,
  expectedType: TikTokShopDiscoverySeedType
): boolean {
  try {
    const url = new URL(seed);

    // Check if it's a TikTok Shop URL
    const isTikTokShop = url.hostname.includes('tiktok.com') || url.hostname.includes('shop.tiktok.com');

    if (!isTikTokShop) {
      logger.warn({ msg: 'Seed is not a TikTok Shop URL', seed });
      return false;
    }

    // Validate based on type
    switch (expectedType) {
      case TikTokShopDiscoverySeedType.CURATED_URL:
        return validateCuratedUrl(seed);

      case TikTokShopDiscoverySeedType.KEYWORD:
        return validateKeyword(seed);

      case TikTokShopDiscoverySeedType.CATEGORY:
        return validateCategory(seed);

      case TikTokShopDiscoverySeedType.MANUAL:
        return true;

      default:
        return false;
    }
  } catch (error) {
    logger.warn({ msg: 'Invalid seed URL', seed, error });
    return false;
  }
}

function validateCuratedUrl(url: string): boolean {
  return TIKTOK_SHOP_URL_PATTERNS.PRODUCT_PAGE.some((pattern) => pattern.test(url)) ||
    TIKTOK_SHOP_URL_PATTERNS.CATEGORY_PAGE.some((pattern) => pattern.test(url)) ||
    TIKTOK_SHOP_URL_PATTERNS.SELLER_PAGE.some((pattern) => pattern.test(url));
}

function validateKeyword(url: string): boolean {
  return TIKTOK_SHOP_URL_PATTERNS.SEARCH_PAGE.some((pattern) => pattern.test(url));
}

function validateCategory(url: string): boolean {
  return TIKTOK_SHOP_URL_PATTERNS.CATEGORY_PAGE.some((pattern) => pattern.test(url));
}

/**
 * Expand category seed to multiple URLs
 */
export function expandCategorySeed(categorySeed: string): string[] {
  const seeds: string[] = [];
  const category = categorySeed.replace('https://shop.tiktok.com/category/', '');

  // Add main category page
  seeds.push(categorySeed);

  // Add subcategory variations
  const subcategories = ['new', 'popular', 'trending'];

  for (const sub of subcategories) {
    seeds.push(`https://shop.tiktok.com/category/${category}?sort=${sub}`);
  }

  return seeds;
}

/**
 * Get seed metadata
 */
export function getTikTokShopSeedMetadata(seed: TikTokShopDiscoverySeed): Record<string, unknown> {
  return {
    ...seed.metadata,
    resolvedAt: new Date().toISOString(),
    type: seed.seedType,
  };
}
