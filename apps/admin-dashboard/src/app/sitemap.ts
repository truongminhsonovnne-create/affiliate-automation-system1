import { MetadataRoute } from 'next';

/**
 * Sitemap — /sitemap.xml
 *
 * Lists all public, indexable pages of VoucherFinder.
 * Admin (/admin/*), API (/api/*), and internal routes are intentionally excluded.
 *
 * Each entry includes:
 *   - url        — absolute URL
 *   - lastModified — date the content was last meaningfully updated
 *   - changeFrequency — how often the page typically changes
 *   - priority   — relative importance (0.0–1.0)
 *
 * To add new public pages: add them to PUBLIC_ROUTES below.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voucherfinder.app';

const PUBLIC_ROUTES: Array<{
  path: string;
  lastModified: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
    {
      path: '/home',
      lastModified: '2026-03-21',
      changeFrequency: 'daily',
      priority: 1.0,       // homepage — highest priority
    },
    {
      path: '/info/about',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      path: '/info/contact',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/info/privacy',
      lastModified: '2026-03-21',
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      path: '/info/terms',
      lastModified: '2026-03-21',
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      path: '/info/affiliate-disclosure',
      lastModified: '2026-03-21',
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      path: '/info/cookies',
      lastModified: '2026-03-21',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      path: '/info/faq',
      lastModified: '2026-03-24',
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // ── Resources hub ──
    {
      path: '/resources',
      lastModified: '2026-03-21',
      changeFrequency: 'weekly',
      priority: 0.6,
    },

    // ── Deals / discovery pages ──
    {
      path: '/deals',
      lastModified: '2026-03-22',
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      path: '/deals/hot',
      lastModified: '2026-03-22',
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      path: '/deals/expiring',
      lastModified: '2026-03-22',
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      path: '/deals/source/masoffer',
      lastModified: '2026-03-22',
      changeFrequency: 'hourly',
      priority: 0.6,
    },
    {
      path: '/deals/source/accesstrade',
      lastModified: '2026-03-22',
      changeFrequency: 'hourly',
      priority: 0.6,
    },

    // ── Article pages ──
    {
      path: '/resources/huong-dan-san-sale-shopee-2026',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      path: '/resources/cac-loai-voucher-shopee',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      path: '/resources/cach-chon-voucher-phu-hop',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      path: '/resources/chuong-trinh-khuyen-mai-shopee',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      path: '/resources/meo-uu-dai-shopee-2026',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      path: '/resources/hoi-dap-voucher-shopee',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/ma-giam-gia-va-free-ship',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/mua-dien-thoai-tiet-kiem',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/san-giay-chinh-hang',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/uu-dai-thuong-hieu',
      lastModified: '2026-03-21',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/san-deal-theo-shop',
      lastModified: '2026-03-22',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      path: '/resources/confidence-score-la-gi',
      lastModified: '2026-03-22',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      path: '/resources/uu-dai-hieu-qua-cao',
      lastModified: '2026-03-22',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map(({ path, lastModified, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
