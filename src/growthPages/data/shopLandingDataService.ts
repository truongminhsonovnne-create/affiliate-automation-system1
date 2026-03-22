/**
 * Shop Landing Data Service
 *
 * Loads and builds data for shop landing pages
 * - Shop overview data (from SEO data integration)
 * - Voucher applicability hints
 * - CTA models
 * - Related content
 */

import type {
  ShopLandingPageData,
  ShopData,
  VoucherHint,
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
import { buildShopPath, buildCategoryPath } from '../routing/growthSurfaceRoutes.js';
import { buildShopSeoModel } from '../seo/seoModelBuilder.js';
import { getCachedGrowthSurface, setCachedGrowthSurface, buildGrowthSurfaceCacheKey } from '../cache/growthSurfaceCache.js';
import { resolveRelatedGrowthSurfaces } from './relatedSurfaceResolver.js';
import { buildGrowthBreadcrumbs } from '../navigation/growthNavigationModel.js';
import { checkShopPageQuality } from '../policy/contentQualityGuardrail.js';
import { getShopSeoData, type SeoVoucherSignal } from './seoDataIntegration.js';

import { logger } from '../../utils/logger.js';

// ============================================================================
// Data Fetching Interfaces
// ============================================================================

export interface ShopDataSource {
  getShopBySlug(slug: string): Promise<ShopData | null>;
  getVoucherHintsForShop(shopId: string): Promise<VoucherHint[]>;
}

export interface GetShopLandingOptions {
  includeVoucherHints?: boolean;
  includeRelated?: boolean;
  preview?: boolean;
  locale?: string;
}

// ============================================================================
// Data Integration with Real Sources
// ============================================================================

/**
 * Get shop data from SEO data integration
 * Uses affiliate_products and voucher_catalog tables
 */
export async function getShopDataFromSource(shopSlug: string): Promise<ShopData | null> {
  try {
    const result = await getShopSeoData(shopSlug);

    if (!result.success || !result.shop) {
      logger.debug({ shopSlug }, 'Shop not found in data integration');
      return null;
    }

    const { shop } = result;

    // Build ShopData from real signals
    return {
      id: shop.shopId,
      slug: shop.shopSlug,
      name: shop.shopName,
      category: shop.category,
      productCount: shop.productCount,
      description: undefined, // Will be derived if needed
      logo: undefined,
      url: undefined,
    };
  } catch (error) {
    logger.error({ shopSlug, error }, 'Failed to fetch shop data from source');
    return null;
  }
}

/**
 * Get voucher hints for a shop from real data
 */
export async function getVoucherHintsFromSource(shopId: string): Promise<VoucherHint[]> {
  try {
    const result = await getShopSeoData(shopId.replace('shop_', ''));

    if (!result.success) {
      return [];
    }

    return result.vouchers.slice(0, GROWTH_SURFACE_LIMITS.MAX_VOUCHER_HINTS).map((v: SeoVoucherSignal) => ({
      code: v.code,
      description: v.description,
      discount: v.discount,
      applicability: v.minSpend ? `Đơn tối thiểu ${v.minSpend.toLocaleString()}đ` : undefined,
    }));
  } catch (error) {
    logger.error({ shopId, error }, 'Failed to fetch voucher hints from source');
    return [];
  }
}

// ============================================================================
// Main Data Service
// ============================================================================

/**
 * Get shop landing page data
 */
export async function getShopLandingPageData(
  shopSlug: string,
  options: GetShopLandingOptions = {}
): Promise<ShopLandingPageData | null> {
  const {
    includeVoucherHints = true,
    includeRelated = true,
    preview = false,
  } = options;

  // Try cache first (skip in preview mode)
  if (!preview) {
    const cacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.SHOP, shopSlug);
    const cached = await getCachedGrowthSurface<ShopLandingPageData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Fetch shop data from real source
  const shopData = await getShopDataFromSource(shopSlug);

  if (!shopData) {
    logger.debug({ shopSlug }, 'Shop data not found, returning null');
    return null;
  }

  // Fetch voucher hints from real source
  let voucherHints: VoucherHint[] = [];
  if (includeVoucherHints && shopData.id) {
    voucherHints = await getVoucherHintsFromSource(shopData.id);
  }

  // Quality check - determine if page should be indexed
  const qualityResult = checkShopPageQuality(shopData, voucherHints);
  const shouldIndex = qualityResult.isIndexable;

  logger.debug({
    shopSlug,
    hasData: !!shopData,
    productCount: shopData.productCount,
    voucherCount: voucherHints.length,
    qualityScore: qualityResult.qualityScore,
    shouldIndex,
    qualityIssues: qualityResult.issues,
  }, 'Shop page quality check result');

  // Build SEO model with noIndex based on quality check
  const seo = buildShopSeoModel({
    shopName: shopData.name,
    shopSlug: shopData.slug,
    description: shopData.description,
    category: shopData.category,
    voucherHint: voucherHints[0]?.description,
    noIndex: !shouldIndex,
  });

  // Build summary
  const summary = buildShopLandingSummary(shopData, voucherHints);

  // Build CTA model
  const cta = buildShopLandingCtaModel(shopData);

  // Build related content
  let related: GrowthSurfaceRelatedContent = {
    shops: [],
    categories: [],
    tools: [],
  };
  if (includeRelated) {
    related = await resolveRelatedGrowthSurfaces(
      {
        surfaceType: GrowthSurfaceType.SHOP,
        surfaceSlug: shopSlug,
        entryTimestamp: Date.now(),
      },
      { limit: 3 }
    );
  }

  // Build navigation
  const navigation = buildShopLandingNavigation(shopData);

  // Build metadata
  const metadata = buildShopLandingMetadata(shopData);

  const pageData: ShopLandingPageData = {
    type: 'shop',
    route: {
      type: GrowthSurfaceType.SHOP,
      slug: shopSlug,
      path: buildShopPath(shopSlug),
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: shouldIndex,
    },
    seo,
    summary,
    cta,
    related,
    navigation,
    metadata,
    shopData,
    voucherHints,
  };

  // Cache the result (skip in preview mode)
  if (!preview) {
    const cacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.SHOP, shopSlug);
    await setCachedGrowthSurface(cacheKey, pageData, CACHE_TTL.SHOP_LANDING_SHORT);
  }

  return pageData;
}

