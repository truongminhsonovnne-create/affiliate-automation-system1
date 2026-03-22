/**
 * Growth Primary CTA
 *
 * Primary call-to-action component for growth pages
 * - Clean, prominent but subtle
 * - Always leads to tool
 */

import React from 'react';
import type { CtaButton, SurfaceCtaType } from '../../../growthPages/types/index.js';

interface GrowthPrimaryCtaProps {
  cta: CtaButton;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Get icon SVG based on CTA type
 */
function getCtaIcon(ctaType: SurfaceCtaType): React.ReactNode {
  const iconClass = "w-5 h-5";

  switch (ctaType) {
    case SurfaceCtaType.PASTE_LINK:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case SurfaceCtaType.RESOLVE_VOUCHER:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case SurfaceCtaType.COPY_VOUCHER:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case SurfaceCtaType.OPEN_SHOPEE:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      );
  }
}

/**
 * Growth primary CTA component
 */
export function GrowthPrimaryCta({
  cta,
  variant = 'primary',
  className = '',
}: GrowthPrimaryCtaProps) {
  const baseStyles = 'inline-flex items-center gap-2 font-medium transition-all duration-200';

  const variantStyles = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-lg',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 px-5 py-2.5 rounded-lg text-sm',
  };

  return (
    <a
      href={cta.href}
      data-tracking-id={cta.trackingId}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {getCtaIcon(cta.type)}
      {cta.label}
    </a>
  );
}

/**
 * Growth secondary CTA component
 */
interface GrowthSecondaryCtaProps {
  ctas: CtaButton[];
  className?: string;
}

export function GrowthSecondaryCtaGroup({
  ctas,
  className = '',
}: GrowthSecondaryCtaProps) {
  if (ctas.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {ctas.map((cta, index) => (
        <a
          key={index}
          href={cta.href}
          data-tracking-id={cta.trackingId}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {getCtaIcon(cta.type)}
          {cta.label}
        </a>
      ))}
    </div>
  );
}
