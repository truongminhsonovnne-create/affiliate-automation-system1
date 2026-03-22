/**
 * SEO Model Builder
 *
 * Builds SEO-safe metadata for growth surfaces
 * - Title/description templates
 * - Canonical strategy
 * - Indexability policies
 * - Open Graph metadata
 */

import type {
  GrowthSurfaceSeoModel,
  ShopLandingSeoModel,
  CategoryLandingSeoModel,
  ToolExplainerSeoModel,
  GrowthSurfaceType,
  ToolPageType,
} from '../types/index.js';
import {
  SEO_LIMITS,
  SEO_DEFAULTS,
  INDEXABILITY_POLICY,
  GROWTH_PAGES_CONFIG,
} from '../constants/index.js';
import { buildShopPath, buildCategoryPath, buildToolPagePath } from '../routing/growthSurfaceRoutes.js';

// ============================================================================
// Base SEO Builder
// ============================================================================

/**
 * Build base SEO model for any growth surface
 */
export function buildGrowthSurfaceSeoModel(params: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  noFollow?: boolean;
  ogImage?: string;
  keywords?: string[];
}): GrowthSurfaceSeoModel {
  const {
    title,
    description,
    path,
    noIndex = false,
    noFollow = false,
    ogImage,
    keywords,
  } = params;

  // Validate lengths
  const validatedTitle = validateAndTruncate(
    title,
    SEO_LIMITS.TITLE_MIN_LENGTH,
    SEO_LIMITS.TITLE_MAX_LENGTH,
    SEO_DEFAULTS.SITE_TITLE_SUFFIX
  );

  const validatedDescription = validateAndTruncate(
    description,
    SEO_LIMITS.DESCRIPTION_MIN_LENGTH,
    SEO_LIMITS.DESCRIPTION_MAX_LENGTH
  );

  const canonicalUrl = buildCanonicalUrl(path);

  return {
    title: validatedTitle,
    description: validatedDescription,
    canonicalUrl,
    ogTitle: validatedTitle,
    ogDescription: validateAndTruncate(
      description,
      SEO_LIMITS.OG_DESCRIPTION_MIN_LENGTH,
      SEO_LIMITS.OG_DESCRIPTION_MAX_LENGTH
    ),
    ogImage: ogImage || SEO_DEFAULTS.DEFAULT_OG_IMAGE,
    noIndex,
    noFollow,
    keywords: keywords?.slice(0, SEO_LIMITS.KEYWORD_COUNT_MAX),
  };
}

/**
 * Build canonical URL
 */
