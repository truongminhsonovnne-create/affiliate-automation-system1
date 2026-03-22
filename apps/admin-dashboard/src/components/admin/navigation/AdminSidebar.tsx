'use client';

/**
 * Admin Sidebar v2 — Premium dark sidebar.
 *
 * Mobile: full-screen overlay from left.
 * Desktop: collapsible (icon-only / expanded), uses CSS design tokens.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavSections, isNavItemActive, type NavSection, type NavItem } from './adminNavConfig';
import { ChevronDown, X, Zap } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const COLLAPSED_W = '4.5rem';  // 72px — icon only
const EXPANDED_W  = '16rem';   // 256px — icon + label

// =============================================================================
// Collapsible section
// =============================================================================

function NavSectionComponent({
  section,
  collapsed,
  pathname,
}: {
  section: NavSection;
  collapsed: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(section.items.some((i) => isNavItemActive(i.href, pathname)));

  return (
    <div>
      {/* Section label */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors duration-[var(--duration)]',
          'hover:bg-white/5',
          collapsed && 'justify-center'
        )}
        aria-expanded={open}
      >
        <span
          className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em',
            fontSize: '0.6875rem',
          }}
        >
          {section.icon && (
            <section.icon className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} aria-hidden="true" />
          )}
          {!collapsed && section.title}
        </span>

        {!collapsed && (
          <ChevronDown
            className="ml-auto h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200"
            style={{ color: 'rgba(255,255,255,0.25)', transform: open ? 'rotate(-180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Items */}
      {open && (
        <div className="mt-1 space-y-0.5 px-2">
          {section.items.map((item) => (
            <NavItemComponent key={item.href} item={item} collapsed={collapsed} pathname={pathname} isNavActive={isNavItemActive(item.href, pathname)} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Single nav item
// =============================================================================

function NavItemComponent({
  item,
  collapsed,
  isNavActive,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  isNavActive: boolean;
}) {

  return (
    <Link
      href={item.href}
      className={clsx(
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-[var(--duration)]',
        collapsed && 'justify-center',
        isNavActive
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      )}
      aria-current={isNavActive ? 'page' : undefined}
    >
      {/* Active indicator bar */}
      {isNavActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full"
          style={{ backgroundColor: 'var(--brand-500)' }}
          aria-hidden="true"
        />
      )}

      {item.icon && (
        <item.icon
          className="h-4 w-4 flex-shrink-0 transition-colors"
          style={{ color: isNavActive ? 'var(--brand-400)' : 'inherit' }}
          aria-hidden="true"
        />
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}

      {/* Tooltip on collapsed */}
      {collapsed && (
        <span
          className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: 'var(--gray-800)',
            color: 'white',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

// =============================================================================
// Root
// =============================================================================

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-30 transition-opacity duration-200',
          'sm:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      />

      {/* ── Sidebar panel ── */}
      <aside
        className={clsx(
          'relative flex flex-col min-h-screen flex-shrink-0 overflow-hidden',
          'transition-[width,padding] duration-200',
          // Mobile
          'fixed inset-y-0 left-0 z-40',
          open ? 'translate-x-0' : '-translate-x-full',
          'sm:relative sm:inset-auto sm:translate-x-0',
          // Widths
          !collapsed
            ? 'sm:w-64'
            : 'sm:w-16'
        )}
        style={{
          backgroundColor: '#111827',
          width: !collapsed ? '16rem' : '4.5rem',
        }}
      >
        {/* Logo bar */}
        <div
          className="flex items-center justify-between flex-shrink-0 px-4"
          style={{ height: '3.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {!collapsed ? (
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div
                className="flex items-center justify-center rounded-lg transition-shadow duration-200 group-hover:shadow-[var(--shadow-brand-sm)]"
                style={{
                  width: '2rem',
                  height: '2rem',
                  background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                  boxShadow: '0 1px 3px rgba(249,115,22,0.3)',
                }}
                aria-hidden="true"
              >
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span
                className="font-bold text-white text-sm"
                style={{ letterSpacing: '-0.01em' }}
              >
                VoucherFinder
              </span>
            </Link>
          ) : (
            <div
              className="mx-auto flex items-center justify-center rounded-lg"
              style={{
                width: '2rem',
                height: '2rem',
                background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
              }}
              aria-hidden="true"
            >
              <Zap className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
            className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
          >
            <svg
              className="h-4 w-4 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
            </svg>
          </button>
        </div>

        {/* Nav scroll area */}
        <nav
          className="flex-1 overflow-y-auto py-4 px-3"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          aria-label="Điều hướng quản trị"
        >
          <div className="space-y-5">
            {adminNavSections.map((section) => (
              <NavSectionComponent
                key={section.title}
                section={section}
                collapsed={collapsed}
                pathname={pathname ?? ''}
              />
            ))}
          </div>
        </nav>

        {/* Bottom section: collapse toggle + user */}
        <div
          className="flex-shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: 'rgba(249,115,22,0.15)',
                  color: 'var(--brand-400)',
                }}
                aria-hidden="true"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Admin
                </p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Quản trị viên
                </p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex items-center justify-center rounded-full"
              style={{
                width: '2rem',
                height: '2rem',
                backgroundColor: 'rgba(249,115,22,0.15)',
              }}
              aria-hidden="true"
            >
              <svg className="h-4 w-4" style={{ color: 'var(--brand-400)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
