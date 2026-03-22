/**
 * Growth Surface Routing
 *
 * Route definitions and route policies for Consumer Growth Surfaces
 * - Shop pages: /shop/[shopSlug]
 * - Category pages: /category/[categorySlug]
 * - Tool explainer pages: /how-it-works, /paste-link-find-voucher, /voucher-checker
 */

import {
  GrowthSurfaceType,
  GrowthSurfaceRoute,
  SurfaceCtaType,
  ToolPageType,
  isValidGrowthSurfaceType,
  isValidSurfaceCtaType,
} from '../types/index.js';
import {
  GROWTH_ROUTES,
  SURFACE_TYPE_TO_ROUTE,
  TOOL_PAGE_PATHS,
  CTA_TYPE_TO_PATH,
  GROWTH_SURFACE_LIMITS,
} from '../constants/index.js';

// ============================================================================
// Route Definition Types
// ============================================================================

export interface RouteDefinition {
  type: GrowthSurfaceType;
  slug: string;
  path: string;
  pattern: RegExp;
  primaryCta: SurfaceCtaType;
  isIndexable: boolean;
  params?: Record<string, string>;
}

export interface RouteResolution {
  success: boolean;
  surfaceType?: GrowthSurfaceType;
  slug?: string;
  path?: string;
  error?: string;
}

export interface PathBuildOptions {
  slug: string;
  baseUrl?: string;
  queryParams?: Record<string, string>;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Get all growth surface route definitions
 */
export function getGrowthSurfaceRouteDefinitions(): RouteDefinition[] {
  return [
    // Shop pages
    {
      type: GrowthSurfaceType.SHOP,
      slug: '[shopSlug]',
      path: `${GROWTH_ROUTES.SHOP_PREFIX}/[shopSlug]`,
      pattern: /^\/shop\/([a-z0-9-]+)$/,
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: true,
    },

    // Category pages
    {
      type: GrowthSurfaceType.CATEGORY,
      slug: '[categorySlug]',
      path: `${GROWTH_ROUTES.CATEGORY_PREFIX}/[categorySlug]`,
      pattern: /^\/category\/([a-z0-9-]+)$/,
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: true,
    },

    // Tool explainer pages
    {
      type: GrowthSurfaceType.TOOL_EXPLAINER,
      slug: ToolPageType.PASTE_LINK,
      path: TOOL_PAGE_PATHS[ToolPageType.PASTE_LINK],
      pattern: /^\/paste-link-find-voucher$/,
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: true,
    },
    {
      type: GrowthSurfaceType.TOOL_EXPLAINER,
      slug: ToolPageType.HOW_IT_WORKS,
      path: TOOL_PAGE_PATHS[ToolPageType.HOW_IT_WORKS],
      pattern: /^\/how-it-works$/,
      primaryCta: SurfaceCtaType.PASTE_LINK,
      isIndexable: true,
    },
    {
      type: GrowthSurfaceType.TOOL_EXPLAINER,
      slug: ToolPageType.VOUCHER_CHECKER,
      path: TOOL_PAGE_PATHS[ToolPageType.VOUCHER_CHECKER],
      pattern: /^\/voucher-checker$/,
      primaryCta: SurfaceCtaType.RESOLVE_VOUCHER,
      isIndexable: true,
    },
  ];
}

/**
 * Get route definitions by surface type
 */
export function getRouteDefinitionsByType(
  type: GrowthSurfaceType
): RouteDefinition[] {
  const routes = getGrowthSurfaceRouteDefinitions();
  return routes.filter((route) => route.type === type);
}

// ============================================================================
// Route Resolution
// ============================================================================

/**
 * Resolve a path to a growth surface route
 */
export function resolveGrowthSurfaceRoute(path: string): RouteResolution {
  // Normalize path
  const normalizedPath = path.replace(/\/$/, '').toLowerCase();

  const routes = getGrowthSurfaceRouteDefinitions();

  for (const route of routes) {
    const match = normalizedPath.match(route.pattern);
    if (match) {
      return {
        success: true,
        surfaceType: route.type,
        slug: match[1],
        path: route.path.replace('[shopSlug]', match[1]).replace('[categorySlug]', match[1]),
      };
    }
  }

  return {
    success: false,
    error: 'Route not found',
  };
}

/**
 * Validate if a route exists
 */
export function validateGrowthSurfaceRoute(
  path: string
): { valid: boolean; error?: string } {
  const resolution = resolveGrowthSurfaceRoute(path);

  if (!resolution.success) {
    return {
      valid: false,
      error: resolution.error,
    };
  }

  // Additional validation
  if (resolution.slug) {
    const slugValidation = validateSlug(resolution.slug);
    if (!slugValidation.valid) {
      return slugValidation;
    }
  }

  return { valid: true };
}

/**
 * Validate slug format
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  // Check length
  if (slug.length < 1 || slug.length > 100) {
    return {
      valid: false,
      error: 'Slug must be between 1 and 100 characters',
    };
  }

  // Check allowed characters (lowercase letters, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens',
    };
  }

  // Check for consecutive hyphens
  if (/--/.test(slug)) {
    return {
      valid: false,
      error: 'Slug cannot contain consecutive hyphens',
    };
  }

  // Check leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return {
      valid: false,
      error: 'Slug cannot start or end with a hyphen',
    };
  }

  return { valid: true };
}

// ============================================================================
// Path Building
// ============================================================================

/**
 * Build a path for a growth surface
 */
export function buildGrowthSurfacePath(
  surfaceType: GrowthSurfaceType,
  options: PathBuildOptions
): string {
  const { slug, baseUrl = '', queryParams } = options;

  // Validate slug
  const slugValidation = validateSlug(slug);
  if (!slugValidation.valid) {
    throw new Error(`Invalid slug: ${slugValidation.error}`);
  }

  let path: string;

  switch (surfaceType) {
    case GrowthSurfaceType.SHOP:
      path = `${GROWTH_ROUTES.SHOP_PREFIX}/${slug}`;
      break;
    case GrowthSurfaceType.CATEGORY:
      path = `${GROWTH_ROUTES.CATEGORY_PREFIX}/${slug}`;
      break;
    case GrowthSurfaceType.TOOL_EXPLAINER:
      path = TOOL_PAGE_PATHS[slug as ToolPageType] || `/${slug}`;
      break;
    default:
      path = `/${slug}`;
  }

  // Add query params if provided
  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = new URLSearchParams(queryParams).toString();
    path = `${path}?${queryString}`;
  }

