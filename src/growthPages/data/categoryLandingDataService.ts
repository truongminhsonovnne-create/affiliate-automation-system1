/**
 * Category Landing Data Service
 *
 * Loads and builds data for category landing pages
 * - Category overview data (from SEO data integration)
 * - Typical voucher patterns
 * - CTA models
 * - Related content
 */

import type {
  CategoryLandingPageData,
  CategoryData,
  VoucherPattern,
  GrowthSurfaceSummary,
  GrowthSurfaceCtaModel,
  GrowthSurfaceRelatedContent,
  GrowthSurfaceNavigationModel,
  GrowthSurfaceMetadata,
  GrowthSurfaceStatus,
} from '../types/index.js';
import {
  GrowthSurfaceType,
  SurfaceCtaType,
} from '../types/index.js';
import {
  CACHE_TTL,
  STALE_THRESHOLDS,
  GROWTH_SURFACE_LIMITS,
  CTA_DEFAULTS,
} from '../constants/index.js';
import { buildCategoryPath, buildShopPath } from '../routing/growthSurfaceRoutes.js';
import { buildCategorySeoModel } from '../seo/seoModelBuilder.js';
import { checkCategoryPageQuality } from '../policy/contentQualityGuardrail.js';
import { getCachedGrowthSurface, setCachedGrowthSurface, buildGrowthSurfaceCacheKey } from '../cache/growthSurfaceCache.js';
import { resolveRelatedGrowthSurfaces } from './relatedSurfaceResolver.js';
import { buildGrowthBreadcrumbs } from '../navigation/growthNavigationModel.js';
import { getCategorySeoData, getTopEntitiesForLinking, type SeoVoucherSignal, type SeoShopSignal } from './seoDataIntegration.js';

import { logger } from '../../utils/logger.js';

// ============================================================================
// Data Fetching Interfaces
// ============================================================================

export interface CategoryDataSource {
  getCategoryBySlug(slug: string): Promise<CategoryData | null>;
  getVoucherPatternsForCategory(categoryId: string): Promise<VoucherPattern[]>;
}

export interface GetCategoryLandingOptions {
  includeVoucherPatterns?: boolean;
  includeRelated?: boolean;
  preview?: boolean;
  locale?: string;
}

// ============================================================================
// Data Integration with Real Sources
// ============================================================================

/**
 * Get category data from SEO data integration
 */
export async function getCategoryDataFromSource(categorySlug: string): Promise<CategoryData | null> {
  try {
    const result = await getCategorySeoData(categorySlug);

    if (!result.success || !result.category) {
      logger.debug({ categorySlug }, 'Category not found in data integration');
      return null;
    }

    const { category } = result;

    // Build CategoryData from real signals
    return {
      id: category.categoryId,
      slug: category.categorySlug,
      name: category.categoryName,
      description: undefined, // Will be derived if needed
      icon: undefined,
      shopCount: category.shopCount,
    };
  } catch (error) {
    logger.error({ categorySlug, error }, 'Failed to fetch category data from source');
    return null;
  }
}

/**
 * Get voucher patterns for a category from real data
 */
export async function getVoucherPatternsFromSource(categoryId: string): Promise<VoucherPattern[]> {
  try {
    const result = await getCategorySeoData(categoryId.replace('cat_', ''));

    if (!result.success) {
      return [];
    }

    return result.voucherPatterns.slice(0, GROWTH_SURFACE_LIMITS.MAX_VOUCHER_PATTERNS).map((v: SeoVoucherSignal) => ({
      pattern: v.code,
      typicalDiscount: v.discount,
      frequency: v.frequency,
    }));
  } catch (error) {
    logger.error({ categoryId, error }, 'Failed to fetch voucher patterns from source');
    return [];
  }
}

// ============================================================================
// Main Data Service
// ============================================================================

/**
 * Get category landing page data
 */
export async function getCategoryLandingPageData(
  categorySlug: string,
  options: GetCategoryLandingOptions = {}
): Promise<CategoryLandingPageData | null> {
  const {
    includeVoucherPatterns = true,
    includeRelated = true,
    preview = false,
  } = options;

  // Try cache first (skip in preview mode)
  if (!preview) {
    const cacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.CATEGORY, categorySlug);
    const cached = await getCachedGrowthSurface<CategoryLandingPageData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch category data from real source
  const categoryData = await getCategoryDataFromSource(categorySlug);

  if (!categoryData) {
    logger.debug({ categorySlug }, 'Category data not found, returning null');
    return null;
  }

  // Fetch voucher patterns from real source
  let voucherPatterns: VoucherPattern[] = [];
  if (includeVoucherPatterns && categoryData.id) {
    voucherPatterns = await getVoucherPatternsFromSource(categoryData.id);
  }

  // Quality check - determine if page should be indexed
  const qualityCheck = checkCategoryPageQuality(categoryData, voucherPatterns);
  const shouldIndex = qualityCheck.isIndexable;

  logger.debug({
    categorySlug,
    hasData: !!categoryData,
    shopCount: categoryData.shopCount,
    voucherPatternCount: voucherPatterns.length,
    qualityScore: qualityCheck.qualityScore,
    shouldIndex,
    qualityIssues: qualityCheck.issues,
  }, 'Category page quality check result');

  // Build SEO model
  const seo = buildCategorySeoModel({
    categoryName: categoryData.name,
    categorySlug: categoryData.slug,
    description: categoryData.description,
    typicalSavings: getTypicalSavings(voucherPatterns),
    voucherPatterns: voucherPatterns.map(p => p.pattern),
    noIndex: !shouldIndex,
  });

  // Build summary
  const summary = buildCategoryLandingSummary(categoryData, voucherPatterns);

  // Build CTA model
  const cta = buildCategoryLandingCtaModel(categoryData);

  // Build related content
  let related: GrowthSurfaceRelatedContent = {
    shops: [],
    categories: [],
    tools: [],
  };
  if (includeRelated) {
    related = await resolveRelatedGrowthSurfaces(
      {
        surfaceType: GrowthSurfaceType.CATEGORY,
        surfaceSlug: categorySlug,
        entryTimestamp: Date.now(),
      },
      { limit: 3 }
    );
  }

  // Build navigation
  const navigation = buildCategoryLandingNavigation(categoryData);

  // Build metadata
  const metadata = buildCategoryLandingMetadata(categoryData);

  const pageData: CategoryLandingPageData = {
    type: 'category',
    route: {
      type: GrowthSurfaceType.CATEGORY,
      slug: categorySlug,
      path: buildCategoryPath(categorySlug),
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: shouldIndex,
    },
    seo,
    summary,
    cta,
    related,
    navigation,
    metadata,
    categoryData,
    voucherPatterns,
  };

  // Cache the result (skip in preview mode)
  if (!preview) {
    const cacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.CATEGORY, categorySlug);
    await setCachedGrowthSurface(cacheKey, pageData, CACHE_TTL.CATEGORY_LANDING_SHORT);
  }

  return pageData;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get typical savings from voucher patterns
 */
