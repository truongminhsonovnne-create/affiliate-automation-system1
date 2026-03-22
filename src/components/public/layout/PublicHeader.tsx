// =============================================================================
// Public Header
// Minimal header with internal links for SEO
// =============================================================================

import Link from 'next/link';

/**
 * Minimal header for public pages with navigation
 */
export function PublicHeader() {
  return (
    <header className="border-b border-gray-100 py-4">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            Shopee Voucher Finder
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/paste-link-find-voucher"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Cách dùng
            </Link>
            <Link
              href="/how-it-works"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Hướng dẫn
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
