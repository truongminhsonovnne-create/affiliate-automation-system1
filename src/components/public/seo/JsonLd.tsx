/**
 * JSON-LD Structured Data Component
 *
 * Renders structured data for SEO (Rich Snippets)
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * WebApplication schema for voucher finder tool
 */
export function createWebApplicationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Shopee Voucher Finder',
    alternateName: 'Tìm Mã Giảm Giá Shopee',
    description: 'Công cụ tìm mã giảm giá Shopee nhanh nhất. Dán link sản phẩm để tự động tìm và áp dụng mã giảm giá tốt nhất.',
    url: baseUrl,
    applicationCategory: 'ShoppingApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'VND',
    },
    author: {
      '@type': 'Organization',
      name: 'Shopee Voucher Finder',
      url: baseUrl,
    },
  };
}

/**
 * FAQPage schema for FAQ content
 */
export function createFaqPageSchema(baseUrl: string, faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * HowTo schema for step-by-step instructions
 */
export function createHowToSchema(
  baseUrl: string,
  name: string,
  description: string,
  steps: Array<{ name: string; text: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url: `${baseUrl}/how-it-works`,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/**
 * WebSite schema with potential action for search
 */
export function createWebSiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Shopee Voucher Finder',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Organization schema
 */
export function createOrganizationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Shopee Voucher Finder',
    url: baseUrl,
    description: 'Công cụ tìm mã giảm giá Shopee miễn phí',
    sameAs: [],
  };
}