  return baseUrl ? `${baseUrl}${path}` : path;
}

/**
 * Build shop page path
 */
export function buildShopPath(slug: string, baseUrl?: string): string {
  return buildGrowthSurfacePath(GrowthSurfaceType.SHOP, { slug, baseUrl });
}

/**
 * Build category page path
 */
export function buildCategoryPath(slug: string, baseUrl?: string): string {
  return buildGrowthSurfacePath(GrowthSurfaceType.CATEGORY, { slug, baseUrl });
}

/**
 * Build tool explainer page path
 */
export function buildToolPagePath(
  toolPageType: ToolPageType,
  baseUrl?: string
): string {
  const path = TOOL_PAGE_PATHS[toolPageType];
  return baseUrl ? `${baseUrl}${path}` : path;
}

// ============================================================================
// Route to Growth Surface Model
// ============================================================================

/**
 * Convert route definition to GrowthSurfaceRoute model
 */
export function toGrowthSurfaceRoute(route: RouteDefinition): GrowthSurfaceRoute {
  return {
    type: route.type,
    slug: route.slug,
    path: route.path,
    primaryCta: route.primaryCta,
    isIndexable: route.isIndexable,
  };
}

/**
 * Get primary CTA type for a surface type
 */
export function getPrimaryCtaForSurface(
  surfaceType: GrowthSurfaceType
): SurfaceCtaType {
  const routes = getRouteDefinitionsByType(surfaceType);
  if (routes.length > 0) {
    return routes[0].primaryCta;
  }
  return SurfaceCtaType.PASTE_LINK;
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Extract slug from path
 */
export function extractSlugFromPath(path: string): string | null {
  const resolution = resolveGrowthSurfaceRoute(path);
  return resolution.slug || null;
}

/**
 * Get surface type from path
 */
export function getSurfaceTypeFromPath(path: string): GrowthSurfaceType | null {
  const resolution = resolveGrowthSurfaceRoute(path);
  return resolution.surfaceType || null;
}

/**
 * Check if path is a growth surface path
 */
export function isGrowthSurfacePath(path: string): boolean {
  return resolveGrowthSurfaceRoute(path).success;
}

// ============================================================================
// Route Statistics
// ============================================================================

/**
 * Get route statistics
 */
export function getRouteStatistics(): {
  totalRoutes: number;
  routesByType: Record<GrowthSurfaceType, number>;
  indexableRoutes: number;
} {
  const routes = getGrowthSurfaceRouteDefinitions();

  const routesByType = routes.reduce(
    (acc, route) => {
      acc[route.type] = (acc[route.type] || 0) + 1;
      return acc;
    },
    {} as Record<GrowthSurfaceType, number>
  );

  return {
    totalRoutes: routes.length,
    routesByType,
    indexableRoutes: routes.filter((r) => r.isIndexable).length,
  };
}
