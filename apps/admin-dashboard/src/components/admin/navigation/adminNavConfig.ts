/**
 * Admin Navigation Configuration
 *
 * Centralized navigation configuration for the admin dashboard.
 */

import {
  LayoutDashboard,
  Package,
  Search,
  Send,
  BrainCircuit,
  AlertTriangle,
  Users,
  Activity,
  LucideIcon,
  ActivitySquare,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  icon?: LucideIcon;
  items: NavItem[];
}

/**
 * Main navigation sections
 */
export const adminNavSections: NavSection[] = [
  {
    title: 'Tổng quan',
    icon: LayoutDashboard,
    items: [
      {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Hoạt động',
        href: '/admin/activity',
        icon: Activity,
      },
    ],
  },
  {
    title: 'Quản lý nội dung',
    icon: Package,
    items: [
      {
        label: 'Sản phẩm',
        href: '/admin/products',
        icon: Package,
      },
      {
        label: 'Crawl Jobs',
        href: '/admin/jobs/crawl',
        icon: Search,
      },
      {
        label: 'Publish Jobs',
        href: '/admin/jobs/publish',
        icon: Send,
      },
      {
        label: 'AI Contents',
        href: '/admin/ai-content',
        icon: BrainCircuit,
      },
    ],
  },
  {
    title: 'Giám sát',
    icon: AlertTriangle,
    items: [
      {
        label: 'System Health',
        href: '/admin/system-health',
        icon: ActivitySquare,
      },
      {
        label: 'Dead Letters',
        href: '/admin/dead-letters',
        icon: AlertTriangle,
      },
      {
        label: 'Workers',
        href: '/admin/workers',
        icon: Users,
      },
    ],
  },
  {
    title: 'Tích hợp',
    icon: Activity,
    items: [
      {
        label: 'AccessTrade',
        href: '/admin/integrations/accesstrade',
        icon: Activity,
      },
      {
        label: 'MasOffer',
        href: '/admin/integrations/masoffer',
        icon: Activity,
      },
      {
        label: 'Ecomobi',
        href: '/admin/integrations/ecomobi',
        icon: Activity,
      },
    ],
  },
];

/**
 * Get all navigation items as flat array
 */
export function getAllNavItems(): NavItem[] {
  return adminNavSections.flatMap((section) => section.items);
}

/**
 * Find navigation item by href
 */
export function findNavItemByHref(href: string): NavItem | undefined {
  return getAllNavItems().find((item) => item.href === href);
}

/**
 * Get navigation section by href
 */
export function getNavSectionByHref(href: string): NavSection | undefined {
  return adminNavSections.find((section) =>
    section.items.some((item) => item.href === href)
  );
}

/**
 * Check if href is active (exact or child match)
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(href + '/')) return true;
  return false;
}
