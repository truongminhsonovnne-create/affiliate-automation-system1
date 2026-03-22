/**
 * SEO Scoring & Priority Policy
 *
 * Controls which entities get indexed and in what priority order.
 * This prevents thin-page explosion and ensures crawl budget is spent wisely.
 *
 * Key concepts:
 * - Renderable: Can be accessed by users (always true)
 * - Indexable: Passes quality gate, can be indexed
 * - Priority-Indexable: High-quality subset that gets sitemap inclusion and internal linking priority
 * - Wave: Controlled batch of entities to index at a time
 */

import type { ShopData, CategoryData, VoucherHint, VoucherPattern } from '../types/index.js';

// ============================================================================
// Scoring Configuration
// ============================================================================

export const SEO_SCORING_CONFIG = {
  // Minimum scores for different tiers
  MIN_QUALITY_SCORE: 40,         // Pass quality gate
  MIN_INDEXABLE_SCORE: 50,        // Can be indexed (noindex, follow)
  MIN_PRIORITY_SCORE: 70,         // Priority index (sitemap + internal linking)

  // Data completeness weights
  WEIGHTS: {
    HAS_NAME: 5,
    HAS_DESCRIPTION: 10,
    HAS_CATEGORY: 5,
    HAS_PRODUCT_COUNT: 5,
    HAS_VOUCHER_DATA: 15,
    HAS_UNIQUE_CONTENT: 10,
    FRESHNESS_BONUS: 10,
    RELATED_ENTITIES: 10,
  },

  // Freshness thresholds (in days)
  FRESHNESS_THRESHOLD: 7,         // Data within 7 days is "fresh"
  STALE_THRESHOLD: 30,           // Data older than 30 days is "stale"

  // Priority wave configuration
  WAVE_SIZE: {
    INITIAL: 20,                  // First wave: 20 entities
    SECONDARY: 50,                // Second wave: 50 entities
    MAX_PER_TYPE: 100,           // Maximum per type (shop/category)
  },

  // Internal linking priority
  INTERNAL_LINK_PRIORITY_LIMIT: 10, // Only top 10 get prominent linking
} as const;

// ============================================================================
// Scoring Types
// ============================================================================

export interface SeoEntityScore {
  entityType: 'shop' | 'category';
  entitySlug: string;
  entityName: string;

  // Component scores
  dataCompleteness: number;      // 0-40
  contentQuality: number;        // 0-30
  dataFreshness: number;         // 0-15
  relatedStrength: number;        // 0-15

  // Total score
  totalScore: number;            // 0-100

  // Tier determination
  tier: SeoEntityTier;

  // Quality signals for diagnostics
  signals: SeoEntitySignal[];
}

export type SeoEntityTier = 'renderable' | 'indexable' | 'priority';

export interface SeoEntitySignal {
  type: 'positive' | 'negative' | 'neutral';
  source: string;
  message: string;
  value?: number;
}

export interface SeoWaveStatus {
  wave: number;
  totalEntities: number;
  priorityEntities: number;
  indexableEntities: number;
  renderableEntities: number;
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate SEO score for a shop entity
 */
export function calculateShopEntityScore(
  shopData: ShopData | null,
  voucherHints: VoucherHint[],
  lastUpdated: Date | null,
  relatedShopCount: number = 0
): SeoEntityScore {
  const signals: SeoEntitySignal[] = [];
  let dataCompleteness = 0;
  let contentQuality = 0;
  let dataFreshness = 0;
  let relatedStrength = 0;

  // Data Completeness (0-40)
  if (shopData) {
    // Has name
    if (shopData.name && shopData.name.length >= 2) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_NAME;
      signals.push({ type: 'positive', source: 'data', message: 'Has valid shop name' });
    }

    // Has description
    if (shopData.description && shopData.description.length >= 50) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_DESCRIPTION;
      contentQuality += SEO_SCORING_CONFIG.WEIGHTS.HAS_DESCRIPTION;
      signals.push({ type: 'positive', source: 'content', message: 'Has unique description' });
    } else if (shopData.description) {
      dataCompleteness += 3;
      signals.push({ type: 'neutral', source: 'data', message: 'Has short description', value: shopData.description.length });
    }

