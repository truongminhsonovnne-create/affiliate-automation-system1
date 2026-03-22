/**
 * SEO Candidate Generator
 *
 * Generates SEO candidates for shop/category pages:
 * - Fetches real data
 * - Calculates quality signals
 * - Determines tier/wave eligibility
 * - Provides sitemap and internal linking eligibility
 *
 * This is the central hub for SEO scaling decisions.
 */

import { logger } from '../../utils/logger.js';
import {
  getShopSeoData,
  getCategorySeoData,
  getEligibleSeoEntities,
  getTopEntitiesForLinking,
  type SeoShopSignal,
  type SeoCategorySignal,
} from './seoDataIntegration.js';
import {
  calculateShopEntityScore,
  calculateCategoryEntityScore,
  selectPriorityWave,
  getWaveStatus,
  isSitemapEligible,
  isInternalLinkingPriority,
  SEO_SCORING_CONFIG,
  type SeoEntityScore,
  type SeoEntityTier,
} from '../policy/seoScoringPolicy.js';

// ============================================================================
// Types
// ============================================================================

export interface SeoCandidate {
  type: 'shop' | 'category';
  slug: string;
  name: string;
  score: SeoEntityScore;
  isIndexable: boolean;
  isSitemapEligible: boolean;
  isInternalLinkingPriority: boolean;
  wave: number;
}

export interface SeoScalingReport {
  generatedAt: Date;
  wave: number;
  totalShops: number;
  totalCategories: number;
  priorityShops: number;
  priorityCategories: number;
  indexableShops: number;
  indexableCategories: number;
  sitemapEligibleCount: number;
  internalLinkingPriorityCount: number;
  shopScores: SeoEntityScore[];
  categoryScores: SeoEntityScore[];
  errors: string[];
}

export interface InternalLinkingEntity {
  type: 'shop' | 'category';
  slug: string;
  name: string;
  priority: number;
}

// ============================================================================
// Candidate Generation
// ============================================================================

/**
 * Generate SEO candidates from real data
 */
