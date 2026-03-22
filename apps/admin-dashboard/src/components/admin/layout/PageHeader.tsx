'use client';

/**
 * PageHeader — Standard page header for admin screens.
 *
 * Provides:
 *   - Breadcrumbs (auto-derived from navigation config or manual)
 *   - Title + description
 *   - Optional icon
 *   - Action buttons (right-aligned)
 *
 * Usage:
 *   <PageHeader
 *     title="Sản phẩm"
 *     description="42 sản phẩm"
 *     icon={Package}
 *     breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Sản phẩm' }]}
 *     actions={<Button size="sm">Thêm mới</Button>}
 *   />
 */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-gray-500 mb-2"
        >
          <Link
            href="/admin/dashboard"
            className="hover:text-gray-700 transition-colors duration-150"
          >
            Trang chủ
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-700 transition-colors duration-150"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        {/* Title block */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          {Icon && (
            <div
              className={clsx(
                'flex-shrink-0 flex items-center justify-center',
                'h-10 w-10 rounded-xl bg-brand-50 text-brand-600',
                'border border-brand-100'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}

          {/* Text */}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500 truncate">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