    // Has category
    if (shopData.category) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_CATEGORY;
      signals.push({ type: 'positive', source: 'data', message: 'Has category', value: shopData.category.length });
    }

    // Has product count
    if (shopData.productCount && shopData.productCount > 0) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_PRODUCT_COUNT;
      signals.push({ type: 'positive', source: 'data', message: 'Has product data', value: shopData.productCount });
    }

    // Check for generic description
    if (shopData.description) {
      const genericPatterns = [
        /dán link.*để tìm mã giảm giá/i,
        /tự động tìm.*mã giảm giá/i,
        /công cụ tìm mã/i,
      ];
      const isGeneric = genericPatterns.some(p => p.test(shopData.description));
      if (isGeneric) {
        contentQuality -= 10;
        signals.push({ type: 'negative', source: 'content', message: 'Description appears generic' });
      }
    }
  } else {
    signals.push({ type: 'negative', source: 'data', message: 'No shop data available' });
  }

  // Voucher Data (0-15)
  if (voucherHints.length > 0) {
    const voucherBonus = Math.min(voucherHints.length * 5, 15);
    dataCompleteness += voucherBonus;
    dataFreshness += 5;
    signals.push({ type: 'positive', source: 'data', message: 'Has voucher data', value: voucherHints.length });
  }

  // Data Freshness (0-15)
  if (lastUpdated) {
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= SEO_SCORING_CONFIG.FRESHNESS_THRESHOLD) {
      dataFreshness += SEO_SCORING_CONFIG.WEIGHTS.FRESHNESS_BONUS;
      signals.push({ type: 'positive', source: 'freshness', message: 'Data is fresh', value: Math.round(daysSinceUpdate) });
    } else if (daysSinceUpdate > SEO_SCORING_CONFIG.STALE_THRESHOLD) {
      dataFreshness = 0;
      signals.push({ type: 'negative', source: 'freshness', message: 'Data is stale', value: Math.round(daysSinceUpdate) });
    } else {
      dataFreshness += 5;
      signals.push({ type: 'neutral', source: 'freshness', message: 'Data is moderately fresh', value: Math.round(daysSinceUpdate) });
    }
  } else {
    signals.push({ type: 'neutral', source: 'freshness', message: 'No freshness data available' });
  }

  // Related Entities (0-15)
  if (relatedShopCount > 0) {
    relatedStrength = Math.min(relatedShopCount * 3, 15);
    signals.push({ type: 'positive', source: 'related', message: 'Has related entities', value: relatedShopCount });
  }

  // Calculate total
  const totalScore = Math.max(0, Math.min(100,
    dataCompleteness + contentQuality + dataFreshness + relatedStrength
  ));

  // Determine tier
  let tier: SeoEntityTier = 'renderable';
  if (totalScore >= SEO_SCORING_CONFIG.MIN_PRIORITY_SCORE) {
    tier = 'priority';
  } else if (totalScore >= SEO_SCORING_CONFIG.MIN_INDEXABLE_SCORE) {
    tier = 'indexable';
  }

  return {
    entityType: 'shop',
    entitySlug: shopData?.slug || 'unknown',
    entityName: shopData?.name || 'Unknown Shop',
    dataCompleteness,
    contentQuality,
    dataFreshness,
    relatedStrength,
    totalScore,
    tier,
    signals,
  };
}

/**
 * Calculate SEO score for a category entity
 */
export function calculateCategoryEntityScore(
  categoryData: CategoryData | null,
  voucherPatterns: VoucherPattern[],
  lastUpdated: Date | null,
  relatedShopCount: number = 0
): SeoEntityScore {
  const signals: SeoEntitySignal[] = [];
  let dataCompleteness = 0;
  let contentQuality = 0;
  let dataFreshness = 0;
  let relatedStrength = 0;

  // Data Completeness (0-40)
  if (categoryData) {
    // Has name
    if (categoryData.name && categoryData.name.length >= 2) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_NAME;
      signals.push({ type: 'positive', source: 'data', message: 'Has valid category name' });
    }

    // Has description
    if (categoryData.description && categoryData.description.length >= 50) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_DESCRIPTION;
      contentQuality += SEO_SCORING_CONFIG.WEIGHTS.HAS_DESCRIPTION;
      signals.push({ type: 'positive', source: 'content', message: 'Has unique description' });
    }

    // Has shop count
    if (categoryData.shopCount && categoryData.shopCount > 0) {
      dataCompleteness += SEO_SCORING_CONFIG.WEIGHTS.HAS_PRODUCT_COUNT;
      signals.push({ type: 'positive', source: 'data', message: 'Has shop data', value: categoryData.shopCount });
    }

    // Check for generic description
    if (categoryData.description) {
      const genericPatterns = [
        /tìm mã giảm giá.*trên shopee/i,
        /dán link.*để tìm mã/i,
        /công cụ tìm mã/i,
      ];
      const isGeneric = genericPatterns.some(p => p.test(categoryData.description));
      if (isGeneric) {
        contentQuality -= 10;
        signals.push({ type: 'negative', source: 'content', message: 'Description appears generic' });
      }
    }
  } else {
    signals.push({ type: 'negative', source: 'data', message: 'No category data available' });
  }

  // Voucher Patterns (0-15)
  if (voucherPatterns.length > 0) {
    const patternBonus = Math.min(voucherPatterns.length * 5, 15);
    dataCompleteness += patternBonus;
    dataFreshness += 5;
    signals.push({ type: 'positive', source: 'data', message: 'Has voucher patterns', value: voucherPatterns.length });
  }

  // Data Freshness (0-15)
  if (lastUpdated) {
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= SEO_SCORING_CONFIG.FRESHNESS_THRESHOLD) {
      dataFreshness += SEO_SCORING_CONFIG.WEIGHTS.FRESHNESS_BONUS;
      signals.push({ type: 'positive', source: 'freshness', message: 'Data is fresh', value: Math.round(daysSinceUpdate) });
    } else if (daysSinceUpdate > SEO_SCORING_CONFIG.STALE_THRESHOLD) {
      dataFreshness = 0;
      signals.push({ type: 'negative', source: 'freshness', message: 'Data is stale', value: Math.round(daysSinceUpdate) });
    } else {
      dataFreshness += 5;
    }
  }

  // Related Entities (0-15)
  if (relatedShopCount > 0) {
    relatedStrength = Math.min(relatedShopCount * 3, 15);
    signals.push({ type: 'positive', source: 'related', message: 'Has related shops', value: relatedShopCount });
  }

  // Calculate total
  const totalScore = Math.max(0, Math.min(100,
    dataCompleteness + contentQuality + dataFreshness + relatedStrength
  ));

  // Determine tier
  let tier: SeoEntityTier = 'renderable';
  if (totalScore >= SEO_SCORING_CONFIG.MIN_PRIORITY_SCORE) {
    tier = 'priority';
  } else if (totalScore >= SEO_SCORING_CONFIG.MIN_INDEXABLE_SCORE) {
    tier = 'indexable';
  }

  return {
    entityType: 'category',
    entitySlug: categoryData?.slug || 'unknown',
    entityName: categoryData?.name || 'Unknown Category',
    dataCompleteness,
    contentQuality,
    dataFreshness,
    relatedStrength,
    totalScore,
    tier,
    signals,
  };
}

