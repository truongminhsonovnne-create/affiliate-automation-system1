'use client';

/**
 * Admin Topbar v2 — Consistent with design system.
 *
 * Shows:
 *   - App name context
 *   - User info + role badge
 *   - Status indicator (online)
 *   - Logout
 */

import { useAuth } from '@/lib/auth/useAuth';
import { roleLabels } from '@/lib/auth/rbac';
import { LogOut, Shield } from 'lucide-react';
import clsx from 'clsx';

interface AdminTopbarProps {
  onLogout?: () => void;
  onMenuToggle?: () => void;
}

export function AdminTopbar({ onLogout, onMenuToggle }: AdminTopbarProps) {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogout?.();
    window.location.href = '/admin/login';
  };

  if (!isAuthenticated) return null;

  const role = user?.role as keyof typeof roleLabels;
  const roleLabel = roleLabels[role] || 'User';

  return (
    <header
      className="flex items-center justify-between flex-shrink-0"
      style={{
        height: '3.75rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        backgroundColor: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-1)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Mở menu"
          className={clsx(
            'flex items-center justify-center rounded-[var(--radius)]',
            'transition-colors duration-[var(--duration)]',
            'sm:hidden',
          )}
          style={{
            width: '2.25rem',
            height: '2.25rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--gray-100)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* App icon */}
        <div
          className="flex items-center justify-center rounded-[var(--radius)]"
          style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: 'var(--brand-500)',
            boxShadow: 'var(--shadow-brand-sm)',
          }}
          aria-hidden="true"
        >
          <Shield className="h-4 w-4 text-white" />
        </div>

        <span
          className="font-semibold text-sm"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          Affiliate Admin
        </span>

        {/* Status */}
        <div
          className="hidden sm:flex items-center gap-1.5 pl-3"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--success-500)' }}
            aria-hidden="true"
          ></span>
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Online
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* User */}
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: 'var(--gray-100)',
              border: '1px solid var(--border-default)',
            }}
            aria-hidden="true"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>

          <div className="hidden sm:block">
            <p
              className="text-xs font-semibold leading-none"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {user?.id ?? 'Admin'}
            </p>
            <p
              className="text-[11px] leading-none mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-5 w-px"
          style={{ backgroundColor: 'var(--border-subtle)' }}
          aria-hidden="true"
        />

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-[var(--radius)] text-xs font-medium"
          style={{
            padding: '0.375rem 0.75rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
            transition: 'background-color var(--duration), color var(--duration)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'var(--error-50)';
            el.style.color = 'var(--error-600)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.backgroundColor = 'transparent';
            el.style.color = 'var(--text-secondary)';
          }}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}

export default AdminTopbar;
