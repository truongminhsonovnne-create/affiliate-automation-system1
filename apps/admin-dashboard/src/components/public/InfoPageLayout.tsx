'use client';

/**
 * InfoPageLayout — Shared layout for legal / about / contact pages.
 *
 * Wraps PublicLayout and applies a clean editorial prose layout to page content.
 * All text should be inside a <Prose> wrapper to get consistent typography.
 *
 * Usage:
 *   <InfoPageLayout title="Giới thiệu" description="..." lastUpdated="...">
 *     <Prose>...</Prose>
 *   </InfoPageLayout>
 */

import Link from 'next/link';
import { PublicLayout } from './PublicLayoutNew';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

export interface InfoPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  lastUpdated?: string;
  /** Show a breadcrumb above the title */
  breadcrumb?: { label: string; href: string };
  className?: string;
}

export function InfoPageLayout({
  children,
  title,
  description,
  lastUpdated,
  breadcrumb,
  className,
}: InfoPageLayoutProps) {
  return (
    <PublicLayout>
      <div className="section">
        <div className={clsx('space-y-6', className)}>
          {/* Breadcrumb */}
          {breadcrumb && (
            <nav aria-label="Đường dẫn">
              <ol className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <li>
                  <Link href="/home" className="hover:underline transition-colors" style={{ color: 'var(--text-muted)' }}>Trang chủ</Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={breadcrumb.href} className="hover:underline transition-colors" style={{ color: 'var(--text-muted)' }} aria-current="page">
                    {breadcrumb.label}
                  </Link>
                </li>
              </ol>
            </nav>
          )}

          {/* Page header */}
          <header style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem' }}>
            <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            {description && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
            )}
            {lastUpdated && (
              <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cập nhật: {lastUpdated}</span>
              </div>
            )}
          </header>

          {/* Content */}
          <Prose>{children}</Prose>
        </div>
      </div>
    </PublicLayout>
  );
}

/**
 * Prose — Consistent editorial typography for legal/about content.
 * Handles heading hierarchy, paragraph spacing, list styling, and table layout.
 */
function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose-custom space-y-5 text-sm text-gray-700 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2:first-child]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-6 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:relative [&_li]:pl-1 [&_li:before]:absolute [&_li:before]:-left-2 [&_li:before]:top-[0.6em] [&_li:before]:h-1 [&_li:before]:w-1 [&_li:before]:rounded-full [&_li:before]:bg-brand-400 [&_ol]:mt-3 [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:counter-reset-item [&_li]:counter-increment-item [&_strong]:font-semibold [&_strong]:text-gray-900 [&_a]:text-brand-600 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-700 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-600 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-sm [&_td]:text-gray-700 [&_tr]:border-b [&_tr]:border-gray-100 [&_tr]:last:border-0 [&_.note]:mt-4 [&_.note]:rounded-lg [&_.note]:border [&_.note]:border-amber-100 [&_.note]:bg-amber-50 [&_.note]:px-4 [&_.note]:py-3 [&_.note]:text-xs [&_.note]:text-amber-800 [&_.note-title]:font-semibold [&_.note-title]:mb-1">
      {children}
    </div>
  );
}

export { Prose };
