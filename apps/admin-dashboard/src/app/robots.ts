/**
 * robots.ts — Dynamic /robots.txt
 *
 * Reflects the canonical site URL from NEXT_PUBLIC_SITE_URL
 * so sitemap and allow/disallow directives are always accurate
 * regardless of deployment domain.
 *
 * The sitemap directive is updated automatically when NEXT_PUBLIC_SITE_URL changes.
 */

import { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voucherfinder.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/home',
          '/info/about',
          '/info/contact',
          '/info/privacy',
          '/info/cookies',
          '/info/terms',
          '/info/faq',
          '/info/affiliate-disclosure',
          '/deals',
          '/deals/hot',
          '/deals/expiring',
          '/deals/source/masoffer',
          '/deals/source/accesstrade',
          '/deals/shopee',
          '/deals/lazada',
          '/deals/dien-thoai',
          '/deals/thoi-trang',
          '/deals/suc-khoe-lam-dep',
          '/deals/laptop',
          '/resources',
          '/resources/huong-dan-san-sale-shopee-2026',
          '/resources/cac-loai-voucher-shopee',
          '/resources/cach-chon-voucher-phu-hop',
          '/resources/chuong-trinh-khuyen-mai-shopee',
          '/resources/meo-uu-dai-shopee-2026',
          '/resources/hoi-dap-voucher-shopee',
          '/resources/ma-giam-gia-va-free-ship',
          '/resources/mua-dien-thoai-tiet-kiem',
          '/resources/san-giay-chinh-hang',
          '/resources/uu-dai-thuong-hieu',
          '/resources/san-deal-theo-shop',
          '/resources/confidence-score-la-gi',
          '/resources/uu-dai-hieu-qua-cao',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/api/internal/',
          '/api/health',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
