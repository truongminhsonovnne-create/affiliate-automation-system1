/**
 * Growth Surface Presentation Layer
 *
 * Builds presentation models for growth pages
 * - Summary cards
 * - CTA presentations
 * - Support content blocks
 */

import type {
  GrowthSurfaceSummary,
  GrowthSurfaceSummaryCard,
  GrowthSurfaceCtaModel,
  CtaButton,
  GrowthSurfacePageData,
  GrowthSurfaceRelatedContent,
} from '../types/index.js';
import { SurfaceCtaType } from '../types/index.js';
import {
  GROWTH_SURFACE_LIMITS,
  CTA_LIMITS,
} from '../constants/index.js';

// ============================================================================
// Summary Presentation
// ============================================================================

/**
 * Build growth surface summary for presentation
 */
export function buildGrowthSurfaceSummary(params: {
  title: string;
  subtitle?: string;
  description: string;
  highlights: string[];
  icon?: string;
}): GrowthSurfaceSummary {
  return {
    title: params.title,
    subtitle: params.subtitle,
    description: params.description,
    highlights: params.highlights.slice(0, GROWTH_SURFACE_LIMITS.MAX_HIGHLIGHTS),
    icon: params.icon,
  };
}

/**
 * Build summary cards from summary data
 */
export function buildGrowthSurfaceSummaryCards(
  summary: GrowthSurfaceSummary
): GrowthSurfaceSummaryCard[] {
  const cards: GrowthSurfaceSummaryCard[] = [];

  // Convert highlights to cards
  for (const highlight of summary.highlights) {
    cards.push({
      title: highlight,
      value: '',
      description: '',
    });
  }

  return cards;
}

// ============================================================================
// CTA Presentation
// ============================================================================

/**
 * Build CTA presentation model
 */
export function buildGrowthSurfaceCtaPresentation(
  cta: GrowthSurfaceCtaModel
): {
  primary: CtaPresentation;
  secondary: CtaPresentation[];
} {
  return {
    primary: buildCtaPresentation(cta.primary),
    secondary: cta.secondary.map(buildCtaPresentation),
  };
}

/**
 * Build single CTA presentation
 */
function buildCtaPresentation(cta: CtaButton): CtaPresentation {
  return {
    ...cta,
    iconSvg: getCtaIcon(cta.type),
    style: getCtaStyle(cta.type),
    analyticsEvent: getCtaAnalyticsEvent(cta.type),
  };
}

interface CtaPresentation extends CtaButton {
  iconSvg: string;
  style: CtaStyle;
  analyticsEvent: string;
}

type CtaStyle = 'primary' | 'secondary' | 'outline' | 'ghost';

/**
 * Get CTA icon SVG
 */
function getCtaIcon(ctaType: SurfaceCtaType): string {
  switch (ctaType) {
    case SurfaceCtaType.PASTE_LINK:
      return 'link';
    case SurfaceCtaType.RESOLVE_VOUCHER:
      return 'search';
    case SurfaceCtaType.COPY_VOUCHER:
      return 'copy';
    case SurfaceCtaType.OPEN_SHOPEE:
      return 'external';
    case SurfaceCtaType.BROWSE_CATEGORY:
      return 'folder';
    case SurfaceCtaType.VIEW_SHOP:
      return 'store';
    default:
      return 'arrow-right';
  }
}

/**
 * Get CTA style based on type
 */
function getCtaStyle(ctaType: SurfaceCtaType): CtaStyle {
  switch (ctaType) {
    case SurfaceCtaType.PASTE_LINK:
    case SurfaceCtaType.RESOLVE_VOUCHER:
      return 'primary';
    case SurfaceCtaType.COPY_VOUCHER:
      return 'outline';
    case SurfaceCtaType.OPEN_SHOPEE:
    case SurfaceCtaType.BROWSE_CATEGORY:
    case SurfaceCtaType.VIEW_SHOP:
      return 'secondary';
    default:
      return 'primary';
  }
}

/**
 * Get analytics event name for CTA
 */
function getCtaAnalyticsEvent(ctaType: SurfaceCtaType): string {
  switch (ctaType) {
    case SurfaceCtaType.PASTE_LINK:
      return 'growth_cta_paste_link';
    case SurfaceCtaType.RESOLVE_VOUCHER:
      return 'growth_cta_resolve_voucher';
    case SurfaceCtaType.COPY_VOUCHER:
      return 'growth_cta_copy_voucher';
    case SurfaceCtaType.OPEN_SHOPEE:
      return 'growth_cta_open_shopee';
    case SurfaceCtaType.BROWSE_CATEGORY:
      return 'growth_cta_browse_category';
    case SurfaceCtaType.VIEW_SHOP:
      return 'growth_cta_view_shop';
    default:
      return 'growth_cta_clicked';
  }
}

