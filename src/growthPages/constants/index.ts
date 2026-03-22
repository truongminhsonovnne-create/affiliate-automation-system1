/**
 * Growth Pages Constants
 *
 * Centralized constants for Consumer Growth Surfaces
 * - Surface limits
 * - SEO thresholds
 * - Content density limits
 * - Cache TTL hints
 * - CTA density limits
 */

import { SurfaceCtaType, GrowthSurfaceType, ToolPageType, GrowthSurfaceStatus } from '../types/index.js';

// ============================================================================
// Surface Limits
// ============================================================================

export const GROWTH_SURFACE_LIMITS = {
  MAX_RELATED_SHOPS: 3,
  MAX_RELATED_CATEGORIES: 3,
  MAX_RELATED_TOOLS: 3,
  MAX_VOUCHER_HINTS: 2,
  MAX_VOUCHER_PATTERNS: 3,
  MAX_BREADCRUMB_ITEMS: 4,
  MAX_NAV_ITEMS: 6,
  MAX_FOOTER_NAV_ITEMS: 8,
  MAX_FAQ_ITEMS: 5,
  MAX_TOOL_STEPS: 5,
  MAX_HIGHLIGHTS: 5,
  MAX_KEYWORDS: 8,
} as const;

// ============================================================================
// SEO Thresholds
// ============================================================================

export const SEO_LIMITS = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 70,
  DESCRIPTION_MIN_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 320,
  OG_TITLE_MIN_LENGTH: 10,
  OG_TITLE_MAX_LENGTH: 95,
  OG_DESCRIPTION_MIN_LENGTH: 50,
  OG_DESCRIPTION_MAX_LENGTH: 200,
  KEYWORD_MIN_LENGTH: 2,
  KEYWORD_MAX_LENGTH: 30,
  KEYWORD_COUNT_MAX: 8,
} as const;

export const SEO_DEFAULTS = {
  SITE_NAME: 'Affiliate Automation',
  SITE_DESCRIPTION: 'Tìm mã giảm giá Shopee nhanh chóng với công cụ dán link tự động',
  SITE_TITLE_SUFFIX: ' | Affiliate Automation',
  DEFAULT_OG_IMAGE: '/og-default.png',
  FALLBACK_CANONICAL_PATH: '/',
} as const;

// ============================================================================
// Internal Link Limits
// ============================================================================

export const INTERNAL_LINK_LIMITS = {
  MAX_LINKS_PER_PAGE: 10,
  MAX_OUTBOUND_GROWTH_LINKS: 5,
  MIN_RELATED_CONTENT_LINKS: 0,
  MAX_RELATED_CONTENT_LINKS: 6,
} as const;

// ============================================================================
// CTA Density Limits
// ============================================================================

export const CTA_LIMITS = {
  MAX_PRIMARY_CTA: 1,
  MAX_SECONDARY_CTA: 3,
  MAX_TOTAL_CTA: 4,
  MIN_CTA_SPACING: 16, // pixels
} as const;

export const CTA_DEFAULTS = {
  PASTE_LINK_LABEL: 'Dán link tìm mã giảm giá',
  RESOLVE_VOUCHER_LABEL: 'Kiểm tra mã giảm giá',
  COPY_VOUCHER_LABEL: 'Sao chép mã',
  OPEN_SHOPEE_LABEL: 'Mở Shopee',
  BROWSE_CATEGORY_LABEL: 'Xem thêm',
  VIEW_SHOP_LABEL: 'Xem shop',
} as const;

// ============================================================================
// Trust Block Limits
// ============================================================================

export const TRUST_BLOCK_LIMITS = {
  MAX_TRUST_ELEMENTS: 3,
  MAX_TESTIMONIALS: 0, // Disabled by default - no social proof spam
  MAX_TRUST_BADGES: 2,
} as const;

// ============================================================================
// Content Density Thresholds
// ============================================================================

