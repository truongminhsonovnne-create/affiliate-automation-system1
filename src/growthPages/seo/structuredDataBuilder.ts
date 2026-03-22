/**
 * Structured Data Builder
 *
 * Builds SEO-safe structured data (JSON-LD) for growth surfaces
 * - BreadcrumbList
 * - WebPage
 * - FAQPage (for tool explainers)
 * - Tool pages
 *
 * IMPORTANT: Only use when appropriate, don't spam schema
 */

import type {
  BreadcrumbItem,
  ToolStep,
  FaqItem,
  GrowthSurfaceType,
} from '../types/index.js';
import { GROWTH_PAGES_CONFIG, GROWTH_SURFACE_LIMITS } from '../constants/index.js';

// ============================================================================
// Breadcrumb Structured Data
// ============================================================================

/**
 * Build BreadcrumbList structured data
 */
export function buildBreadcrumbStructuredData(
  items: BreadcrumbItem[],
  baseUrl?: string
): Record<string, unknown> {
  // Validate and limit items
  const validItems = items.slice(0, GROWTH_SURFACE_LIMITS.MAX_BREADCRUMB_ITEMS);

  const breadcrumbItems = validItems.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.label,
    ...(item.href ? { item: `${baseUrl || GROWTH_PAGES_CONFIG.BASE_URL}${item.href}` } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };
}

/**
 * Build simple breadcrumb for a specific surface
 */
export function buildSurfaceBreadcrumb(params: {
  surfaceType: GrowthSurfaceType;
  surfaceName: string;
  surfaceSlug: string;
  parentName?: string;
  parentSlug?: string;
}): Record<string, unknown> {
  const items: BreadcrumbItem[] = [
    { label: 'Trang chủ', href: '/' },
  ];

  // Add parent if exists
  if (params.parentName && params.parentSlug) {
    items.push({
      label: params.parentName,
      href: `/${params.parentSlug}`,
    });
  }

  // Add current surface
  items.push({
    label: params.surfaceName,
    isCurrent: true,
  });

  return buildBreadcrumbStructuredData(items);
}

// ============================================================================
// WebPage Structured Data
// ============================================================================

/**
 * Build WebPage structured data
 */
export function buildWebPageStructuredData(params: {
  url: string;
  title: string;
  description: string;
  publishDate?: string;
  modifiedDate?: string;
  author?: string;
  image?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: params.url,
    name: params.title,
    description: params.description,
    ...(params.publishDate ? { datePublished: params.publishDate } : {}),
    ...(params.modifiedDate ? { dateModified: params.modifiedDate } : {}),
    ...(params.author ? { author: { '@type': 'Organization', name: params.author } } : {}),
    ...(params.image ? { image: params.image } : {}),
    publisher: {
      '@type': 'Organization',
      name: GROWTH_PAGES_CONFIG.SITE_NAME,
    },
  };
}

/**
 * Build specialized WebPage for growth surfaces
 */
export function buildGrowthSurfaceWebPage(params: {
  path: string;
  title: string;
  description: string;
  surfaceType: GrowthSurfaceType;
}): Record<string, unknown> {
  const url = `${GROWTH_PAGES_CONFIG.BASE_URL}${params.path}`;

  return buildWebPageStructuredData({
    url,
    title: params.title,
    description: params.description,
  });
}

// ============================================================================
// FAQ Structured Data
// ============================================================================

/**
 * Build FAQPage structured data
 */
export function buildFaqStructuredData(
  faqs: FaqItem[]
): Record<string, unknown> {
  // Validate and limit FAQs
  const validFaqs = faqs.slice(0, GROWTH_SURFACE_LIMITS.MAX_FAQ_ITEMS);

  const faqItems = validFaqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems,
  };
}

// ============================================================================
// Tool Page Structured Data
// ============================================================================

/**
 * Build HowTo structured data for tool explainer pages
 */
export function buildToolPageStructuredData(params: {
  toolName: string;
  toolDescription: string;
  steps: ToolStep[];
  image?: string;
}): Record<string, unknown> {
  const howToSteps = params.steps.map((step) => ({
    '@type': 'HowToStep',
    name: step.title,
    text: step.description,
    ...(step.number ? { position: step.number } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.toolName,
    description: params.toolDescription,
    step: howToSteps,
    ...(params.image ? { image: params.image } : {}),
    provider: {
      '@type': 'Organization',
      name: GROWTH_PAGES_CONFIG.SITE_NAME,
    },
  };
}

/**
 * Build SoftwareApplication structured data for the tool
 */
export function buildToolSoftwareStructuredData(params: {
  toolName: string;
  toolDescription: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.toolName,
    description: params.toolDescription,
    url: params.url,
    applicationCategory: 'ShoppingUtilityApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'VND',
    },
    provider: {
      '@type': 'Organization',
      name: GROWTH_PAGES_CONFIG.SITE_NAME,
    },
  };
}

// ============================================================================
// Organization Structured Data
// ============================================================================

/**
 * Build Organization structured data
 */
export function buildOrganizationStructuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: GROWTH_PAGES_CONFIG.SITE_NAME,
    url: GROWTH_PAGES_CONFIG.BASE_URL,
    logo: `${GROWTH_PAGES_CONFIG.BASE_URL}/logo.png`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Vietnamese',
    },
  };
}

// ============================================================================
// SiteNavigationElement
// ============================================================================

/**
 * Build SiteNavigationElement for primary navigation
 */
export function buildNavigationStructuredData(navItems: {
  label: string;
  url: string;
}[]): Record<string, unknown> {
  const navElements = navItems.map((item, index) => ({
    '@type': 'SiteNavigationElement',
    name: item.label,
    url: item.url,
    position: index + 1,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': navElements,
  };
}

// ============================================================================
// Aggregate Offer (for voucher/deal pages - USE SPARINGLY)
// ============================================================================

/**
 * Build AggregateOffer for voucher hints (USE SPARINGLY - not for spam)
 * Only use when there's genuine value, not for coupon directory spam
 */
export function buildVoucherAggregateOffer(params: {
  lowPrice?: string;
  highPrice?: string;
  priceCurrency?: string;
}): Record<string, unknown> | null {
  // Only build if there's meaningful data
  if (!params.lowPrice && !params.highPrice) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    lowPrice: params.lowPrice || params.highPrice,
    highPrice: params.highPrice,
    priceCurrency: params.priceCurrency || 'VND',
    offerCount: 1,
  };
}

// ============================================================================
// Collection Page (for category pages - minimal use)
// ============================================================================

/**
 * Build CollectionPage for category surfaces (minimal use)
 */
export function buildCollectionPageStructuredData(params: {
  name: string;
  description: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    description: params.description,
    url: params.url,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate structured data (basic check)
 */
export function validateStructuredData(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check @context
  if (!data['@context']) {
    errors.push('Missing @context');
  }

  // Check @type
  if (!data['@type']) {
    errors.push('Missing @type');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Serialize structured data to JSON-LD string
 */
export function serializeStructuredData(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Build script tag for structured data
 */
export function buildStructuredDataScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${serializeStructuredData(data)}</script>`;
}
