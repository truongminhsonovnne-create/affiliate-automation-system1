/**
 * Related Surface Resolver
 *
 * Resolves internal linking for growth surfaces
 * - Related shops
 * - Related categories
 * - Related tools
 *
 * Principles:
 * - Link to quality-verified entities only
 * - No link farms
 * - Don't create disorienting experience
 * - Prioritize entities that are sitemap-eligible
 */

import type {
  GrowthSurfaceContext,
  GrowthSurfaceRelatedContent,
  RelatedShop,
  RelatedCategory,
  RelatedTool,
} from '../types/index.js';
import { GrowthSurfaceType } from '../types/index.js';
import {
  INTERNAL_LINK_LIMITS,
  GROWTH_SURFACE_LIMITS,
} from '../constants/index.js';
import { buildShopPath, buildCategoryPath, buildToolPagePath } from '../routing/growthSurfaceRoutes.js';
import { ToolPageType } from '../types/index.js';
import { getTopEntitiesForLinking, getCategorySeoData, getShopSeoData } from './seoDataIntegration.js';
import { isInternalLinkingPriority } from '../policy/seoScoringPolicy.js';

import type { ResolveRelatedOptions } from './types.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve related growth surfaces
 * Prioritizes entities that are in the priority wave for internal linking
 */
export async function resolveRelatedGrowthSurfaces(
  context: GrowthSurfaceContext,
  options: ResolveRelatedOptions = {}
): Promise<GrowthSurfaceRelatedContent> {
  const { limit = 3 } = options;

  switch (context.surfaceType) {
    case GrowthSurfaceType.SHOP:
      return resolveRelatedShopPages(context, { limit });
    case GrowthSurfaceType.CATEGORY:
      return resolveRelatedCategoryPages(context, { limit });
    case GrowthSurfaceType.TOOL_EXPLAINER:
      return resolveRelatedToolPages(context, { limit });
    default:
      return {
        shops: [],
        categories: [],
        tools: [],
      };
  }
}

// ============================================================================
// Related Shops
// ============================================================================

/**
 * Resolve related shop pages
 * Uses real data from SEO integration
 */
export async function resolveRelatedShopPages(
  context: GrowthSurfaceContext,
  options: ResolveRelatedOptions = {}
): Promise<GrowthSurfaceRelatedContent> {
  const { limit = GROWTH_SURFACE_LIMITS.MAX_RELATED_SHOPS } = options;

  try {
    // Get related shops from same category
    const relatedShops = await getRelatedShopsFromData(context.surfaceSlug, limit);

    // Get related categories (same category as the shop)
    const shopData = await getShopSeoData(context.surfaceSlug);
    const relatedCategories = shopData.success && shopData.shop?.category
      ? await getRelatedCategoriesByName(shopData.shop.category, limit)
      : [];

    // Get related tools
    const relatedTools = getRelatedToolsForShop(context.surfaceSlug);

    return {
      shops: relatedShops,
      categories: relatedCategories,
      tools: relatedTools,
    };
  } catch (error) {
    logger.error({ context, error }, 'Failed to resolve related shop pages');
    return {
      shops: [],
      categories: [],
      tools: getRelatedToolsForShop(context.surfaceSlug),
    };
  }
}

/**
 * Get related shops from data source (prioritizes quality entities)
 */
async function getRelatedShopsFromData(shopSlug: string, limit: number): Promise<RelatedShop[]> {
  try {
    const topEntities = await getTopEntitiesForLinking(limit + 5);

    // Filter out current shop and prioritize shops with data
    return topEntities.topShops
      .filter(s => s.shopSlug !== shopSlug && s.productCount > 0)
      .slice(0, limit)
      .map(shop => ({
        slug: shop.shopSlug,
        name: shop.shopName,
        description: shop.category ? `Shop ${shop.category}` : undefined,
      }));
  } catch (error) {
    logger.error({ shopSlug, error }, 'Failed to get related shops');
    return [];
  }
}

/**
 * Get related categories by name
 */
async function getRelatedCategoriesByName(categoryName: string, limit: number): Promise<RelatedCategory[]> {
  try {
    const topEntities = await getTopEntitiesForLinking(limit + 5);

    return topEntities.topCategories
      .filter(c => c.categoryName !== categoryName)
      .slice(0, limit)
      .map(cat => ({
        slug: cat.categorySlug,
        name: cat.categoryName,
      }));
  } catch (error) {
    logger.error({ categoryName, error }, 'Failed to get related categories');
    return [];
  }
}

/**
 * Get related tools for a shop context
 */
function getRelatedToolsForShop(shopSlug: string): RelatedTool[] {
  // Always show paste-link tool as primary
  return [
    {
      slug: 'paste-link',
      name: 'Dán link tìm mã',
      description: 'Tìm mã giảm giá tự động',
    },
    {
      slug: 'voucher-checker',
      name: 'Kiểm tra mã',
      description: 'Kiểm tra mã giảm giá',
    },
  ];
}

// ============================================================================
// Related Categories
// ============================================================================

/**
 * Resolve related category pages
 * Uses real data from SEO integration
 */
