/**
 * Product Ops Page Header
 *
 * Header component for Product Ops pages
 */

import React from 'react';

interface ProductOpsPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ProductOpsPageHeader({
  title,
  subtitle,
  actions,
}: ProductOpsPageHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export default ProductOpsPageHeader;
