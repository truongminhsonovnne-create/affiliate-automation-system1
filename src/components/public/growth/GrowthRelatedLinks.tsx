/**
 * Growth Related Links
 *
 * Internal linking component for growth pages
 * - Few but contextually correct links
 * - No link farms
 */

import React from 'react';
import type { GrowthSurfaceRelatedContent } from '../../../growthPages/types/index.js';

interface GrowthRelatedLinksProps {
  related: GrowthSurfaceRelatedContent;
  className?: string;
}

/**
 * Related link item
 */
interface RelatedLinkItem {
  slug: string;
  name: string;
  subtitle?: string;
  href: string;
  icon: string;
}

/**
 * Get icon for related item type
 */
function getRelatedIcon(type: 'shop' | 'category' | 'tool'): string {
  switch (type) {
    case 'shop':
      return '🏪';
    case 'category':
      return '📁';
    case 'tool':
      return '🔧';
    default:
      return '📄';
  }
}

/**
 * Convert related content to items
 */
function getRelatedItems(related: GrowthSurfaceRelatedContent): { type: 'shop' | 'category' | 'tool'; items: RelatedLinkItem[] }[] {
  const result: { type: 'shop' | 'category' | 'tool'; items: RelatedLinkItem[] }[] = [];

  if (related.shops.length > 0) {
    result.push({
      type: 'shop',
      items: related.shops.map((shop) => ({
        slug: shop.slug,
        name: shop.name,
        subtitle: shop.voucherCount ? `${shop.voucherCount} mã` : undefined,
        href: `/shop/${shop.slug}`,
        icon: 'shop',
      })),
    });
  }

  if (related.categories.length > 0) {
    result.push({
      type: 'category',
      items: related.categories.map((cat) => ({
        slug: cat.slug,
        name: cat.name,
        subtitle: cat.shopCount ? `${cat.shopCount} shop` : undefined,
        href: `/category/${cat.slug}`,
        icon: 'category',
      })),
    });
  }

  if (related.tools.length > 0) {
    result.push({
      type: 'tool',
      items: related.tools.map((tool) => ({
        slug: tool.slug,
        name: tool.name,
        subtitle: tool.description,
        href: getToolHref(tool.slug),
        icon: 'tool',
      })),
    });
  }

  return result;
}

function getToolHref(slug: string): string {
  switch (slug) {
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

/**
 * Growth related links component
 */
export function GrowthRelatedLinks({
  related,
  className = '',
}: GrowthRelatedLinksProps) {
  const relatedGroups = getRelatedItems(related);

  if (relatedGroups.length === 0) {
    return null;
  }

  return (
    <section className={`mt-12 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Liên quan
      </h2>

      <div className="space-y-6">
        {relatedGroups.map((group) => (
          <div key={group.type}>
            <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
              {group.type === 'shop' ? 'Shop' : group.type === 'category' ? 'Danh mục' : 'Công cụ'}
            </h3>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <a
                    href={item.href}
                    className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-2">{getRelatedIcon(group.type)}</span>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.subtitle && (
                      <span className="block text-sm text-gray-500 mt-1">
                        {item.subtitle}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
