/**
 * Product Ops Breadcrumbs
 *
 * Breadcrumb navigation for Product Ops pages
 */

import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ProductOpsBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function ProductOpsBreadcrumbs({
  items,
  className = '',
}: ProductOpsBreadcrumbsProps) {
  return (
    <nav className={`flex items-center text-sm ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && (
            <span className="mx-2 text-gray-400">/</span>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-gray-900 font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default ProductOpsBreadcrumbs;
