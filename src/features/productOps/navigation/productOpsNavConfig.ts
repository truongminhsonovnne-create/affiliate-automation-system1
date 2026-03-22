/**
 * Product Ops Navigation Config
 *
 * Route and navigation configuration for Product Ops section
 */

import type { ProductOpsNavItem } from '../types';

// ============================================================================
// Navigation Items
// ============================================================================

export const PRODUCT_OPS_NAV_ITEMS: ProductOpsNavItem[] = [
  {
    label: 'Overview',
    href: '/product-ops',
    icon: 'dashboard',
  },
  {
    label: 'Review Cases',
    href: '/product-ops/review-cases',
    icon: 'assignment',
  },
  {
    label: 'Remediations',
    href: '/product-ops/remediations',
    icon: 'build',
  },
];

// ============================================================================
// Route Paths
// ============================================================================

export const PRODUCT_OPS_ROUTES = {
  OVERVIEW: '/product-ops',
  REVIEW_CASES: '/product-ops/review-cases',
  REVIEW_CASE_DETAIL: (caseId: string) => `/product-ops/review-cases/${caseId}`,
  REMEDIATIONS: '/product-ops/remediations',
  REMEDIATION_DETAIL: (remediationId: string) => `/product-ops/remediations/${remediationId}`,
} as const;

// ============================================================================
// Breadcrumb Config
// ============================================================================

export const PRODUCT_OPS_BREADCRUMBS = {
  OVERVIEW: [
    { label: 'Product Ops', href: PRODUCT_OPS_ROUTES.OVERVIEW },
  ],
  REVIEW_CASES: [
    { label: 'Product Ops', href: PRODUCT_OPS_ROUTES.OVERVIEW },
    { label: 'Review Cases', href: PRODUCT_OPS_ROUTES.REVIEW_CASES },
  ],
  REVIEW_CASE_DETAIL: (caseId: string) => [
    { label: 'Product Ops', href: PRODUCT_OPS_ROUTES.OVERVIEW },
    { label: 'Review Cases', href: PRODUCT_OPS_ROUTES.REVIEW_CASES },
    { label: 'Case Detail', href: PRODUCT_OPS_ROUTES.REVIEW_CASE_DETAIL(caseId) },
  ],
  REMEDIATIONS: [
    { label: 'Product Ops', href: PRODUCT_OPS_ROUTES.OVERVIEW },
    { label: 'Remediations', href: PRODUCT_OPS_ROUTES.REMEDIATIONS },
  ],
  REMEDIATION_DETAIL: (remediationId: string) => [
    { label: 'Product Ops', href: PRODUCT_OPS_ROUTES.OVERVIEW },
    { label: 'Remediations', href: PRODUCT_OPS_ROUTES.REMEDIATIONS },
    { label: 'Remediation Detail', href: PRODUCT_OPS_ROUTES.REMEDIATION_DETAIL(remediationId) },
  ],
} as const;

// ============================================================================
// Page Titles
// ============================================================================

export const PRODUCT_OPS_PAGE_TITLES = {
  OVERVIEW: 'Product Ops Workbench',
  REVIEW_CASES: 'Review Queue',
  REVIEW_CASE_DETAIL: 'Case Details',
  REMEDIATIONS: 'Remediation Queue',
  REMEDIATION_DETAIL: 'Remediation Details',
} as const;
