/**
 * Growth Page Header
 *
 * Header component for growth surface pages
 * - Minimal navigation
 * - Logo + tool links
 */

import React from 'react';
import type { GrowthSurfaceNavigationModel, BreadcrumbItem } from '../../../growthPages/types/index.js';

interface GrowthPageHeaderProps {
  navigation: GrowthSurfaceNavigationModel;
  className?: string;
}

/**
 * Breadcrumb navigation component
 */
function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={item.href || index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">
                /
              </span>
            )}
            {item.isCurrent ? (
              <span className="font-medium text-gray-900" aria-current="page">
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Primary navigation component
 */
function PrimaryNav({ items }: { items: GrowthSurfaceNavigationModel['primaryNav'] }) {
  return (
    <nav className="hidden md:flex items-center gap-6">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`text-sm transition-colors ${
            item.isPrimary
              ? 'font-medium text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Mobile menu button (placeholder)
 */
function MobileMenuButton() {
  return (
    <button
      type="button"
      className="md:hidden p-2 text-gray-600 hover:text-gray-900"
      aria-label="Menu"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  );
}

/**
 * Growth page header component
 */
export function GrowthPageHeader({
  navigation,
  className = '',
}: GrowthPageHeaderProps) {
  return (
    <header className={`border-b bg-white ${className}`}>
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Breadcrumbs */}
        <Breadcrumbs items={navigation.breadcrumbs} />

        {/* Logo + Nav */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              Affiliate Automation
            </span>
          </a>

          {/* Desktop navigation */}
          <PrimaryNav items={navigation.primaryNav} />

          {/* Mobile menu */}
          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
}
