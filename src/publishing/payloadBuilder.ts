/**
 * Payload Builder Module
 *
 * Orchestrates building channel-specific publish payloads
 */

import type {
  PublishingChannel,
  ChannelPublishPayload,
  PublishPayloadBuildResult,
  PayloadBuildOptions,
  ProductWithContent,
} from './types.js';
import { renderTikTokContent, validateTikTokPayload } from './renderers/tiktokRenderer.js';
import { renderFacebookContent, validateFacebookPayload } from './renderers/facebookRenderer.js';
import { renderWebsiteContent, validateWebsitePayload } from './renderers/websiteRenderer.js';
import { validateAgainstChannelPolicy } from './channelPolicies.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Payload Builder
// ============================================

/**
 * Build publish payload for a specific channel
 */
export function buildPublishPayload(
  productWithContent: ProductWithContent,
  channel: PublishingChannel,
  options?: PayloadBuildOptions
): PublishPayloadBuildResult {
  const { product, content } = productWithContent;

  try {
    // Validate content exists
    if (!content) {
      return {
        success: false,
        channel,
        error: 'No AI content available for this product',
        warnings: ['Content is missing'],
      };
    }

    // Validate against channel policy first
    if (options?.validateAgainstPolicy !== false) {
      const validation = validateAgainstChannelPolicy(channel, {
        title: content.rewritten_title,
        caption: content.social_caption,
        reviewContent: content.review_content,
        hashtags: content.hashtags,
      }, {
        truncate: options?.transformOptions?.truncate ?? false,
      });

      if (!validation.valid) {
        return {
          success: false,
          channel,
          error: validation.errors.join('; '),
          warnings: validation.warnings,
        };
      }
    }

    // Build channel-specific payload
    let payload: ChannelPublishPayload;

    switch (channel) {
      case 'tiktok':
        payload = renderTikTokContent(product, content, options);
        break;

      case 'facebook':
        payload = renderFacebookContent(product, content, options);
        break;

      case 'website':
        payload = renderWebsiteContent(product, content, options);
        break;

      default:
        return {
          success: false,
          channel,
          error: `Unsupported channel: ${channel}`,
        };
    }

    // Validate the built payload
    const validationResult = validatePayloadByChannel(payload);
    if (!validationResult.valid) {
      warn({ channel, errors: validationResult.errors }, 'Payload validation warnings');
    }

    return {
      success: true,
      channel,
      payload,
      warnings: [
        ...(validationResult.warnings ?? []),
        ...(options?.includeMetadata === false ? [] : []),
      ],
    };
  } catch (err) {
    error({ err, channel, productId: product.id }, 'Failed to build publish payload');
    return {
      success: false,
      channel,
      error: err instanceof Error ? err.message : 'Unknown error building payload',
    };
  }
}

/**
 * Build publish payloads for multiple channels
 */
export function buildPublishPayloadsForChannels(
  productWithContent: ProductWithContent,
  channels: PublishingChannel[],
  options?: PayloadBuildOptions
): Map<PublishingChannel, PublishPayloadBuildResult> {
  const results = new Map<PublishingChannel, PublishPayloadBuildResult>();

  for (const channel of channels) {
    const result = buildPublishPayload(productWithContent, channel, options);
    results.set(channel, result);
  }

  return results;
}

/**
 * Build payloads for a batch of products
 */
export function buildBatchPublishPayloads(
  productsWithContent: ProductWithContent[],
  channels: PublishingChannel[],
  options?: PayloadBuildOptions
): Map<string, Map<PublishingChannel, PublishPayloadBuildResult>> {
  const allResults = new Map<string, Map<PublishingChannel, PublishPayloadBuildResult>>();

  for (const productWithContent of productsWithContent) {
    const productResults = buildPublishPayloadsForChannels(
      productWithContent,
      channels,
      options
    );
    allResults.set(productWithContent.product.id, productResults);
  }

  return allResults;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate payload based on channel
 */
function validatePayloadByChannel(
  payload: ChannelPublishPayload
): { valid: boolean; errors: string[]; warnings: string[] } {
  switch (payload.channel) {
    case 'tiktok':
      return validateTikTokPayload(payload);

    case 'facebook':
      return validateFacebookPayload(payload);

    case 'website':
      return validateWebsitePayload(payload);

    default:
      return {
        valid: true,
        errors: [],
        warnings: [`Unknown channel: ${(payload as { channel: string }).channel}`],
      };
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get payload size estimate (for logging/monitoring)
 */
export function estimatePayloadSize(payload: ChannelPublishPayload): number {
  const json = JSON.stringify(payload);
  return new Blob([json]).size;
}

/**
 * Check if payload has required media
 */
export function payloadHasMedia(payload: ChannelPublishPayload): boolean {
  switch (payload.channel) {
    case 'tiktok':
      return payload.mediaHints?.hasImage ?? false;

    case 'facebook':
      return payload.mediaHints?.hasImage ?? false;

    case 'website':
      return !!payload.productImageUrl;

    default:
      return false;
  }
}

/**
 * Get payload summary for logging
 */
export function getPayloadSummary(
  payload: ChannelPublishPayload
): Record<string, unknown> {
  // Type-safe access to channel-specific fields
  const hasTitle = 'title' in payload && !!payload.title;
  const hasCaption = 'caption' in payload && !!payload.caption;
  const hasBody = 'body' in payload && !!payload.body;

  return {
    channel: payload.channel,
    productId: payload.productId,
    hasTitle,
    captionLength: hasCaption ? (payload as { caption?: string }).caption?.length ?? 0 : 0,
    bodyLength: hasBody ? (payload as { body?: string }).body?.length ?? 0 : 0,
    hashtagCount: payload.hashtags?.length ?? 0,
    hasMedia: payloadHasMedia(payload),
  };
}