function getTypicalSavings(voucherPatterns: VoucherPattern[]): string | undefined {
  if (voucherPatterns.length === 0) return undefined;

  // Find the most common discount pattern
  const commonPatterns = voucherPatterns.filter(p => p.frequency === 'common');
  if (commonPatterns.length > 0) {
    return commonPatterns[0].typicalDiscount;
  }

  return voucherPatterns[0]?.typicalDiscount;
}

// ============================================================================
// Summary Builder
// ============================================================================

/**
 * Build category landing summary
 */
export function buildCategoryLandingSummary(
  categoryData: CategoryData,
  voucherPatterns: VoucherPattern[]
): GrowthSurfaceSummary {
  const highlights: string[] = [];

  // Add shop count if available
  if (categoryData.shopCount) {
    highlights.push(`${categoryData.shopCount.toLocaleString()} shop`);
  }

  // Add voucher pattern info
  if (voucherPatterns.length > 0) {
    const commonPatterns = voucherPatterns.filter(p => p.frequency === 'common');
    if (commonPatterns.length > 0) {
      highlights.push(`Thường có: ${commonPatterns.map(p => p.typicalDiscount).join(', ')}`);
    }
  }

  return {
    title: categoryData.name,
    subtitle: 'Danh mục sản phẩm',
    description: categoryData.description ||
      `Tìm mã giảm giá ${categoryData.name} trên Shopee nhanh chóng. Dán link sản phẩm để tìm mã giảm giá tốt nhất.`,
    highlights: highlights.slice(0, GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS),
    icon: categoryData.icon,
  };
}

// ============================================================================
// CTA Builder
// ============================================================================

/**
 * Build category landing CTA model
 */
export function buildCategoryLandingCtaModel(
  categoryData: CategoryData
): GrowthSurfaceCtaModel {
  return {
    primary: {
      type: SurfaceCtaType.PASTE_LINK,
      label: CTA_DEFAULTS.PASTE_LINK_LABEL,
      href: '/paste-link-find-voucher',
      icon: 'link',
      trackingId: `category_${categoryData.slug}_paste_link`,
    },
    secondary: [
      {
        type: SurfaceCtaType.RESOLVE_VOUCHER,
        label: 'Nhập mã kiểm tra',
        href: '/voucher-checker',
        icon: 'search',
        trackingId: `category_${categoryData.slug}_check`,
      },
    ],
  };
}

// ============================================================================
// Navigation Builder
// ============================================================================

/**
 * Build category landing navigation
 */
function buildCategoryLandingNavigation(categoryData: CategoryData): GrowthSurfaceNavigationModel {
  const breadcrumbs = buildGrowthBreadcrumbs([
    { label: 'Trang chủ', href: '/' },
    { label: categoryData.name, isCurrent: true },
  ]);

  return {
    breadcrumbs,
    primaryNav: [
      { label: 'Dán link', href: '/paste-link-find-voucher', isPrimary: true },
      { label: 'Cách dùng', href: '/how-it-works' },
      { label: 'Kiểm tra mã', href: '/voucher-checker' },
    ],
    footerNav: [
      { label: 'Trang chủ', href: '/' },
      { label: 'Dán link tìm mã', href: '/paste-link-find-voucher' },
      { label: 'Cách sử dụng', href: '/how-it-works' },
    ],
    backToTool: {
      label: 'Dán link ngay',
      href: '/paste-link-find-voucher',
      icon: 'link',
      isPrimary: true,
    },
  };
}

// ============================================================================
// Metadata Builder
// ============================================================================

/**
 * Build category landing metadata
 */
function buildCategoryLandingMetadata(categoryData: CategoryData): GrowthSurfaceMetadata {
  const now = Date.now();
  return {
    status: GrowthSurfaceStatus.ACTIVE,
    lastUpdated: now,
    staleAfter: now + STALE_THRESHOLDS.CATEGORY_DATA * 1000,
    cacheVersion: '1.0.0',
  };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle category not found
 */
export function createCategoryNotFoundResponse(categorySlug: string): {
  notFound: boolean;
} {
  return { notFound: true };
}

/**
 * Handle category inactive
 */
export function createCategoryInactiveResponse(categoryData: CategoryData): {
  redirect: string;
} {
  return { redirect: '/paste-link-find-voucher' };
}
