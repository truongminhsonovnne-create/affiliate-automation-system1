/**
 * Facebook Channel Renderer
 *
 * Builds Facebook-optimized publish payloads
 */

import type { AffiliateProduct, AffiliateContent } from '../../types/database.js';
import type {
  ChannelPolicy,
  ChannelRenderContext,
  FacebookPublishPayload,
  PayloadBuildOptions,
} from '../types.js';
import { getChannelPolicy } from '../channelPolicies.js';
import { HASHTAG_LIMITS } from '../constants.js';
import { log } from '../../utils/logger.js';

// ============================================
// Facebook Renderer
// ============================================

/**
 * Render content for Facebook channel
 */
export function renderFacebookContent(
  product: AffiliateProduct,
  content: AffiliateContent,
  options?: PayloadBuildOptions
): FacebookPublishPayload {
  const policy = getChannelPolicy('facebook');
  const now = new Date().toISOString();

  // Prepare content components
  const caption = prepareFacebookCaption(product, content, policy, options);
  const hashtags = prepareFacebookHashtags(content, policy);
  const shortReview = prepareShortReview(content, policy);
  const mediaHints = prepareMediaHints(product);

  // Build the payload
  const payload: FacebookPublishPayload = {
    channel: 'facebook',
    productId: product.id,
    contentId: content.id,
    productUrl: product.product_url,
    productTitle: product.title,
    productImageUrl: product.image_url ?? undefined,
    caption,
    hashtags,
    shortReview: shortReview ?? undefined,
    mediaHints,
    source: {
      platform: product.platform,
      aiModel: content.ai_model ?? undefined,
      promptVersion: content.prompt_version ?? undefined,
      confidenceScore: content.confidence_score ?? undefined,
    },
    createdAt: now,
  };

  // Add affiliate link if available (placeholder for future)
  // payload.affiliateLink = ...;

  return payload;
}

/**
 * Prepare Facebook-optimized caption
 * Facebook allows longer captions, supports line breaks, emojis
 */
function prepareFacebookCaption(
  product: AffiliateProduct,
  content: AffiliateContent,
  policy: ChannelPolicy | null,
  options?: PayloadBuildOptions
): string {
  const maxLength = policy?.contentLimits.captionMaxLength ?? 63206;
  const truncate = options?.transformOptions?.truncate ?? false;

  let caption = content.social_caption ?? '';

  // If no social caption, try review content
  if (!caption && content.review_content) {
    caption = generateCaptionFromReview(content.review_content);
  }

  // Fallback to product title
  if (!caption) {
    caption = product.title;
  }

  // Add product link
  caption = ensureProductLink(caption, product.product_url, maxLength);

  // Format for Facebook (better line breaks)
  caption = formatForFacebook(caption);

  // Truncate if needed
  if (truncate && caption.length > maxLength) {
    caption = caption.slice(0, maxLength - 10) + '...';
  }

  return caption;
}

/**
 * Prepare Facebook hashtags
 * Facebook supports up to 30 hashtags but 2-5 is recommended
 */
function prepareFacebookHashtags(
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string[] {
  const maxCount = HASHTAG_LIMITS.facebook.max;
  const recommendedCount = HASHTAG_LIMITS.facebook.recommended;

  // Start with content hashtags
  let hashtags = content.hashtags?.slice(0, maxCount) ?? [];

  // Add platform hashtags
  const platformHashtags = ['vietnam', 'shopping', 'deals'];
  const needed = recommendedCount - hashtags.length;

  for (const tag of platformHashtags) {
    if (hashtags.length < recommendedCount && !hashtags.includes(tag)) {
      if (needed > 0 || hashtags.length < recommendedCount) {
        hashtags.push(tag);
      }
    }
  }

  // Ensure hashtag format
  hashtags = hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  return hashtags.slice(0, maxCount);
}

/**
 * Prepare a short review snippet for Facebook
 * Facebook posts can include a short review quote
 */
function prepareShortReview(
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string | null {
  if (!content.review_content) {
    return null;
  }

  // Extract first meaningful paragraph
  const paragraphs = content.review_content.split(/\n\n+/).filter((p) => p.trim().length > 20);

  if (paragraphs.length === 0) {
    return null;
  }

  let review = paragraphs[0].trim();

  // Limit length for Facebook post
  const maxLength = 200;
  if (review.length > maxLength) {
    review = review.slice(0, maxLength - 3) + '...';
  }

  // Add quotation marks for visual appeal
  return `"${review}"`;
}

/**
 * Prepare media hints
 */
function prepareMediaHints(product: AffiliateProduct): FacebookPublishPayload['mediaHints'] {
  return {
    hasImage: !!product.image_url,
    imageUrl: product.image_url ?? undefined,
  };
}

/**
 * Generate a caption from review content
 */
function generateCaptionFromReview(reviewContent: string): string {
  // Take first few sentences
  const sentences = reviewContent.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let caption = sentences.slice(0, 3).join('. ').trim();

  // Ensure it ends properly
  if (caption && !caption.endsWith('.')) {
    caption += '.';
  }

  return caption;
}

/**
 * Ensure product link is in caption
 */
function ensureProductLink(caption: string, productUrl: string, maxLength: number): string {
  // Check if URL is already in caption
  const urlPart = productUrl.slice(0, 30).toLowerCase();
  if (caption.toLowerCase().includes(urlPart)) {
    return caption;
  }

  // Add link with nice formatting
  const linkText = `\n\n🛒 Xem chi tiết sản phẩm: ${productUrl}`;

  if (caption.length + linkText.length > maxLength) {
    // Truncate caption to fit
    const availableSpace = maxLength - linkText.length - 10;
    caption = caption.slice(0, availableSpace) + '...';
  }

  return caption + linkText;
}

/**
 * Format caption for Facebook
 * Facebook prefers proper line breaks and spacing
 */
function formatForFacebook(caption: string): string {
  // Ensure there's spacing after line breaks
  let formatted = caption.replace(/\n\n+/g, '\n\n');

  // Add emoji bullet points where appropriate
  if (!formatted.includes('•') && !formatted.includes('🛒') && !formatted.includes('⭐')) {
    // Could add formatting here if needed
  }

  return formatted;
}

// ============================================
// Validation
// ============================================

/**
 * Validate Facebook payload
 */
export function validateFacebookPayload(payload: FacebookPublishPayload): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!payload.caption || payload.caption.trim().length === 0) {
    errors.push('Caption is required for Facebook');
  }

  if (!payload.productUrl) {
    errors.push('Product URL is required for Facebook');
  }

  // Length checks
  if (payload.caption && payload.caption.length > 63206) {
    errors.push('Caption exceeds Facebook limit (63206 characters)');
  }

  if (payload.hashtags && payload.hashtags.length > 30) {
    warnings.push('More than 30 hashtags may look spammy');
  }

  // Best practices warnings
  if (payload.caption && payload.caption.length < 80) {
    warnings.push('Short captions may have lower engagement on Facebook');
  }

  if (payload.shortReview && payload.shortReview.length > 200) {
    warnings.push('Short review exceeds recommended length');
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
 * Create Facebook renderer function
 */
export function createFacebookRenderer() {
  return (
    context: ChannelRenderContext,
    options?: PayloadBuildOptions
  ): FacebookPublishPayload => {
    return renderFacebookContent(context.product, context.content, options);
  };
}

export default renderFacebookContent;
