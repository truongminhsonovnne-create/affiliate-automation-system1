/**
 * Website Channel Renderer
 *
 * Builds website/programmatic SEO-optimized publish payloads
 */

import type { AffiliateProduct, AffiliateContent } from '../../types/database.js';
import type {
  ChannelPolicy,
  ChannelRenderContext,
  WebsitePublishPayload,
  PayloadBuildOptions,
} from '../types.js';
import { getChannelPolicy } from '../channelPolicies.js';
import { HASHTAG_LIMITS } from '../constants.js';
import { log } from '../../utils/logger.js';

// ============================================
// Website Renderer
// ============================================

/**
 * Render content for Website channel
 */
export function renderWebsiteContent(
  product: AffiliateProduct,
  content: AffiliateContent,
  options?: PayloadBuildOptions
): WebsitePublishPayload {
  const policy = getChannelPolicy('website');
  const now = new Date().toISOString();

  // Prepare content components
  const title = prepareWebsiteTitle(product, content, policy);
  const body = prepareWebsiteBody(product, content, policy);
  const summary = prepareWebsiteSummary(content, policy);
  const keywords = prepareKeywords(content, product);
  const structuredData = prepareStructuredData(product, content);

  // Build the payload
  const payload: WebsitePublishPayload = {
    channel: 'website',
    productId: product.id,
    contentId: content.id,
    productUrl: product.product_url,
    productTitle: product.title,
    productImageUrl: product.image_url ?? undefined,
    title,
    body,
    summary,
    keywords,
    structuredData,
    source: {
      platform: product.platform,
      aiModel: content.ai_model ?? undefined,
      promptVersion: content.prompt_version ?? undefined,
      confidenceScore: content.confidence_score ?? undefined,
    },
    createdAt: now,
  };

  return payload;
}

/**
 * Prepare website SEO-optimized title
 * Website titles should be keyword-rich and descriptive
 */
