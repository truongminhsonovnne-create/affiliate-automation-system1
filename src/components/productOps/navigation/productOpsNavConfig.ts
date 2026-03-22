/**
 * Product Ops Navigation Configuration
 *
 * Navigation configuration for Product Ops workbench
 */

import type { ProductOpsNavItem } from '../../features/productOps/types';

export const PRODUCT_OPS_NAV_CONFIG: ProductOpsNavItem[] = [
  {
    label: 'Workbench',
    href: '/product-ops',
    icon: 'dashboard',
  },
  {
    label: 'Review Queue',
    href: '/product-ops/review-cases',
    icon: 'clipboard-list',
  },
  {
    label: 'Remediations',
    href: '/product-ops/remediations',
    icon: 'wrench',
  },
];

export const PRODUCT_OPS_SUB_NAV_CONFIG: Record<string, ProductOpsNavItem[]> = {
  '/product-ops': [
    {
      label: 'Overview',
      href: '/product-ops',
    },
    {
      label: 'Trends',
      href: '/product-ops/trends',
    },
    {
      label: 'Impact',
      href: '/product-ops/impact',
    },
  ],
  '/product-ops/review-cases': [
    {
      label: 'Queue',
      href: '/product-ops/review-cases',
    },
    {
      label: 'My Cases',
      href: '/product-ops/review-cases/my-cases',
    },
  ],
};

// Badge configurations
export const PRODUCT_OPS_BADGE_CONFIG = {
  reviewQueue: {
    path: 'queue',
    key: 'openCases',
    threshold: 10,
    alertThreshold: 50,
  },
  remediations: {
    path: 'remediations',
    key: 'pendingApproval',
    threshold: 5,
    alertThreshold: 20,
  },
} as const;

// Helper to build nav items with badges
export function buildNavWithBadges(
  navItems: ProductOpsNavItem[],
  badges: Record<string, number>
): ProductOpsNavItem[] {
  return navItems.map((item) => {
    const badgeKey = item.href.replace('/product-ops/', '').replace('/', '') || 'workbench';
    const badge = badges[badgeKey];

    if (badge !== undefined && badge > 0) {
      return {
        ...item,
        badge,
        badgeType: badge >= 50 ? 'alert' : 'count',
      };
    }

    return item;
  });
}

export default PRODUCT_OPS_NAV_CONFIG;