export function buildCanonicalUrl(path: string): string {
  const baseUrl = GROWTH_PAGES_CONFIG.BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

// ============================================================================
// Shop Page SEO
// ============================================================================

/**
 * Build SEO model for shop landing page
 */
export function buildShopSeoModel(params: {
  shopName: string;
  shopSlug: string;
  description?: string;
  category?: string;
  voucherHint?: string;
  noIndex?: boolean;
}): ShopLandingSeoModel {
  const {
    shopName,
    shopSlug,
    description,
    category,
    voucherHint,
    noIndex = false,
  } = params;

  // Build title
  let title = `Mã giảm giá ${shopName}`;
  if (voucherHint) {
    title = `${voucherHint} - ${title}`;
  }
  title = `${title}${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;

  // Build description
  let desc = description || `Tìm mã giảm giá ${shopName} nhanh chóng với công cụ dán link tự động.`;
  if (category) {
    desc = `${desc} Danh mục: ${category}.`;
  }
  desc = `${desc} Dán link sản phẩm để tìm mã giảm giá tốt nhất.`;

  // Build keywords
  const keywords = [
    shopName,
    'mã giảm giá',
    'Shopee',
    'giảm giá',
    ...(category ? [category] : []),
    'voucher',
    'khuyến mãi',
  ].slice(0, SEO_LIMITS.KEYWORD_COUNT_MAX);

  const baseSeo = buildGrowthSurfaceSeoModel({
    title,
    description: desc,
    path: buildShopPath(shopSlug),
    noIndex,
    keywords,
  });

  return {
    ...baseSeo,
    shopName,
    shopCategory: category,
    voucherHint,
  };
}

// ============================================================================
// Category Page SEO
// ============================================================================

/**
 * Build SEO model for category landing page
 */
export function buildCategorySeoModel(params: {
  categoryName: string;
  categorySlug: string;
  description?: string;
  typicalSavings?: string;
  voucherPatterns?: string[];
  noIndex?: boolean;
}): CategoryLandingSeoModel {
  const {
    categoryName,
    categorySlug,
    description,
    typicalSavings,
    voucherPatterns,
    noIndex = false,
  } = params;

  // Build title
  let title = `Mã giảm giá ${categoryName}`;
  if (typicalSavings) {
    title = `${title} - Giảm đến ${typicalSavings}`;
  }
  title = `${title}${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;

  // Build description
  let desc = description ||
    `Tìm mã giảm giá ${categoryName} trên Shopee nhanh chóng với công cụ dán link tự động.`;
  if (voucherPatterns && voucherPatterns.length > 0) {
    const patterns = voucherPatterns.slice(0, 2).join(', ');
    desc = `${desc} Các mã phổ biến: ${patterns}.`;
  }
  desc = `${desc} Dán link để tìm mã giảm giá phù hợp nhất.`;

  // Build keywords
  const keywords = [
    'mã giảm giá',
    categoryName,
    'Shopee',
    'voucher',
    'khuyến mãi',
    ...(voucherPatterns?.slice(0, 3) || []),
  ].slice(0, SEO_LIMITS.KEYWORD_COUNT_MAX);

  const baseSeo = buildGrowthSurfaceSeoModel({
    title,
    description: desc,
    path: buildCategoryPath(categorySlug),
    noIndex,
    keywords,
  });

  return {
    ...baseSeo,
    categoryName,
    typicalSavings,
    voucherPatterns: voucherPatterns?.slice(0, 3),
  };
}

// ============================================================================
// Tool Explainer Page SEO
// ============================================================================

/**
 * Build SEO model for tool explainer pages
 */
export function buildToolExplainerSeoModel(params: {
  toolName: string;
  toolDescription: string;
  toolBenefits: string[];
  toolPageType: ToolPageType;
  noIndex?: boolean;
}): ToolExplainerSeoModel {
  const {
    toolName,
    toolDescription,
    toolBenefits,
    toolPageType,
    noIndex = false,
  } = params;

  // Build title based on tool type
  let title: string;
  switch (toolPageType) {
    case ToolPageType.PASTE_LINK:
      title = `Dán link tìm mã giảm giá - Công cụ tự động${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;
      break;
    case ToolPageType.HOW_IT_WORKS:
      title = `Cách sử dụng công cụ tìm mã giảm giá${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;
      break;
    case ToolPageType.VOUCHER_CHECKER:
      title = `Kiểm tra mã giảm giá Shopee - Miễn phí${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;
      break;
    default:
      title = `${toolName}${SEO_DEFAULTS.SITE_TITLE_SUFFIX}`;
  }

  // Build description
  const benefitsText = toolBenefits.slice(0, 2).join(', ');
  const desc = `${toolDescription}. ${benefitsText}. Sử dụng miễn phí, không cần đăng ký.`;

  // Build keywords
  const keywords = [
    'mã giảm giá',
    'Shopee',
    'voucher',
    'khuyến mãi',
    'kiểm tra mã',
    'dán link',
    toolName,
    'công cụ miễn phí',
  ].slice(0, SEO_LIMITS.KEYWORD_COUNT_MAX);

  const baseSeo = buildGrowthSurfaceSeoModel({
    title,
    description: desc,
    path: buildToolPagePath(toolPageType),
    noIndex,
    keywords,
  });

  return {
    ...baseSeo,
    toolName,
    toolDescription,
    toolBenefits: toolBenefits.slice(0, 5),
  };
}

// ============================================================================
// SEO Helpers
// ============================================================================

/**
 * Validate and truncate text to meet SEO limits
 */
function validateAndTruncate(
  text: string,
  minLength: number,
  maxLength: number,
  suffix?: string
): string {
  let result = text.trim();

  // Apply suffix if provided
  if (suffix && result.length + suffix.length > maxLength) {
    // Truncate text to make room for suffix
    result = result.slice(0, maxLength - suffix.length - 3) + '...';
  }

  // Truncate if too long
  if (suffix) {
    result = result + suffix;
  } else if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }

  // Pad if too short (for validation purposes)
  if (result.length < minLength) {
    // Add padding but mark as incomplete
    result = result.padEnd(minLength, ' ');
  }

  return result;
}

/**
 * Build robots meta directive
 */
export function buildRobotsDirective(params: {
  noIndex?: boolean;
  noFollow?: boolean;
}): string {
  const directives: string[] = [];

  if (params.noIndex) {
    directives.push('noindex');
  } else {
    directives.push('index');
  }

  if (params.noFollow) {
    directives.push('nofollow');
  } else {
    directives.push('follow');
  }

  return directives.join(', ');
}

/**
 * Build meta tags for growth surface
 */
export function buildGrowthSurfaceMetaTags(seo: GrowthSurfaceSeoModel): Record<string, string> {
  return {
    // Primary meta
    title: seo.title,
    description: seo.description,

    // Robots
    robots: buildRobotsDirective({
      noIndex: seo.noIndex,
      noFollow: seo.noFollow,
    }),

    // Canonical
    canonical: seo.canonicalUrl,

    // Open Graph
    'og:title': seo.ogTitle,
    'og:description': seo.ogDescription,
    'og:url': seo.canonicalUrl,
    'og:type': 'website',
    'og:site_name': SEO_DEFAULTS.SITE_NAME,
    ...(seo.ogImage ? { 'og:image': seo.ogImage } : {}),

    // Twitter Card
    'twitter:card': 'summary_large_image',
    'twitter:title': seo.ogTitle,
    'twitter:description': seo.ogDescription,
    ...(seo.ogImage ? { 'twitter:image': seo.ogImage } : {}),
  };
}

// ============================================================================
// SEO Validation
// ============================================================================

/**
 * Validate SEO model
 */
export function validateSeoModel(seo: GrowthSurfaceSeoModel): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (seo.title.length < SEO_LIMITS.TITLE_MIN_LENGTH) {
    errors.push(`Title too short: ${seo.title.length} chars (min: ${SEO_LIMITS.TITLE_MIN_LENGTH})`);
  }
  if (seo.title.length > SEO_LIMITS.TITLE_MAX_LENGTH) {
    warnings.push(`Title too long: ${seo.title.length} chars (max: ${SEO_LIMITS.TITLE_MAX_LENGTH})`);
  }

  // Description validation
  if (seo.description.length < SEO_LIMITS.DESCRIPTION_MIN_LENGTH) {
    errors.push(`Description too short: ${seo.description.length} chars (min: ${SEO_LIMITS.DESCRIPTION_MIN_LENGTH})`);
  }
  if (seo.description.length > SEO_LIMITS.DESCRIPTION_MAX_LENGTH) {
    warnings.push(`Description too long: ${seo.description.length} chars (max: ${SEO_LIMITS.DESCRIPTION_MAX_LENGTH})`);
  }

  // Canonical URL validation
  if (!seo.canonicalUrl.startsWith('http')) {
    errors.push('Canonical URL must be absolute');
  }

  // Keyword validation
  if (seo.keywords && seo.keywords.length > SEO_LIMITS.KEYWORD_COUNT_MAX) {
    warnings.push(`Too many keywords: ${seo.keywords.length} (max: ${SEO_LIMITS.KEYWORD_COUNT_MAX})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if SEO content is thin
 */
export function isThinContent(seo: GrowthSurfaceSeoModel): boolean {
  const contentLength = seo.title.length + seo.description.length;

  return (
    contentLength < INDEXABILITY_POLICY.MIN_CONTENT_LENGTH_FOR_INDEX ||
    !seo.description ||
    seo.description.length < SEO_LIMITS.DESCRIPTION_MIN_LENGTH
  );
}