function prepareWebsiteTitle(
  product: AffiliateProduct,
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string {
  const maxLength = policy?.contentLimits.titleMaxLength ?? 100;

  // Prefer rewritten title for SEO
  let title = content.rewritten_title ?? product.title;

  // Ensure it's descriptive enough for SEO
  if (title.length < 20 && product.category) {
    title = `${title} - ${product.category}`;
  }

  // Truncate if too long
  if (title.length > maxLength) {
    title = title.slice(0, maxLength - 3) + '...';
  }

  return title;
}

/**
 * Prepare website body content
 * Website needs structured, SEO-friendly content
 */
function prepareWebsiteBody(
  product: AffiliateProduct,
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string {
  const maxLength = policy?.contentLimits.descriptionMaxLength ?? 10000;

  // Use review content as primary body
  let body = content.review_content ?? '';

  // If no review content, generate from available fields
  if (!body) {
    body = generateBodyFromFields(product, content);
  }

  // Add product details section
  body = addProductDetails(body, product);

  // Truncate if too long
  if (body.length > maxLength) {
    body = body.slice(0, maxLength - 3) + '...';
  }

  return body;
}

/**
 * Prepare website summary/description
 * Used for meta description and excerpts
 */
function prepareWebsiteSummary(
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string | undefined {
  const maxLength = policy?.contentLimits.captionMaxLength ?? 500;

  // Use social caption as summary base
  let summary = content.social_caption ?? '';

  if (!summary && content.review_content) {
    // Extract first paragraph
    const paragraphs = content.review_content.split(/\n\n+/);
    summary = paragraphs[0] ?? '';
  }

  // Truncate to meta description length
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength - 3) + '...';
  }

  return summary || undefined;
}

/**
 * Extract keywords from content
 */
function prepareKeywords(
  content: AffiliateContent,
  product: AffiliateProduct
): string[] {
  const keywords = new Set<string>();

  // Add hashtags as keywords
  if (content.hashtags) {
    for (const tag of content.hashtags) {
      keywords.add(tag.replace(/^#/, ''));
    }
  }

  // Add product category
  if (product.category) {
    keywords.add(product.category);
  }

  // Add platform
  keywords.add(product.platform);

  // Extract keywords from title (simple approach)
  if (product.title) {
    const titleWords = product.title.toLowerCase().split(/\s+/);
    const meaningfulWords = titleWords.filter(
      (word) => word.length > 3 && !STOP_WORDS.has(word)
    );
    for (const word of meaningfulWords.slice(0, 5)) {
      keywords.add(word);
    }
  }

  return Array.from(keywords).slice(0, 20);
}

/**
 * Prepare JSON-LD structured data for SEO
 */
function prepareStructuredData(
  product: AffiliateProduct,
  content: AffiliateContent
): Record<string, unknown> {
  // Product schema.org structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: content.rewritten_title ?? product.title,
    description: content.review_content?.slice(0, 500) ?? product.original_description,
    image: product.image_url ?? undefined,
    offers: {
      '@type': 'Offer',
      url: product.product_url,
      priceCurrency: 'VND',
      price: product.price ?? undefined,
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.review_count ?? 1,
        }
      : undefined,
    seller: product.shop_name
      ? {
          '@type': 'Organization',
          name: product.shop_name,
        }
      : undefined,
  };

  // Add AI recommendation if available
  if (content.recommendation) {
    (structuredData as Record<string, unknown>).additionalProperty = [
      {
        '@type': 'PropertyValue',
        name: 'AI Recommendation',
        value: content.recommendation,
      },
    ];

    if (content.confidence_score) {
      (structuredData as Record<string, unknown>).additionalProperty = [
        ...((structuredData as Record<string, unknown>).additionalProperty as Array<unknown>),
        {
          '@type': 'PropertyValue',
          name: 'AI Confidence',
          value: content.confidence_score.toString(),
        },
      ];
    }
  }

  return structuredData;
}

/**
 * Generate body content from available fields
 */
function generateBodyFromFields(
  product: AffiliateProduct,
  content: AffiliateContent
): string {
  const parts: string[] = [];

  // Product description
  if (product.original_description) {
    parts.push(`## Giới thiệu sản phẩm\n${product.original_description}`);
  }

  // Add shop info
  if (product.shop_name) {
    parts.push(`\n## Thông tin cửa hàng\nSản phẩm được bán tại: ${product.shop_name}`);
  }

  // Add rating info
  if (product.rating) {
    let ratingText = `Đánh giá: ${product.rating}/5`;
    if (product.review_count) {
      ratingText += ` (${product.review_count} đánh giá)`;
    }
    parts.push(`\n${ratingText}`);
  }

  // Use social caption if available
  if (content.social_caption) {
    parts.push(`\n## Đánh giá\n${content.social_caption}`);
  }

  return parts.join('\n\n');
}

/**
 * Add product details section to body
 */
function addProductDetails(body: string, product: AffiliateProduct): string {
  const details: string[] = [];

  if (product.price) {
    details.push(`- **Giá**: ${product.price.toLocaleString('vi-VN')}₫`);
  }

  if (product.original_price) {
    details.push(`- **Giá gốc**: ${product.original_price.toLocaleString('vi-VN')}₫`);
  }

  if (product.sold_count) {
    details.push(`- **Đã bán**: ${product.sold_count.toLocaleString('vi-VN')}+`);
  }

  if (product.category) {
    details.push(`- **Danh mục**: ${product.category}`);
  }

  if (details.length === 0) {
    return body;
  }

  return `${body}\n\n## Thông tin chi tiết\n${details.join('\n')}`;
}

// ============================================
// Validation
// ============================================

/**
 * Validate website payload
 */
export function validateWebsitePayload(payload: WebsitePublishPayload): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!payload.title || payload.title.trim().length === 0) {
    errors.push('Title is required for website');
  }

  if (!payload.body || payload.body.trim().length === 0) {
    errors.push('Body content is required for website');
  }

  if (!payload.productUrl) {
    errors.push('Product URL is required for website');
  }

  // Length checks
  if (payload.title && payload.title.length > 100) {
    warnings.push('Title exceeds 100 characters for SEO');
  }

  if (payload.body && payload.body.length < 300) {
    warnings.push('Body content under 300 characters may not rank well');
  }

  // SEO best practices
  if (!payload.summary) {
    warnings.push('Summary/meta description not provided');
  }

  if (!payload.keywords || payload.keywords.length === 0) {
    warnings.push('No keywords provided for SEO');
  }

  if (!payload.structuredData) {
    warnings.push('No structured data provided for SEO');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Factory
// ============================================

/**
 * Create website renderer function
 */
export function createWebsiteRenderer() {
  return (
    context: ChannelRenderContext,
    options?: PayloadBuildOptions
  ): WebsitePublishPayload => {
    return renderWebsiteContent(context.product, context.content, options);
  };
}

// ============================================
// Constants
// ============================================

/**
 * Common stop words to exclude from keyword extraction
 */
const STOP_WORDS = new Set([
  'và', 'của', 'cho', 'với', 'trong', 'theo', 'từ', 'về', 'này', 'đó',
  'các', 'những', 'một', 'hai', 'ba', 'bốn', 'năm',
  'and', 'the', 'for', 'with', 'this', 'that', 'from',
]);

export default renderWebsiteContent;