// ============================================================================
// Related Content Presentation
// ============================================================================

/**
 * Build related content presentation
 */
export function buildRelatedContentPresentation(
  related: GrowthSurfaceRelatedContent
): {
  shops: RelatedContentItem[];
  categories: RelatedContentItem[];
  tools: RelatedContentItem[];
} {
  return {
    shops: related.shops.map(buildShopRelatedItem),
    categories: related.categories.map(buildCategoryRelatedItem),
    tools: related.tools.map(buildToolRelatedItem),
  };
}

interface RelatedContentItem {
  slug: string;
  name: string;
  subtitle?: string;
  href: string;
  icon: string;
}

/**
 * Build shop related item presentation
 */
function buildShopRelatedItem(shop: { slug: string; name: string; voucherCount?: number }): RelatedContentItem {
  return {
    slug: shop.slug,
    name: shop.name,
    subtitle: shop.voucherCount ? `${shop.voucherCount} mã giảm giá` : undefined,
    href: `/shop/${shop.slug}`,
    icon: 'store',
  };
}

/**
 * Build category related item presentation
 */
function buildCategoryRelatedItem(category: { slug: string; name: string; shopCount?: number }): RelatedContentItem {
  return {
    slug: category.slug,
    name: category.name,
    subtitle: category.shopCount ? `${category.shopCount} shop` : undefined,
    href: `/category/${category.slug}`,
    icon: 'folder',
  };
}

/**
 * Build tool related item presentation
 */
function buildToolRelatedItem(tool: { slug: string; name: string; description?: string }): RelatedContentItem {
  return {
    slug: tool.slug,
    name: tool.name,
    subtitle: tool.description,
    href: getToolHref(tool.slug),
    icon: 'tool',
  };
}

function getToolHref(toolSlug: string): string {
  switch (toolSlug) {
    case 'paste-link':
      return '/paste-link-find-voucher';
    case 'how-it-works':
      return '/how-it-works';
    case 'voucher-checker':
      return '/voucher-checker';
    default:
      return '/paste-link-find-voucher';
  }
}

// ============================================================================
// Support Content Presentation
// ============================================================================

/**
 * Build support content for growth surfaces
 */
export function buildGrowthSurfaceSupportContent(
  pageData: GrowthSurfacePageData
): SupportContentBlock[] {
  const blocks: SupportContentBlock[] = [];

  // Add description as a block
  if (pageData.summary.description) {
    blocks.push({
      type: 'description',
      content: pageData.summary.description,
    });
  }

  // Add highlights as a block
  if (pageData.summary.highlights.length > 0) {
    blocks.push({
      type: 'highlights',
      items: pageData.summary.highlights,
    });
  }

  return blocks;
}

interface SupportContentBlock {
  type: 'description' | 'highlights' | 'faq' | 'steps';
  content?: string;
  items?: string[];
}

// ============================================================================
// Page Layout Presentation
// ============================================================================

/**
 * Build page layout configuration
 */
export function buildGrowthSurfaceLayout(
  pageData: GrowthSurfacePageData
): PageLayoutConfig {
  return {
    maxWidth: 'max-w-3xl',
    padding: 'px-4 py-8',
    showBreadcrumbs: true,
    showRelatedContent: pageData.related.shops.length > 0 ||
      pageData.related.categories.length > 0 ||
      pageData.related.tools.length > 0,
    showBackToTool: true,
    ctaPosition: 'below_hero',
    sections: getPageSections(pageData),
  };
}

interface PageLayoutConfig {
  maxWidth: string;
  padding: string;
  showBreadcrumbs: boolean;
  showRelatedContent: boolean;
  showBackToTool: boolean;
  ctaPosition: 'below_hero' | 'floating' | 'both';
  sections: PageSection[];
}

interface PageSection {
  id: string;
  title: string;
  order: number;
}

/**
 * Get page sections based on content
 */
function getPageSections(pageData: GrowthSurfacePageData): PageSection[] {
  const sections: PageSection[] = [
    { id: 'hero', title: 'Hero', order: 1 },
    { id: 'main', title: 'Main Content', order: 2 },
  ];

  if (pageData.related.shops.length > 0 ||
    pageData.related.categories.length > 0 ||
    pageData.related.tools.length > 0) {
    sections.push({ id: 'related', title: 'Related', order: 3 });
  }

  return sections;
}
