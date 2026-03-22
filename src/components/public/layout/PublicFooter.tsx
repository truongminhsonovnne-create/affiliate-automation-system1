// =============================================================================
// Public Footer
// Footer with internal links for SEO
// =============================================================================

import Link from 'next/link';

/**
 * Footer for public pages with navigation
 */
export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-100 py-6 mt-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="flex flex-wrap justify-center gap-4 mb-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <Link href="/paste-link-find-voucher" className="text-gray-600 hover:text-blue-600 transition-colors">
            Dán link tìm mã
          </Link>
          <Link href="/how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
            Cách sử dụng
          </Link>
          <Link href="/voucher-checker" className="text-gray-600 hover:text-blue-600 transition-colors">
            Kiểm tra mã
          </Link>
        </nav>
        <div className="text-center text-sm text-gray-500">
          <p>© {currentYear} Shopee Voucher Finder. Miễn phí, không quảng cáo.</p>
          <p className="text-xs mt-1">
            Không liên kết với Shopee. Chỉ là công cụ tìm kiếm mã giảm giá.
          </p>
        </div>
      </div>
    </footer>
  );
}
