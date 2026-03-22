import './globals.css';
import type { Metadata } from 'next';
import { AnalyticsProvider } from '@/lib/public/analytics-context';

/**
 * Root Layout — application shell
 *
 * SEO base config:
 *   - Default title / description inherited by all pages
 *   - canonical set per-page via generateMetadata()
 *   - Google Search Console meta verification slot (NEXT_PUBLIC_GSC_VERIFY)
 *   - Open Graph / Twitter Card defaults
 *
 * Route-specific layouts (admin, login) are defined in their own layout.tsx files.
 *
 * /admin/*      → src/app/admin/layout.tsx (AdminRouteGuard + AdminLayoutShell)
 * /admin/login  → uses this root layout (no admin shell, no guard)
 * /api/*        → no UI, handled by route handlers
 */

// Default site URL — override via NEXT_PUBLIC_SITE_URL env var
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voucherfinder.app';
const SITE_NAME = 'VoucherFinder';
const SITE_DESCRIPTION =
  'Dán link sản phẩm Shopee để tìm mã giảm giá tốt nhất. Nhanh, miễn phí, không quảng cáo.';
const GSC_VERIFY = process.env.NEXT_PUBLIC_GSC_VERIFY ?? ''; // e.g. "google123..."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Tìm mã giảm giá Shopee miễn phí`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'mã giảm giá Shopee',
    'voucher Shopee',
    'coupon Shopee',
    'khuyến mãi Shopee',
    'mã free ship Shopee',
  ],
  authors: [{ name: 'VoucherFinder', url: SITE_URL }],
  creator: 'VoucherFinder',
  publisher: 'VoucherFinder',
  robots: {
    index: true,
    follow: true,
  },

  // Open Graph defaults — per-page overrides set the specific page values
  openGraph: {
    siteName: SITE_NAME,
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Tìm mã giảm giá Shopee miễn phí`,
      },
    ],
  },

  // Twitter Card defaults
  twitter: {
    card: 'summary_large_image',
    site: '@VoucherFinder',       // update with real handle when available
    creator: '@VoucherFinder',
    images: ['/og-default.png'],
  },

  // Google Search Console meta tag verification slot
  // To add: set NEXT_PUBLIC_GSC_VERIFY=google123... in .env
  verification: GSC_VERIFY
    ? { google: GSC_VERIFY }
    : {},

  // Category / classification
  category: 'shopping',
  classification: 'coupon finder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        {/* Google Search Console verification meta tag */}
        {/* Set NEXT_PUBLIC_GSC_VERIFY in .env to activate */}
        {GSC_VERIFY && (
          <meta
            name="google-site-verification"
            content={GSC_VERIFY}
          />
        )}
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Web App Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
