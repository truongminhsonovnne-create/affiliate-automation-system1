/**
 * Channel Policies Module
 *
 * Defines publishing policies per channel
 */

import type { PublishingChannel, ChannelPolicy } from './types.js';
import { DEFAULT_CHANNEL_POLICIES, getDefaultPriority } from './constants.js';
import { log, info, warn, error, debug } from '../utils/logger.js';

// ============================================
// Policy Registry
// ============================================

/**
 * In-memory policy registry
 */
const policyRegistry: Map<PublishingChannel, ChannelPolicy> = new Map();

/**
 * Initialize registry with default policies
 */
function initializeRegistry(): void {
  if (policyRegistry.size === 0) {
    for (const policy of DEFAULT_CHANNEL_POLICIES) {
      policyRegistry.set(policy.channel, policy);
    }
  }
}

// Ensure initialization
initializeRegistry();

// ============================================
// Policy Access Functions
// ============================================

/**
 * Get policy for a specific channel
 */
export function getChannelPolicy(channel: PublishingChannel): ChannelPolicy | null {
  const policy = policyRegistry.get(channel);

  if (!policy) {
    warn({ channel }, 'No policy found for channel, using default');
    return getDefaultPolicy(channel);
  }

  return policy;
}

/**
 * Get all channel policies
 */
export function getAllChannelPolicies(): ChannelPolicy[] {
  return Array.from(policyRegistry.values());
}

/**
 * Register a custom channel policy
 */
export function registerChannelPolicy(policy: ChannelPolicy): void {
  policyRegistry.set(policy.channel, policy);
  info({ channel: policy.channel }, 'Registered custom channel policy');
}

/**
 * Clear a channel policy (use with caution)
 */
export function clearChannelPolicy(channel: PublishingChannel): boolean {
  const deleted = policyRegistry.delete(channel);
  if (deleted) {
    info({ channel }, 'Cleared channel policy');
  }
  return deleted;
}

// ============================================
// Policy Validation
// ============================================

/**
 * Validate content against channel policy
 */
export function validateAgainstChannelPolicy(
  channel: PublishingChannel,
  content: {
    title?: string | null;
    caption?: string | null;
    reviewContent?: string | null;
    hashtags?: string[] | null;
  },
  options?: {
    strict?: boolean;
    truncate?: boolean;
  }
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  truncated?: {
    title?: string;
    caption?: string;
  };
} {
  const policy = getChannelPolicy(channel);

  if (!policy) {
    return {
      valid: false,
      errors: [`No policy found for channel: ${channel}`],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const truncated: { title?: string; caption?: string } = {};

  // Validate title length
  if (content.title) {
    const titleLength = content.title.length;
    if (titleLength > policy.contentLimits.titleMaxLength) {
      if (options?.truncate) {
        truncated.title = content.title.slice(0, policy.contentLimits.titleMaxLength);
        warnings.push(`Title truncated from ${titleLength} to ${policy.contentLimits.titleMaxLength} chars`);
      } else {
        errors.push(
          `Title exceeds max length (${titleLength} > ${policy.contentLimits.titleMaxLength})`
        );
      }
    }
  }

  // Validate caption length
  if (content.caption) {
    const captionLength = content.caption.length;
    if (captionLength > policy.contentLimits.captionMaxLength) {
      if (options?.truncate) {
        truncated.caption = content.caption.slice(0, policy.contentLimits.captionMaxLength);
        warnings.push(`Caption truncated from ${captionLength} to ${policy.contentLimits.captionMaxLength} chars`);
      } else {
        errors.push(
          `Caption exceeds max length (${captionLength} > ${policy.contentLimits.captionMaxLength})`
        );
      }
    }
  }

  // Validate hashtag count
  if (content.hashtags && content.hashtags.length > policy.contentLimits.hashtagMaxCount) {
    warnings.push(
      `Hashtag count exceeds limit (${content.hashtags.length} > ${policy.contentLimits.hashtagMaxCount})`
    );
  }

  // Check content requirements
  if (policy.contentRequirements.requireSocialCaption && !content.caption) {
    errors.push('Social caption is required but not provided');
  }

  if (policy.contentRequirements.requireReviewContent && !content.reviewContent) {
    errors.push('Review content is required but not provided');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    truncated: Object.keys(truncated).length > 0 ? truncated : undefined,
  };
}

// ============================================
// Default Policy Factory
// ============================================

/**
 * Get default policy for a channel (fallback)
 */
function getDefaultPolicy(channel: PublishingChannel): ChannelPolicy {
  return {
    channel,
    contentLimits: {
      titleMaxLength: 100,
      captionMaxLength: 2200,
      hashtagMaxCount: 10,
    },
    schedulingConstraints: {
      minDelayMinutes: 10,
      maxDelayMinutes: 480,
      allowImmediate: true,
      timezone: 'Asia/Ho_Chi_Minh',
    },
    contentRequirements: {
      requireProductUrl: true,
      requireImage: false,
      requireSocialCaption: false,
      requireReviewContent: false,
    },
    ctaRules: {
      allowed: true,
      style: 'link',
    },
  };
}

// ============================================
// Policy Helpers
// ============================================

/**
 * Check if a channel supports immediate scheduling
 */
export function allowsImmediateScheduling(channel: PublishingChannel): boolean {
  const policy = getChannelPolicy(channel);
  return policy?.schedulingConstraints.allowImmediate ?? true;
}

/**
 * Get minimum delay for a channel
 */
export function getMinDelayMinutes(channel: PublishingChannel): number {
  const policy = getChannelPolicy(channel);
  return policy?.schedulingConstraints.minDelayMinutes ?? 10;
}

/**
 * Get maximum delay for a channel
 */
export function getMaxDelayMinutes(channel: PublishingChannel): number {
  const policy = getChannelPolicy(channel);
  return policy?.schedulingConstraints.maxDelayMinutes ?? 480;
}

/**
 * Get priority for a channel
 */
export function getChannelPriority(channel: PublishingChannel): number {
  return getDefaultPriority(channel);
}

/**
 * Get content requirements for a channel
 */
export function getContentRequirements(channel: PublishingChannel) {
  const policy = getChannelPolicy(channel);
  return policy?.contentRequirements ?? {
    requireProductUrl: true,
    requireImage: false,
    requireSocialCaption: false,
    requireReviewContent: false,
  };
}

/**
 * Get CTA rules for a channel
 */
export function getCTARules(channel: PublishingChannel) {
  const policy = getChannelPolicy(channel);
  return policy?.ctaRules ?? {
    allowed: true,
    style: 'link' as const,
  };
}

/**
 * Get formatting rules for a channel
 */
export function getFormattingRules(channel: PublishingChannel) {
  const policy = getChannelPolicy(channel);
  return policy?.formattingRules;
}
