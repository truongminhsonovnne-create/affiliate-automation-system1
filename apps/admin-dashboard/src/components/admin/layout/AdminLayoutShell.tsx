'use client';

/**
 * Admin Layout Shell v2 — Premium admin wrapper.
 *
 * Uses design system CSS tokens throughout.
 * Does NOT perform auth checks — those live in the route.
 */

import { ReactNode, useState } from 'react';
import { AdminSidebar } from '../navigation/AdminSidebar';
import { AdminTopbar } from '../navigation/AdminTopbar';

export interface AdminLayoutShellProps {
  children: ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--surface-base)' }}
    >
      {/* Sidebar */}
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <AdminTopbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Content */}
        <main
          className="flex-1 overflow-auto"
          style={{ padding: '1.5rem' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayoutShell;
