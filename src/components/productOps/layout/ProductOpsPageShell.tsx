/**
 * Product Ops Page Shell
 *
 * Main layout wrapper for Product Ops workbench pages
 */

import React from 'react';

interface ProductOpsPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function ProductOpsPageShell({
  children,
  className = '',
}: ProductOpsPageShellProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
          <div className="p-4">
            <h1 className="text-lg font-semibold text-gray-900">
              Product Ops
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Workbench
            </p>
          </div>

          <nav className="mt-4 px-2">
            <NavLink href="/product-ops" label="Overview" icon="📊" />
            <NavLink href="/product-ops/review-cases" label="Review Cases" icon="📋" />
            <NavLink href="/product-ops/remediations" label="Remediations" icon="🔧" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

// Nav Link Component
function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const isActive = typeof window !== 'undefined' && window.location.pathname === href;

  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </a>
  );
}

export default ProductOpsPageShell;