export async function resolveRelatedCategoryPages(
  context: GrowthSurfaceContext,
  options: ResolveRelatedOptions = {}
): Promise<GrowthSurfaceRelatedContent> {
  const { limit = GROWTH_SURFACE_LIMITS.MAX_RELATED_CATEGORIES } = options;

  try {
    // Get related categories
    const relatedCategories = await getRelatedCategoriesFromData(context.surfaceSlug, limit);

    // Get shops in this category
    const categoryData = await getCategorySeoData(context.surfaceSlug);
    const relatedShops = categoryData.success
      ? categoryData.relatedShops.slice(0, limit).map(shop => ({
          slug: shop.shopSlug,
          name: shop.shopName,
          description: shop.category ? `Shop ${shop.category}` : undefined,
        }))
      : [];

    // Get related tools
    const relatedTools = getRelatedToolsForCategory(context.surfaceSlug);

    return {
      shops: relatedShops,
      categories: relatedCategories,
      tools: relatedTools,
    };
  } catch (error) {
    logger.error({ context, error }, 'Failed to resolve related category pages');
    return {
      shops: [],
      categories: [],
      tools: getRelatedToolsForCategory(context.surfaceSlug),
    };
  }
}

/**
 * Get related categories from data source
 */
async function getRelatedCategoriesFromData(categorySlug: string, limit: number): Promise<RelatedCategory[]> {
  try {
    const topEntities = await getTopEntitiesForLinking(limit + 5);

    return topEntities.topCategories
      .filter(c => c.categorySlug !== categorySlug)
      .slice(0, limit)
      .map(cat => ({
        slug: cat.categorySlug,
        name: cat.categoryName,
      }));
  } catch (error) {
    logger.error({ categorySlug, error }, 'Failed to get related categories');
    return [];
  }
}

/**
 * Get related tools for a category context
 */
function getRelatedToolsForCategory(categorySlug: string): RelatedTool[] {
  return [
    {
      slug: 'paste-link',
      name: 'Dán link tìm mã',
      description: 'Tìm mã giảm giá tự động',
    },
    {
      slug: 'voucher-checker',
      name: 'Kiểm tra mã',
      description: 'Kiểm tra mã giảm giá',
    },
  ];
}

// ============================================================================
// Related Tools
// ============================================================================

/**
 * Resolve related tool pages
 * Uses priority entities for linking
 */
export async function resolveRelatedToolPages(
  context: GrowthSurfaceContext,
  options: ResolveRelatedOptions = {}
): Promise<GrowthSurfaceRelatedContent> {
  const { limit = GROWTH_SURFACE_LIMITS.MAX_RELATED_TOOLS } = options;

  // Get all other tool pages
  const relatedTools: RelatedTool[] = getRelatedToolPages(context.surfaceSlug, limit);

  // Get popular categories (prioritized by quality)
  const relatedCategories: RelatedCategory[] = await getPopularCategories(limit);

  // Get popular shops (prioritized by quality)
  const relatedShops: RelatedShop[] = await getPopularShops(limit);

  return {
    shops: relatedShops,
    categories: relatedCategories,
    tools: relatedTools,
  };
}

/**
 * Get related tool pages (excluding current one)
 */
function getRelatedToolPages(currentToolSlug: string, limit: number): RelatedTool[] {
  const allTools: RelatedTool[] = [
    {
      slug: 'paste-link',
      name: 'Dán link tìm mã',
      description: 'Tìm mã giảm giá tự động bằng cách dán link sản phẩm',
    },
    {
      slug: 'how-it-works',
      name: 'Cách sử dụng',
      description: 'Hướng dẫn sử dụng công cụ',
    },
    {
      slug: 'voucher-checker',
      name: 'Kiểm tra mã',
      description: 'Kiểm tra mã giảm giá có còn hoạt động không',
    },
  ];

  // Filter out current tool
  return allTools
    .filter((tool) => tool.slug !== currentToolSlug)
    .slice(0, limit);
}

/**
 * Get popular categories (prioritized by quality)
 */
async function getPopularCategories(limit: number): Promise<RelatedCategory[]> {
  try {
    const topEntities = await getTopEntitiesForLinking(limit);

    return topEntities.topCategories.map(cat => ({
      slug: cat.categorySlug,
      name: cat.categoryName,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get popular categories');
    return [];
  }
}

/**
 * Get popular shops (prioritized by quality)
 */
async function getPopularShops(limit: number): Promise<RelatedShop[]> {
  try {
    const topEntities = await getTopEntitiesForLinking(limit);

    return topEntities.topShops.map(shop => ({
      slug: shop.shopSlug,
      name: shop.shopName,
      description: shop.category ? `Shop ${shop.category}` : undefined,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get popular shops');
    return [];
  }
}

// ============================================================================
// Link Validation
// ============================================================================

/**
 * Validate that related links don't exceed limits
 */
export function validateRelatedLinksLimit(
  related: GrowthSurfaceRelatedContent
): { valid: boolean; warning?: string } {
  const totalLinks =
    related.shops.length +
    related.categories.length +
    related.tools.length;

  if (totalLinks > INTERNAL_LINK_LIMITS.MAX_RELATED_CONTENT_LINKS) {
    return {
      valid: false,
      warning: `Too many related links: ${totalLinks} (max: ${INTERNAL_LINK_LIMITS.MAX_RELATED_CONTENT_LINKS})`,
    };
  }

  return { valid: true };
}

// ============================================================================
// URL Builders (for template use)
// ============================================================================

/**
 * Build related shop URL
 */
export function buildRelatedShopUrl(shop: RelatedShop): string {
  return buildShopPath(shop.slug);
}

/**
 * Build related category URL
 */
export function buildRelatedCategoryUrl(category: RelatedCategory): string {
  return buildCategoryPath(category.slug);
}

/**
 * Build related tool URL
 */
export function buildRelatedToolUrl(tool: RelatedTool): string {
  return buildToolPagePath(tool.slug as ToolPageType);
}
