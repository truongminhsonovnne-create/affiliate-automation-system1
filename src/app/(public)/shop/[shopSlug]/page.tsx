/**
 * Shop Landing Page
 *
 * Public route: /shop/[shopSlug]
 * Displays shop overview with voucher hints and paste-link CTA
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getShopLandingPageData } from '../../../../growthPages/index.js';
import { GrowthPageShell } from '../../../../components/public/growth/GrowthPageShell.js';
import { GrowthSummaryBlock } from '../../../../components/public/growth/GrowthSummaryBlock.js';
import { GrowthRelatedLinks } from '../../../../components/public/growth/GrowthRelatedLinks.js';
import { JsonLd } from '../../../../components/public/seo/JsonLd.js';

interface ShopPageProps {
  params: Promise<{
    shopSlug: string;
  }>;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

/**
 * Generate metadata for shop page
 */
export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { shopSlug } = await params;

  try {
    const pageData = await getShopLandingPageData(shopSlug);

    if (!pageData) {
      return {
        title: 'Shop không tìm thấy',
      };
    }

    return {
      title: pageData.seo.title,
      description: pageData.seo.description,
      robots: pageData.seo.noIndex ? 'noindex, nofollow' : 'index, follow',
      alternates: {
        canonical: pageData.seo.canonicalUrl,
      },
      openGraph: {
        title: pageData.seo.ogTitle,
        description: pageData.seo.ogDescription,
        url: pageData.seo.canonicalUrl,
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'Lỗi tải trang',
    };
  }
}

/**
 * Shop landing page
 */
export default async function ShopPage({ params }: ShopPageProps) {
  const { shopSlug } = await params;

  // Fetch page data
  const pageData = await getShopLandingPageData(shopSlug);

  // Handle not found
  if (!pageData) {
    notFound();
  }

  // Build structured data for the shop
  const shopSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: pageData.shopData.name,
    description: pageData.summary.description,
    url: pageData.seo.canonicalUrl,
    ...(pageData.shopData.category && {
      shoeStore: {
        '@type': 'Thing',
        name: pageData.shopData.category,
      },
    }),
  };

  // Render page
  return (
    <>
      {/* Structured Data */}
      <JsonLd data={shopSchema} />

      <GrowthPageShell
        navigation={pageData.navigation}
        cta={pageData.cta}
      >
        {/* Summary section */}
        <GrowthSummaryBlock summary={pageData.summary} />

        {/* Voucher hints (if any) - minimal display */}
        {pageData.voucherHints.length > 0 && (
          <section className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              Mã giảm giá gợi ý
            </h2>
            <ul className="space-y-2">
              {pageData.voucherHints.map((hint, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{hint.description}</span>
                  {hint.discount && (
                    <span className="ml-2 text-green-600">{hint.discount}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Related content */}
        <GrowthRelatedLinks related={pageData.related} />
      </GrowthPageShell>
    </>
  );
}
