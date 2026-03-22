/**
 * TikTok Channel Renderer
 *
 * Builds TikTok-optimized publish payloads
 */

import type { AffiliateProduct, AffiliateContent } from '../../types/database.js';
import type {
  ChannelPolicy,
  ChannelRenderContext,
  TikTokPublishPayload,
  PayloadBuildOptions,
} from '../types.js';
import { getChannelPolicy } from '../channelPolicies.js';
import { HASHTAG_LIMITS } from '../constants.js';
import { log } from '../../utils/logger.js';

// ============================================
// TikTok Renderer
// ============================================

/**
 * Render content for TikTok channel
 */
export function renderTikTokContent(
  product: AffiliateProduct,
  content: AffiliateContent,
  options?: PayloadBuildOptions
): TikTokPublishPayload {
  const policy = getChannelPolicy('tiktok');
  const now = new Date().toISOString();

  // Extract and prepare content
  const title = prepareTikTokTitle(product, content, policy);
  const caption = prepareTikTokCaption(product, content, policy, options);
  const hashtags = prepareTikTokHashtags(content, policy);
  const mediaHints = prepareMediaHints(product);

  // Build the payload
  const payload: TikTokPublishPayload = {
    channel: 'tiktok',
    productId: product.id,
    contentId: content.id,
    productUrl: product.product_url,
    productTitle: product.title,
    productImageUrl: product.image_url ?? undefined,
    title,
    caption,
    hashtags,
    mediaHints,
    source: {
      platform: product.platform,
      aiModel: content.ai_model ?? undefined,
      promptVersion: content.prompt_version ?? undefined,
      confidenceScore: content.confidence_score ?? undefined,
    },
    createdAt: now,
  };

  // Add formatting rules
  if (policy?.formattingRules?.addDisclaimer) {
    payload.disclaimer = policy.formattingRules.disclaimerText ?? '#affiliate #recommendation';
  }

  // Add affiliate link if available (placeholder for future)
  // payload.affiliateLink = ...;

  return payload;
}

/**
 * Prepare TikTok-optimized title
 */
function prepareTikTokTitle(
  product: AffiliateProduct,
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string {
  const maxLength = policy?.contentLimits.titleMaxLength ?? 100;

  // Prefer rewritten title, fallback to original
  let title = content.rewritten_title ?? product.title;

  // Truncate if too long
  if (title.length > maxLength) {
    title = title.slice(0, maxLength - 3) + '...';
  }

  return title;
}

/**
 * Prepare TikTok-optimized caption
 * TikTok captions should be engaging, use emojis, and have a strong hook
 */
function prepareTikTokCaption(
  product: AffiliateProduct,
  content: AffiliateContent,
  policy: ChannelPolicy | null,
  options?: PayloadBuildOptions
): string {
  const maxLength = policy?.contentLimits.captionMaxLength ?? 2200;
  const truncate = options?.transformOptions?.truncate ?? false;

  let caption = content.social_caption ?? '';

  // If no social caption, generate from review content
  if (!caption && content.review_content) {
    caption = generateCaptionFromReview(content.review_content, maxLength);
  }

  // If still no caption, use product title
  if (!caption) {
    caption = product.title;
  }

  // Add product link at the end
  caption = ensureProductLink(caption, product.product_url, maxLength);

  // Truncate if needed
  if (truncate && caption.length > maxLength) {
    caption = caption.slice(0, maxLength - 10) + '...';
  }

  return caption;
}

/**
 * Prepare TikTok hashtags
 * TikTok works best with 3-5 relevant hashtags
 */
function prepareTikTokHashtags(
  content: AffiliateContent,
  policy: ChannelPolicy | null
): string[] {
  const maxCount = HASHTAG_LIMITS.tiktok.max;
  const recommendedCount = HASHTAG_LIMITS.tiktok.recommended;

  // Start with content hashtags
  let hashtags = content.hashtags?.slice(0, maxCount) ?? [];

  // Add channel-specific hashtags if needed
  const requiredHashtags = ['vietnam', 'fyp', 'shopping'];
  const minHashtags = Math.min(recommendedCount - hashtags.length, 2);

  for (const tag of requiredHashtags) {
    if (hashtags.length < recommendedCount && !hashtags.includes(tag)) {
      if (minHashtags > 0 || hashtags.length < recommendedCount) {
        hashtags.push(tag);
      }
    }
  }

  // Ensure hashtag format
  hashtags = hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

  return hashtags.slice(0, maxCount);
}

/**
 * Prepare media hints
 */
function prepareMediaHints(product: AffiliateProduct): TikTokPublishPayload['mediaHints'] {
  return {
    hasImage: !!product.image_url,
    imageUrl: product.image_url ?? undefined,
  };
}

/**
 * Generate a caption from review content
 */
function generateCaptionFromReview(reviewContent: string, maxLength: number): string {
  // Take first few sentences
  const sentences = reviewContent.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let caption = sentences.slice(0, 2).join('. ').trim();

  // Ensure it ends properly
  if (caption && !caption.endsWith('.')) {
    caption += '.';
  }

  // Truncate if too long
  if (caption.length > maxLength - 50) {
    caption = caption.slice(0, maxLength - 50) + '...';
  }

  return caption;
}

/**
 * Ensure product link is in caption
 */
function ensureProductLink(caption: string, productUrl: string, maxLength: number): string {
  // Check if URL is already in caption
  if (caption.toLowerCase().includes(productUrl.toLowerCase().slice(0, 30))) {
    return caption;
  }

  // Add link at the end
  const linkText = `\n\n🔗 Xem chi tiết: ${productUrl}`;

  if (caption.length + linkText.length > maxLength) {
    // Truncate caption to fit
    const availableSpace = maxLength - linkText.length - 10;
    caption = caption.slice(0, availableSpace) + '...';
  }

  return caption + linkText;
}

// ============================================
// Validation
// ============================================

/**
 * Validate TikTok payload
 */
export function validateTikTokPayload(payload: TikTokPublishPayload): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!payload.caption || payload.caption.trim().length === 0) {
    errors.push('Caption is required for TikTok');
  }

  if (!payload.productUrl) {
    errors.push('Product URL is required for TikTok');
  }

  // Length checks
  if (payload.title && payload.title.length > 100) {
    warnings.push('Title exceeds 100 characters');
  }

  if (payload.caption && payload.caption.length > 2200) {
    warnings.push('Caption exceeds 2200 characters');
  }

  if (payload.hashtags && payload.hashtags.length > 10) {
    warnings.push('More than 10 hashtags may reduce reach');
  }

  // Image recommendation
  if (!payload.mediaHints?.hasImage) {
    warnings.push('TikTok posts typically perform better with media');
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
 * Create TikTok renderer function
 */
export function createTikTokRenderer() {
  return (
    context: ChannelRenderContext,
    options?: PayloadBuildOptions
  ): TikTokPublishPayload => {
    return renderTikTokContent(context.product, context.content, options);
  };
}

export default renderTikTokContent;