// ============================================================================
// Summary Builder
// ============================================================================

/**
 * Build shop landing summary
 */
export function buildShopLandingSummary(
  shopData: ShopData,
  voucherHints: VoucherHint[]
): GrowthSurfaceSummary {
  const highlights: string[] = [];

  // Add product count if available
  if (shopData.productCount) {
    highlights.push(`${shopData.productCount.toLocaleString()} sản phẩm`);
  }

  // Add category if available
  if (shopData.category) {
    highlights.push(`Danh mục: ${shopData.category}`);
  }

  // Add voucher hint info
  if (voucherHints.length > 0) {
    highlights.push('Có mã giảm giá');
  }

  return {
    title: shopData.name,
    subtitle: shopData.category ? `Shop ${shopData.category}` : undefined,
    description: shopData.description ||
      `Dán link sản phẩm ${shopData.name} để tìm mã giảm giá tốt nhất. Công cụ tự động tìm và áp dụng mã giảm giá nhanh chóng.`,
    highlights: highlights.slice(0, GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS),
    icon: shopData.logo,
  };
}

// ============================================================================
// CTA Builder
// ============================================================================

/**
 * Build shop landing CTA model
 */
export function buildShopLandingCtaModel(
  shopData: ShopData
): GrowthSurfaceCtaModel {
  const shopPath = buildShopPath(shopData.slug);

  return {
    primary: {
      type: SurfaceCtaType.PASTE_LINK,
      label: CTA_DEFAULTS.PASTE_LINK_LABEL,
      href: '/paste-link-find-voucher',
      icon: 'link',
      trackingId: `shop_${shopData.slug}_paste_link`,
    },
    secondary: [
      {
        type: SurfaceCtaType.VIEW_SHOP,
        label: CTA_DEFAULTS.VIEW_SHOP_LABEL,
        href: shopData.url || shopPath,
        icon: 'external',
        trackingId: `shop_${shopData.slug}_view`,
      },
      ...(shopData.category ? [{
        type: SurfaceCtaType.BROWSE_CATEGORY,
        label: CTA_DEFAULTS.BROWSE_CATEGORY_LABEL,
        href: buildCategoryPath(shopData.category.toLowerCase().replace(/\s+/g, '-')),
        icon: 'folder',
        trackingId: `shop_${shopData.slug}_category`,
      }] : []),
    ],
  };
}

// ============================================================================
// Navigation Builder
// ============================================================================

/**
 * Build shop landing navigation
 */
function buildShopLandingNavigation(shopData: ShopData): GrowthSurfaceNavigationModel {
  const breadcrumbs = buildGrowthBreadcrumbs([
    { label: 'Trang chủ', href: '/' },
    ...(shopData.category ? [
      { label: shopData.category, href: buildCategoryPath(shopData.category.toLowerCase().replace(/\s+/g, '-')) },
    ] : []),
    { label: shopData.name, isCurrent: true },
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
 * Build shop landing metadata
 */
function buildShopLandingMetadata(shopData: ShopData): GrowthSurfaceMetadata {
  const now = Date.now();
  return {
    status: GrowthSurfaceStatus.ACTIVE,
    lastUpdated: now,
    staleAfter: now + STALE_THRESHOLDS.SHOP_DATA * 1000,
    cacheVersion: '1.0.0',
  };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle shop not found
 */
export function createShopNotFoundResponse(shopSlug: string): {
  notFound: boolean;
} {
  return { notFound: true };
}

/**
 * Handle shop inactive
 */
export function createShopInactiveResponse(shopData: ShopData): {
  redirect: string;
} {
  return { redirect: '/paste-link-find-voucher' };
}
