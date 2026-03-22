/**
 * Growth Page Shell
 *
 * Main layout wrapper for growth surface pages
 * - Clean, minimal design
 * - No clutter
 * - Primary CTA always visible
 */

import React from 'react';
import type { GrowthSurfaceNavigationModel, GrowthSurfaceCtaModel } from '../../../growthPages/types/index.js';
import { GrowthPageHeader } from './GrowthPageHeader.js';
import { GrowthPrimaryCta } from './GrowthPrimaryCta.js';

interface GrowthPageShellProps {
  children: React.ReactNode;
  navigation: GrowthSurfaceNavigationModel;
  cta: GrowthSurfaceCtaModel;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Growth page shell - main layout wrapper
 */
export function GrowthPageShell({
  children,
  navigation,
  cta,
  className = '',
  maxWidth = 'lg',
}: GrowthPageShellProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div className={`min-h-screen bg-white ${className}`}>
      {/* Header */}
      <GrowthPageHeader navigation={navigation} />

      {/* Main content */}
      <main className={`mx-auto ${maxWidthClass} px-4 py-8`}>
        {/* Hero section with CTA */}
        <div className="mb-8">
          <GrowthPrimaryCta cta={cta.primary} />
        </div>

        {/* Page content */}
        {children}

        {/* Bottom CTA (for mobile/final call-to-action) */}
        <div className="mt-12 border-t pt-8">
          <GrowthPrimaryCta cta={cta.primary} variant="secondary" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <nav className="flex flex-wrap gap-4 text-sm text-gray-600">
            {navigation.footerNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-gray-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <p className="mt-4 text-xs text-gray-500">
            © {new Date().getFullYear()} Affiliate Automation. Miễn phí, không quảng cáo.
          </p>
        </div>
      </footer>
    </div>
  );
}