// ============================================================================
// Wave Selection
// ============================================================================

/**
 * Select entities for the current wave based on scores
 */
export function selectPriorityWave(
  shopScores: SeoEntityScore[],
  categoryScores: SeoEntityScore[],
  waveNumber: number = 1
): {
  shops: SeoEntityScore[];
  categories: SeoEntityScore[];
} {
  const config = SEO_SCORING_CONFIG.WAVE_SIZE;

  // Calculate wave limits
  let shopLimit: number;
  let categoryLimit: number;

  switch (waveNumber) {
    case 1:
      shopLimit = Math.min(config.INITIAL, config.MAX_PER_TYPE);
      categoryLimit = Math.min(config.INITIAL, config.MAX_PER_TYPE);
      break;
    case 2:
      shopLimit = Math.min(config.SECONDARY, config.MAX_PER_TYPE);
      categoryLimit = Math.min(config.SECONDARY, config.MAX_PER_TYPE);
      break;
    default:
      shopLimit = config.MAX_PER_TYPE;
      categoryLimit = config.MAX_PER_TYPE;
  }

  // Filter to priority tier and sort by score
  const priorityShops = shopScores
    .filter(s => s.tier === 'priority')
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, shopLimit);

  const priorityCategories = categoryScores
    .filter(s => s.tier === 'priority')
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, categoryLimit);

  return {
    shops: priorityShops,
    categories: priorityCategories,
  };
}

/**
 * Get wave status for monitoring
 */
export function getWaveStatus(
  shopScores: SeoEntityScore[],
  categoryScores: SeoEntityScore[],
  waveNumber: number = 1
): SeoWaveStatus {
  const priorityWave = selectPriorityWave(shopScores, categoryScores, waveNumber);

  return {
    wave: waveNumber,
    totalEntities: shopScores.length + categoryScores.length,
    priorityEntities: priorityWave.shops.length + priorityWave.categories.length,
    indexableEntities: shopScores.filter(s => s.tier !== 'renderable').length +
                       categoryScores.filter(s => s.tier !== 'renderable').length,
    renderableEntities: shopScores.length + categoryScores.length,
  };
}

// ============================================================================
// Eligibility Check
// ============================================================================

/**
 * Check if an entity should be included in sitemap
 */
export function isSitemapEligible(score: SeoEntityScore, waveNumber: number = 1): boolean {
  // Only priority tier entities get sitemap inclusion
  if (score.tier !== 'priority') {
    return false;
  }

  // Check wave limits
  const wave = selectPriorityWave(
    score.entityType === 'shop' ? [score] : [],
    score.entityType === 'category' ? [score] : [],
    waveNumber
  );

  if (score.entityType === 'shop') {
    return wave.shops.some(s => s.entitySlug === score.entitySlug);
  } else {
    return wave.categories.some(c => c.entitySlug === score.entitySlug);
  }
}

/**
 * Check if entity should get prominent internal linking
 */
export function isInternalLinkingPriority(score: SeoEntityScore): boolean {
  return score.tier === 'priority';
}
