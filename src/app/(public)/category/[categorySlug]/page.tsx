/**
 * Category Landing Page
 *
 * Public route: /category/[categorySlug]
 * Displays category overview with voucher patterns and paste-link CTA
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryLandingPageData } from '../../../../growthPages/index.js';
import { GrowthPageShell } from '../../../../components/public/growth/GrowthPageShell.js';
import { GrowthSummaryBlock } from '../../../../components/public/growth/GrowthSummaryBlock.js';
import { GrowthRelatedLinks } from '../../../../components/public/growth/GrowthRelatedLinks.js';
import { JsonLd } from '../../../../components/public/seo/JsonLd.js';

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

/**
 * Generate metadata for category page
 */
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;

  try {
    const pageData = await getCategoryLandingPageData(categorySlug);

    if (!pageData) {
      return {
        title: 'Danh mục không tìm thấy',
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
 * Category landing page
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;

  // Fetch page data
  const pageData = await getCategoryLandingPageData(categorySlug);

  // Handle not found
  if (!pageData) {
    notFound();
  }

  // Build structured data for the category
  const categorySchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageData.categoryData.name,
    description: pageData.summary.description,
    url: pageData.seo.canonicalUrl,
  };

  // Render page
  return (
    <>
      {/* Structured Data */}
      <JsonLd data={categorySchema} />

      <GrowthPageShell
        navigation={pageData.navigation}
        cta={pageData.cta}
      >
        {/* Summary section */}
        <GrowthSummaryBlock summary={pageData.summary} />

        {/* Voucher patterns (if any) - minimal display */}
        {pageData.voucherPatterns.length > 0 && (
          <section className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              Mã giảm giá thường gặp
            </h2>
            <ul className="space-y-2">
              {pageData.voucherPatterns.map((pattern, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{pattern.pattern}</span>
                  <span className="ml-2 text-gray-500">
                    (thường: {pattern.typicalDiscount})
                  </span>
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