export async function generateSeoCandidates(wave: number = 1): Promise<SeoScalingReport> {
  const errors: string[] = [];
  const startTime = Date.now();

  try {
    // Fetch all eligible entities from data integration
    const [eligibleShops, eligibleCategories, topEntities] = await Promise.all([
      getEligibleSeoEntities('shop', 3), // Min 3 products
      getEligibleSeoEntities('category', 3),
      getTopEntitiesForLinking(20),
    ]);

    // Calculate scores for each entity
    const shopScores: SeoEntityScore[] = [];
    const categoryScores: SeoEntityScore[] = [];

    // Process shops
    for (const shop of eligibleShops) {
      try {
        const shopData = await getShopSeoData(shop.slug);
        const score = calculateShopEntityScore(
          shopData.success && shopData.shop ? {
            id: shopData.shop.shopId,
            slug: shopData.shop.shopSlug,
            name: shopData.shop.shopName,
            category: shopData.shop.category,
            productCount: shopData.shop.productCount,
          } : null,
          shopData.success ? shopData.vouchers.map(v => ({
            code: v.code,
            description: v.description,
            discount: v.discount,
          })) : [],
          shopData.quality.lastUpdated,
          0 // related count would need separate query
        );
        shopScores.push(score);
      } catch (e) {
        errors.push(`Failed to score shop ${shop.slug}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // Process categories
    for (const category of eligibleCategories) {
      try {
        const categoryData = await getCategorySeoData(category.slug);
        const score = calculateCategoryEntityScore(
          categoryData.success && categoryData.category ? {
            id: categoryData.category.categoryId,
            slug: categoryData.category.categorySlug,
            name: categoryData.category.categoryName,
            shopCount: categoryData.category.shopCount,
          } : null,
          categoryData.success ? categoryData.voucherPatterns.map(v => ({
            pattern: v.code,
            typicalDiscount: v.discount,
            frequency: v.frequency,
          })) : [],
          categoryData.quality.lastUpdated,
          categoryData.success ? categoryData.relatedShops.length : 0
        );
        categoryScores.push(score);
      } catch (e) {
        errors.push(`Failed to score category ${category.slug}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // Get priority wave
    const priorityWave = selectPriorityWave(shopScores, categoryScores, wave);

    // Calculate stats
    const priorityShops = shopScores.filter(s => s.tier === 'priority').length;
    const priorityCategories = categoryScores.filter(s => s.tier === 'priority').length;
    const indexableShops = shopScores.filter(s => s.tier !== 'renderable').length;
    const indexableCategories = categoryScores.filter(s => s.tier !== 'renderable').length;

    // Count sitemap eligible (within wave)
    let sitemapEligibleCount = 0;
    let internalLinkingPriorityCount = 0;

    for (const score of [...shopScores, ...categoryScores]) {
      if (isSitemapEligible(score, wave)) sitemapEligibleCount++;
      if (isInternalLinkingPriority(score)) internalLinkingPriorityCount++;
    }

    const duration = Date.now() - startTime;
    logger.info({
      wave,
      totalShops: shopScores.length,
      totalCategories: categoryScores.length,
      priorityShops,
      priorityCategories,
      indexableShops,
      indexableCategories,
      sitemapEligibleCount,
      internalLinkingPriorityCount,
      duration,
      errors: errors.length,
    }, 'SEO candidates generated');

    return {
      generatedAt: new Date(),
      wave,
      totalShops: shopScores.length,
      totalCategories: categoryScores.length,
      priorityShops,
      priorityCategories,
      indexableShops,
      indexableCategories,
      sitemapEligibleCount,
      internalLinkingPriorityCount,
      shopScores,
      categoryScores,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Fatal error in candidate generation: ${message}`);
    logger.error({ error }, 'Failed to generate SEO candidates');

    return {
      generatedAt: new Date(),
      wave,
      totalShops: 0,
      totalCategories: 0,
      priorityShops: 0,
      priorityCategories: 0,
      indexableShops: 0,
      indexableCategories: 0,
      sitemapEligibleCount: 0,
      internalLinkingPriorityCount: 0,
      shopScores: [],
      categoryScores: [],
      errors,
    };
  }
}

/**
 * Get sitemap-eligible candidates only
 */
export async function getSitemapCandidates(wave: number = 1): Promise<SeoCandidate[]> {
  const report = await generateSeoCandidates(wave);
  const candidates: SeoCandidate[] = [];

  for (const score of [...report.shopScores, ...report.categoryScores]) {
    if (isSitemapEligible(score, wave)) {
      candidates.push({
        type: score.entityType,
        slug: score.entitySlug,
        name: score.entityName,
        score,
        isIndexable: score.tier !== 'renderable',
        isSitemapEligible: true,
        isInternalLinkingPriority: isInternalLinkingPriority(score),
        wave,
      });
    }
  }

  return candidates;
}

/**
 * Get entities for internal linking priority
 */
export async function getInternalLinkingCandidates(limit: number = 10): Promise<InternalLinkingEntity[]> {
  const report = await generateSeoCandidates(1);
  const candidates: InternalLinkingEntity[] = [];

  // Sort priority entities by score
  const allScores = [
    ...report.shopScores
      .filter(s => s.tier === 'priority')
      .map(s => ({ ...s, priority: s.totalScore })),
    ...report.categoryScores
      .filter(s => s.tier === 'priority')
      .map(s => ({ ...s, priority: s.totalScore })),
  ].sort((a, b) => b.priority - a.priority);

  for (let i = 0; i < Math.min(limit, allScores.length); i++) {
    const s = allScores[i];
    candidates.push({
      type: s.entityType,
      slug: s.entitySlug,
      name: s.entityName,
      priority: i + 1,
    });
  }

  return candidates;
}

/**
 * Get specific candidate by slug
 */
export async function getCandidateBySlug(
  slug: string,
  type: 'shop' | 'category'
): Promise<SeoCandidate | null> {
  try {
    if (type === 'shop') {
      const shopData = await getShopSeoData(slug);
      if (!shopData.success || !shopData.shop) return null;

      const score = calculateShopEntityScore(
        {
          id: shopData.shop.shopId,
          slug: shopData.shop.shopSlug,
          name: shopData.shop.shopName,
          category: shopData.shop.category,
          productCount: shopData.shop.productCount,
        },
        shopData.vouchers.map(v => ({
          code: v.code,
          description: v.description,
          discount: v.discount,
        })),
        shopData.quality.lastUpdated,
        0
      );

      return {
        type: 'shop',
        slug,
        name: shopData.shop.shopName,
        score,
        isIndexable: score.tier !== 'renderable',
        isSitemapEligible: isSitemapEligible(score),
        isInternalLinkingPriority: isInternalLinkingPriority(score),
        wave: 1,
      };
    } else {
      const categoryData = await getCategorySeoData(slug);
      if (!categoryData.success || !categoryData.category) return null;

      const score = calculateCategoryEntityScore(
        {
          id: categoryData.category.categoryId,
          slug: categoryData.category.categorySlug,
          name: categoryData.category.categoryName,
          shopCount: categoryData.category.shopCount,
        },
        categoryData.voucherPatterns.map(v => ({
          pattern: v.code,
          typicalDiscount: v.discount,
          frequency: v.frequency,
        })),
        categoryData.quality.lastUpdated,
        categoryData.relatedShops.length
      );

      return {
        type: 'category',
        slug,
        name: categoryData.category.categoryName,
        score,
        isIndexable: score.tier !== 'renderable',
        isSitemapEligible: isSitemapEligible(score),
        isInternalLinkingPriority: isInternalLinkingPriority(score),
        wave: 1,
      };
    }
  } catch (error) {
    logger.error({ slug, type, error }, 'Failed to get candidate by slug');
    return null;
  }
}
