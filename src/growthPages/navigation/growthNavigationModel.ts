/**
 * Growth Navigation Model
 *
 * Navigation model for growth surfaces
 * - Breadcrumbs
 * - Primary nav
 * - Entry links
 */

import type {
  GrowthSurfaceNavigationModel,
  BreadcrumbItem,
  NavItem,
  GrowthSurfaceType,
} from '../types/index.js';
import {
  GROWTH_SURFACE_LIMITS,
  GROWTH_ROUTES,
} from '../constants/index.js';
import { buildShopPath, buildCategoryPath, buildToolPagePath } from '../routing/growthSurfaceRoutes.js';
import { ToolPageType } from '../types/index.js';

// ============================================================================
// Breadcrumb Builder
// ============================================================================

/**
 * Build breadcrumbs for growth surface
 */
export function buildGrowthBreadcrumbs(
  items: BreadcrumbItem[]
): BreadcrumbItem[] {
  return items.slice(0, GROWTH_SURFACE_LIMITS.MAX_BREADCRUMB_ITEMS);
}

/**
 * Build breadcrumbs for shop page
 */
export function buildShopBreadcrumbs(shopName: string, category?: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Trang chủ', href: '/' },
  ];

  if (category) {
    items.push({
      label: category,
      href: buildCategoryPath(category.toLowerCase().replace(/\s+/g, '-')),
    });
  }

  items.push({
    label: shopName,
    isCurrent: true,
  });

  return buildGrowthBreadcrumbs(items);
}

/**
 * Build breadcrumbs for category page
 */
export function buildCategoryBreadcrumbs(categoryName: string): BreadcrumbItem[] {
  return buildGrowthBreadcrumbs([
    { label: 'Trang chủ', href: '/' },
    { label: categoryName, isCurrent: true },
  ]);
}

/**
 * Build breadcrumbs for tool explainer page
 */
export function buildToolBreadcrumbs(toolName: string): BreadcrumbItem[] {
  return buildGrowthBreadcrumbs([
    { label: 'Trang chủ', href: '/' },
    { label: 'Công cụ', href: GROWTH_ROUTES.PASTE_LINK },
    { label: toolName, isCurrent: true },
  ]);
}

// ============================================================================
// Navigation Builder
// ============================================================================

/**
 * Build growth surface navigation
 */
export function buildGrowthSurfaceNavigation(params: {
  breadcrumbs: BreadcrumbItem[];
  surfaceType: GrowthSurfaceType;
}): GrowthSurfaceNavigationModel {
  return {
    breadcrumbs: params.breadcrumbs,
    primaryNav: buildPrimaryNav(params.surfaceType),
    footerNav: buildFooterNav(),
    backToTool: buildBackToToolNav(params.surfaceType),
  };
}

// ============================================================================
// Primary Navigation
// ============================================================================

/**
 * Build primary navigation
 */
function buildPrimaryNav(surfaceType: GrowthSurfaceType): NavItem[] {
  return [
    {
      label: 'Dán link',
      href: GROWTH_ROUTES.PASTE_LINK,
      isPrimary: true,
    },
    {
      label: 'Cách dùng',
      href: GROWTH_ROUTES.HOW_IT_WORKS,
    },
    {
      label: 'Kiểm tra mã',
      href: GROWTH_ROUTES.VOUCHER_CHECKER,
    },
  ];
}

// ============================================================================
// Footer Navigation
// ============================================================================

/**
 * Build footer navigation
 */
function buildFooterNav(): NavItem[] {
  return [
    { label: 'Trang chủ', href: '/' },
    { label: 'Dán link tìm mã', href: GROWTH_ROUTES.PASTE_LINK },
    { label: 'Cách sử dụng', href: GROWTH_ROUTES.HOW_IT_WORKS },
    { label: 'Kiểm tra mã', href: GROWTH_ROUTES.VOUCHER_CHECKER },
  ];
}

// ============================================================================
// Back to Tool Navigation
// ============================================================================

/**
 * Build back to tool navigation
 */
function buildBackToToolNav(surfaceType: GrowthSurfaceType): NavItem {
  return {
    label: 'Dán link ngay',
    href: GROWTH_ROUTES.PASTE_LINK,
    icon: 'link',
    isPrimary: true,
  };
}

// ============================================================================
// Entry Links
// ============================================================================

/**
 * Build growth entry links for homepage/landing
 */
export function buildGrowthEntryLinks(): {
  label: string;
  href: string;
  description: string;
  icon: string;
}[] {
  return [
    {
      label: 'Dán link tìm mã',
      href: GROWTH_ROUTES.PASTE_LINK,
      description: 'Dán link sản phẩm để tìm mã giảm giá tự động',
      icon: 'link',
    },
    {
      label: 'Kiểm tra mã',
      href: GROWTH_ROUTES.VOUCHER_CHECKER,
      description: 'Nhập mã giảm giá để kiểm tra còn hoạt động không',
      icon: 'search',
    },
    {
      label: 'Cách sử dụng',
      href: GROWTH_ROUTES.HOW_IT_WORKS,
      description: 'Tìm hiểu cách sử dụng công cụ',
      icon: 'help',
    },
  ];
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Get navigation item by href
 */
export function getNavItemByHref(
  nav: NavItem[],
  href: string
): NavItem | undefined {
  return nav.find((item) => item.href === href);
}

/**
 * Check if nav item is active
 */
export function isNavItemActive(
  nav: NavItem[],
  currentPath: string
): NavItem | undefined {
  return nav.find((item) => item.href === currentPath);
}

/**
 * Validate navigation structure
 */
export function validateNavigation(nav: NavItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check count
  if (nav.length > GROWTH_SURFACE_LIMITS.MAX_NAV_ITEMS) {
    errors.push(`Too many nav items: ${nav.length} (max: ${GROWTH_SURFACE_LIMITS.MAX_NAV_ITEMS})`);
  }

  // Check for primary CTA
  const hasPrimary = nav.some((item) => item.isPrimary);
  if (!hasPrimary) {
    errors.push('Navigation must have at least one primary item');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
