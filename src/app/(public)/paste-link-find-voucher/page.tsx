/**
 * Paste Link Find Voucher Page
 *
 * Public route: /paste-link-find-voucher
 * Tool explainer for paste-link functionality
 */

import { Metadata } from 'next';
import { getPasteLinkToolPageData } from '../../../growthPages/index.js';
import { GrowthPageShell } from '../../../components/public/growth/GrowthPageShell.js';
import { GrowthSummaryBlock } from '../../../components/public/growth/GrowthSummaryBlock.js';
import { GrowthSupportCards } from '../../../components/public/growth/GrowthSupportCards.js';
import { GrowthRelatedLinks } from '../../../components/public/growth/GrowthRelatedLinks.js';
import { JsonLd, createWebApplicationSchema, createHowToSchema, createFaqPageSchema } from '../../../components/public/seo/JsonLd.js';

export const dynamic = 'force-static';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voucherfinder.app';

/**
 * Generate metadata for paste-link tool page
 */
export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getPasteLinkToolPageData();

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
}

/**
 * Paste link find voucher page
 */
export default async function PasteLinkPage() {
  const pageData = await getPasteLinkToolPageData();

  // Build structured data
  const webAppSchema = createWebApplicationSchema(baseUrl);

  const howToSchema = createHowToSchema(
    baseUrl,
    'Cách sử dụng công cụ tìm mã giảm giá Shopee',
    'Hướng dẫn từng bước để tìm và áp dụng mã giảm giá Shopee',
    pageData.toolData.steps.map(s => ({ name: s.title, text: s.description }))
  );

  const faqSchema = createFaqPageSchema(
    baseUrl,
    pageData.toolData.faqs?.map(f => ({ question: f.question, answer: f.answer })) || []
  );

  return (
    <>
      {/* Structured Data (JSON-LD) */}
      <JsonLd data={webAppSchema} />
      <JsonLd data={howToSchema} />
      {pageData.toolData.faqs && pageData.toolData.faqs.length > 0 && (
        <JsonLd data={faqSchema} />
      )}

      <GrowthPageShell
        navigation={pageData.navigation}
        cta={pageData.cta}
      >
        {/* Summary section */}
        <GrowthSummaryBlock summary={pageData.summary} />

        {/* Steps */}
        {pageData.toolData.steps.length > 0 && (
          <GrowthSupportCards
            type="steps"
            items={pageData.toolData.steps}
          />
        )}

        {/* FAQs */}
        {pageData.toolData.faqs && pageData.toolData.faqs.length > 0 && (
          <GrowthSupportCards
            type="faq"
            items={pageData.toolData.faqs}
          />
        )}

        {/* Related content */}
        <GrowthRelatedLinks related={pageData.related} />
      </GrowthPageShell>
    </>
  );
}