export const CONTENT_DENSITY_LIMITS = {
  MIN_DESCRIPTION_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_SUMMARY_LENGTH: 20,
  MAX_SUMMARY_LENGTH: 200,
  MAX_SECTIONS_ABOVE_FOLD: 3,
  MIN_CONTENT_SECTIONS: 1,
  MAX_CONTENT_SECTIONS: 5,
} as const;

// ============================================================================
// Cache TTL Hints (in seconds)
// ============================================================================

export const CACHE_TTL = {
  // Short TTL for dynamic content
  SHOP_LANDING_SHORT: 300, // 5 minutes
  CATEGORY_LANDING_SHORT: 300,

  // Medium TTL for semi-static content
  TOOL_EXPLAINER: 3600, // 1 hour
  HOW_IT_WORKS: 3600,

  // Long TTL for static content
  STATIC_CONTENT: 86400, // 24 hours

  // Never cache
  NO_CACHE: 0,
} as const;

// ============================================================================
// Stale Content Thresholds (in seconds)
// ============================================================================

export const STALE_THRESHOLDS = {
  SHOP_DATA: 3600, // 1 hour
  CATEGORY_DATA: 7200, // 2 hours
  TOOL_CONTENT: 86400, // 24 hours
  VOUCHER_HINTS: 1800, // 30 minutes
} as const;

// ============================================================================
// Route Configuration
// ============================================================================

export const GROWTH_ROUTES = {
  HOME: '/',
  PASTE_LINK_TOOL: '/paste-link-find-voucher',
  HOW_IT_WORKS: '/how-it-works',
  VOUCHER_CHECKER: '/voucher-checker',
  SHOP_PREFIX: '/shop',
  CATEGORY_PREFIX: '/category',
} as const;

// ============================================================================
// Surface Type to Route Mapping
// ============================================================================

export const SURFACE_TYPE_TO_ROUTE: Record<GrowthSurfaceType, string> = {
  [GrowthSurfaceType.SHOP]: GROWTH_ROUTES.SHOP_PREFIX,
  [GrowthSurfaceType.CATEGORY]: GROWTH_ROUTES.CATEGORY_PREFIX,
  [GrowthSurfaceType.TOOL_EXPLAINER]: '/tool',
  [GrowthSurfaceType.DISCOVERY]: '/discover',
} as const;

// ============================================================================
// Tool Page Paths
// ============================================================================

export const TOOL_PAGE_PATHS: Record<ToolPageType, string> = {
  [ToolPageType.PASTE_LINK]: '/paste-link-find-voucher',
  [ToolPageType.HOW_IT_WORKS]: '/how-it-works',
  [ToolPageType.VOUCHER_CHECKER]: '/voucher-checker',
} as const;

// ============================================================================
// CTA Type to Route Mapping
// ============================================================================

export const CTA_TYPE_TO_PATH: Record<SurfaceCtaType, string> = {
  [SurfaceCtaType.PASTE_LINK]: GROWTH_ROUTES.PASTE_LINK_TOOL,
  [SurfaceCtaType.RESOLVE_VOUCHER]: GROWTH_ROUTES.PASTE_LINK_TOOL,
  [SurfaceCtaType.COPY_VOUCHER]: GROWTH_ROUTES.PASTE_LINK_TOOL,
  [SurfaceCtaType.OPEN_SHOPEE]: '/open-shopee',
  [SurfaceCtaType.BROWSE_CATEGORY]: GROWTH_ROUTES.CATEGORY_PREFIX,
  [SurfaceCtaType.VIEW_SHOP]: GROWTH_ROUTES.SHOP_PREFIX,
} as const;

// ============================================================================
// Content Policy Constants
// ============================================================================

export const CONTENT_POLICY = {
  // Disallowed patterns
  DISALLOWED_KEYWORDS: [
    'miễn phí hoàn toàn',
    'không giới hạn',
    'deal sốc',
    'giảm 99%',
    'chỉ còn 1k',
    'free',
    '100% off',
  ] as const,

  // Clutter indicators
  CLUTTER_THRESHOLD: 5, // Max sections allowed
  BANNER_COUNT_MAX: 0, // No promotional banners allowed
  POPUP_ENABLED: false,
  STICKY_CTA_COUNT_MAX: 1,

  // Quality thresholds
  MIN_UNIQUE_CONTENT_WORDS: 30,
  MAX_REPEATED_CONTENT_RATIO: 0.3,

  // Spam indicators
  SPAM_LINK_DENSITY_THRESHOLD: 0.2, // Max 20% of page can be links
  SPAM_KEYWORD_DENSITY_THRESHOLD: 0.05, // Max 5% keyword density
} as const;

// ============================================================================
// Indexability Policy
// ============================================================================

export const INDEXABILITY_POLICY = {
  // Always index
  ALWAYS_INDEX: [
    GrowthSurfaceType.TOOL_EXPLAINER,
  ] as const,

  // Conditional index (based on content quality)
  CONDITIONAL_INDEX: [
    GrowthSurfaceType.SHOP,
    GrowthSurfaceType.CATEGORY,
  ] as const,

  // Never index
  NEVER_INDEX: [
    GrowthSurfaceType.DISCOVERY,
  ] as const,

  // Thin content thresholds
  MIN_CONTENT_LENGTH_FOR_INDEX: 100, // characters
  MIN_UNIQUE_SECTIONS: 1,

  // Quality gates
  REQUIRES_DESCRIPTION: true,
  REQUIRES_SUMMARY: true,
  REQUIRES_VALID_CTA: true,

  // Minimum quality score for indexing (0-100)
  MIN_QUALITY_SCORE_THRESHOLD: 60,
} as const;

// ============================================================================
// Analytics Configuration
// ============================================================================

export const ANALYTICS_CONFIG = {
  // Event sampling
  ENABLE_SAMPLING: false,
  SAMPLE_RATE: 100, // 100% by default

  // Attribution window
  ATTRIBUTION_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Bounce threshold (seconds)
  BOUNCE_THRESHOLD: 10,

  // Scroll depth thresholds for engagement
  SCROLL_DEPTH_THRESHOLDS: [25, 50, 75, 100],

  // Required params
  REQUIRED_EVENT_PARAMS: [
    'eventType',
    'surfaceType',
    'surfaceSlug',
    'timestamp',
  ] as const,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  SURFACE_NOT_FOUND: 'Không tìm thấy trang này',
  SURFACE_INACTIVE: 'Trang này hiện không khả dụng',
  SURFACE_SOO_COMING: 'Trang này sẽ sớm có',
  INVALID_SLUG: 'Đường dẫn không hợp lệ',
  CONTENT_TOO_THIN: 'Nội dung chưa đủ để hiển thị',
  CTA_MISSING: 'Trang thiếu CTA chính',
  SEO_DATA_MISSING: 'Thiếu thông tin SEO',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  PAGE_LOADED: 'Trang đã tải',
  CTA_CLICKED: 'Đã chuyển đến công cụ',
  CONVERSION_COMPLETE: 'Đã sử dụng công cụ',
} as const;

// ============================================================================
// Public Configuration
// ============================================================================

export const GROWTH_PAGES_CONFIG = {
  // Feature flags
  ENABLE_SHOP_PAGES: true,
  ENABLE_CATEGORY_PAGES: true,
  ENABLE_TOOL_EXPLAINER_PAGES: true,
  ENABLE_RELATED_CONTENT: true,
  ENABLE_ANALYTICS: true,

  // Preview mode (for development)
  PREVIEW_MODE: process.env.NODE_ENV === 'development',

  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app',
  SITE_NAME: 'Affiliate Automation',

  // Default locale
  DEFAULT_LOCALE: 'vi',
  SUPPORTED_LOCALES: ['vi', 'en'] as const,
} as const;
