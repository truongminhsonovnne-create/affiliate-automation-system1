/**
 * Publish Eligibility Module
 *
 * Evaluates whether content is eligible for publishing to each channel
 */

import type {
  PublishingChannel,
  PublishEligibilityCheck,
  PublishEligibilityResult,
  EligibilityOptions,
  ProductWithContent,
} from './types.js';
import { getChannelPolicy, getContentRequirements } from './channelPolicies.js';
import {
  QUALITY_THRESHOLDS,
  STALENESS_THRESHOLDS,
  getStalenessThresholdDays,
  DEDUPE_CONFIG,
} from './constants.js';
import { log, info, warn, error, debug } from '../utils/logger.js';
import type { PublishJobRepository } from './repositories/publishJobRepository.js';

// ============================================
// Eligibility Evaluator
// ============================================

/**
 * Evaluate publish eligibility for a product+content across multiple channels
 */
export async function evaluatePublishEligibility(
  productWithContent: ProductWithContent,
  channels: PublishingChannel[],
  options?: EligibilityOptions,
  publishJobRepository?: PublishJobRepository
): Promise<PublishEligibilityResult> {
  const { product, content } = productWithContent;
  const checks: PublishEligibilityCheck[] = [];
  const eligibleChannels: PublishingChannel[] = [];
  const ineligibleChannels: PublishingChannel[] = [];

  for (const channel of channels) {
    const check = await evaluateChannelEligibility(
      productWithContent,
      channel,
      options,
      publishJobRepository
    );
    checks.push(check);

    if (check.eligible) {
      eligibleChannels.push(channel);
    } else {
      ineligibleChannels.push(channel);
    }
  }

  return {
    productId: product.id,
    contentId: content?.id ?? '',
    checks,
    overallEligible: eligibleChannels.length > 0,
    eligibleChannels,
    ineligibleChannels,
  };
}

/**
 * Evaluate eligibility for a specific channel
 */
export async function evaluateChannelEligibility(
  productWithContent: ProductWithContent,
  channel: PublishingChannel,
  options?: EligibilityOptions,
  publishJobRepository?: PublishJobRepository
): Promise<PublishEligibilityCheck> {
  const { product, content } = productWithContent;
  const warnings: string[] = [];
  let score = 1.0;
  let eligible = true;
  let reason = 'Eligible for publishing';

  // 1. Check product URL
  if (!product.product_url || !isValidUrl(product.product_url)) {
    eligible = false;
    reason = 'Product URL is missing or invalid';
    score = 0;
  }

  // 2. Check content exists
  if (!content) {
    eligible = false;
    reason = 'No AI content available';
    score = 0;
  }

  // 3. Check content quality if content exists
  if (eligible && content) {
    const contentCheck = evaluateContentQuality(content, channel);
    warnings.push(...contentCheck.warnings);
    score *= contentCheck.score;

    if (!contentCheck.passed) {
      eligible = contentCheck.passed;
      reason = contentCheck.reason ?? 'Content quality below threshold';
    }
  }

  // 4. Check content length requirements
  if (eligible && content) {
    const lengthCheck = evaluateContentLength(content, channel);
    warnings.push(...lengthCheck.warnings);

    if (!lengthCheck.passed) {
      eligible = false;
      reason = lengthCheck.reason ?? 'Content does not meet length requirements';
      score *= 0.5;
    }
  }

  // 5. Check staleness
  if (eligible && !options?.skipStalenessCheck) {
    const stalenessCheck = evaluateStaleness(content, channel, options?.stalenessThresholdDays);
    warnings.push(...stalenessCheck.warnings);

    if (!stalenessCheck.passed) {
      warnings.push(stalenessCheck.reason ?? 'Content may be stale');
      // Staleness is a warning, not a hard failure
    }
  }

  // 6. Check for duplicate jobs
  if (eligible && content && !options?.skipDedupeCheck && publishJobRepository) {
    const dedupeCheck = await checkIdempotency(
      product.id,
      content.id,
      channel,
      publishJobRepository
    );

    if (!dedupeCheck.passed) {
      eligible = false;
      reason = dedupeCheck.reason ?? 'Equivalent job already exists';
      score *= 0.3;
    }
  }

  // 7. Check channel-specific requirements
  if (eligible && content) {
    const channelCheck = evaluateChannelRequirements(product, content, channel);
    warnings.push(...channelCheck.warnings);

    if (!channelCheck.passed) {
      eligible = false;
      reason = channelCheck.reason ?? 'Channel-specific requirements not met';
      score *= 0.5;
    }
  }

  return {
    channel,
    eligible,
    reason: eligible ? undefined : reason,
    warnings: warnings.length > 0 ? warnings : undefined,
    score,
  };
}

/**
 * Quick check if eligible for a specific channel
 */
export function isEligibleForPublishing(
  productWithContent: ProductWithContent,
  channel: PublishingChannel,
  options?: EligibilityOptions
): boolean {
  const { product, content } = productWithContent;

  // Quick checks first
  if (!product.product_url || !isValidUrl(product.product_url)) {
    return false;
  }

  if (!content) {
    return false;
  }

  // Get channel requirements
  const requirements = getContentRequirements(channel);

  // Check confidence score
  if (requirements.minConfidenceScore && content.confidence_score) {
    if (content.confidence_score < requirements.minConfidenceScore) {
      return false;
    }
  }

  // Check social caption requirement
  if (requirements.requireSocialCaption && !content.social_caption) {
    return false;
  }

  // Check review content requirement (for website)
  if (requirements.requireReviewContent && !content.review_content) {
    return false;
  }

  // Check rewritten title requirement (for website)
  if (requirements.requireRewrittenTitle && !content.rewritten_title) {
    return false;
  }

  // Check content length
  if (requirements.minContentLength) {
    const contentLength = content.social_caption?.length ?? content.review_content?.length ?? 0;
    if (contentLength < requirements.minContentLength) {
      return false;
    }
  }

  return true;
}

/**
 * Summarize eligibility results into a report
 */
export function summarizePublishEligibility(
  results: PublishEligibilityResult[]
): {
  totalProducts: number;
  eligibleProducts: number;
  totalChannels: number;
  eligibleChannels: number;
  ineligibleChannels: number;
  channelBreakdown: Record<PublishingChannel, { eligible: number; ineligible: number }>;
  commonReasons: { channel: PublishingChannel; reason: string; count: number }[];
} {
  let totalProducts = 0;
  let eligibleProducts = 0;
  let totalChannels = 0;
  let eligibleChannels = 0;
  let ineligibleChannels = 0;

  const channelBreakdown: Record<PublishingChannel, { eligible: number; ineligible: number }> = {
    tiktok: { eligible: 0, ineligible: 0 },
    facebook: { eligible: 0, ineligible: 0 },
    website: { eligible: 0, ineligible: 0 },
  };

  const reasonCounts: Map<string, { channel: PublishingChannel; count: number }> = new Map();

  for (const result of results) {
    totalProducts++;

    if (result.overallEligible) {
      eligibleProducts++;
    }

    for (const check of result.checks) {
      totalChannels++;

      if (check.eligible) {
        eligibleChannels++;
        channelBreakdown[check.channel].eligible++;
      } else {
        ineligibleChannels++;
        channelBreakdown[check.channel].ineligible++;

        if (check.reason) {
          const key = `${check.channel}:${check.reason}`;
          const existing = reasonCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            reasonCounts.set(key, { channel: check.channel, count: 1 });
          }
        }
      }
    }
  }

  // Get top reasons
  const sortedReasons = Array.from(reasonCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((r) => ({
      channel: r.channel,
      reason: Array.from(reasonCounts.entries())
        .find(([k]) => k.startsWith(r.channel))?.[0]
        .split(':')
        .slice(1)
        .join(':') ?? '',
      count: r.count,
    }));

  return {
    totalProducts,
    eligibleProducts,
    totalChannels,
    eligibleChannels,
    ineligibleChannels,
    channelBreakdown,
    commonReasons: sortedReasons,
  };
}

// ============================================
// Private Helper Functions
// ============================================

/**
 * Evaluate content quality
 */
function evaluateContentQuality(
  content: NonNullable<ProductWithContent['content']>,
  channel: PublishingChannel
): { passed: boolean; score: number; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  let score = 1.0;
  let passed = true;
  let reason: string | undefined;

  // Check confidence score
  if (content.confidence_score !== null && content.confidence_score !== undefined) {
    if (content.confidence_score < QUALITY_THRESHOLDS.MIN_CONFIDENCE_SCORE) {
      score *= 0.5;
      warnings.push(`Low confidence score: ${content.confidence_score.toFixed(2)}`);
    } else if (content.confidence_score < QUALITY_THRESHOLDS.RECOMMENDED_CONFIDENCE_SCORE) {
      score *= 0.8;
      warnings.push(`Below recommended confidence: ${content.confidence_score.toFixed(2)}`);
    }
  }

  // Check recommendation
  if (content.recommendation === 'not_recommended') {
    passed = false;
    reason = 'Content has "not_recommended" status';
    score *= 0.2;
  } else if (content.recommendation === 'neutral') {
    warnings.push('Content has "neutral" recommendation');
    score *= 0.7;
  }

  // Check if content fields are empty
  const hasAnyContent = content.rewritten_title || content.social_caption || content.review_content;
  if (!hasAnyContent) {
    passed = false;
    reason = 'No content fields available';
    score = 0;
  }

  return { passed, score, warnings, reason };
}

/**
 * Evaluate content length requirements
 */
function evaluateContentLength(
  content: NonNullable<ProductWithContent['content']>,
  channel: PublishingChannel
): { passed: boolean; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  let passed = true;
  let reason: string | undefined;

  const policy = getChannelPolicy(channel);
  if (!policy) {
    return { passed: true, warnings: [] };
  }

  // Check social caption for social channels
  if (channel === 'tiktok' || channel === 'facebook') {
    if (policy.contentRequirements.requireSocialCaption) {
      if (!content.social_caption) {
        passed = false;
        reason = 'Social caption is required';
      } else if (content.social_caption.length < QUALITY_THRESHOLDS.MIN_SOCIAL_CAPTION_LENGTH) {
        passed = false;
        reason = `Social caption too short (${content.social_caption.length} < ${QUALITY_THRESHOLDS.MIN_SOCIAL_CAPTION_LENGTH})`;
      }
    }
  }

  // Check review content for website
  if (channel === 'website') {
    if (policy.contentRequirements.requireReviewContent) {
      if (!content.review_content) {
        passed = false;
        reason = 'Review content is required for website';
      } else if (content.review_content.length < QUALITY_THRESHOLDS.MIN_REVIEW_CONTENT_LENGTH) {
        passed = false;
        reason = `Review content too short (${content.review_content.length} < ${QUALITY_THRESHOLDS.MIN_REVIEW_CONTENT_LENGTH})`;
      }
    }

    if (policy.contentRequirements.requireRewrittenTitle) {
      if (!content.rewritten_title) {
        passed = false;
        reason = 'Rewritten title is required for website';
      }
    }
  }

  return { passed, warnings, reason };
}

/**
 * Evaluate staleness
 */
function evaluateContentStaleness(
  content: NonNullable<ProductWithContent['content']>,
  channel: PublishingChannel,
  customThresholdDays?: number
): { passed: boolean; warnings: string[]; reason?: string } {
  const thresholdDays = customThresholdDays ?? getStalenessThresholdDays(channel);
  const contentCreatedAt = new Date(content.created_at);
  const now = new Date();
  const ageDays = Math.floor((now.getTime() - contentCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (ageDays > thresholdDays) {
    return {
      passed: true, // Staleness is a warning, not a failure
      warnings: [],
      reason: `Content is ${ageDays} days old (threshold: ${thresholdDays})`,
    };
  }

  return { passed: true, warnings: [] };
}

/**
 * Check idempotency - prevent duplicate jobs
 */
async function checkIdempotency(
  productId: string,
  contentId: string,
  channel: PublishingChannel,
  repository: PublishJobRepository
): Promise<{ passed: boolean; reason?: string }> {
  try {
    const existingJob = await repository.findEquivalentPendingOrScheduledJob(
      productId,
      contentId,
      channel
    );

    if (existingJob) {
      return {
        passed: false,
        reason: `Equivalent job already exists with status: ${existingJob.status}`,
      };
    }

    return { passed: true };
  } catch (err) {
    error({ err, productId, contentId, channel }, 'Error checking idempotency');
    return { passed: true }; // Allow on error
  }
}

/**
 * Evaluate channel-specific requirements
 */
function evaluateChannelRequirements(
  product: NonNullable<ProductWithContent['product']>,
  content: NonNullable<ProductWithContent['content']>,
  channel: PublishingChannel
): { passed: boolean; warnings: string[]; reason?: string } {
  const warnings: string[] = [];
  let passed = true;
  let reason: string | undefined;

  const requirements = getContentRequirements(channel);

  // Check product URL
  if (requirements.requireProductUrl) {
    if (!product.product_url || !isValidUrl(product.product_url)) {
      passed = false;
      reason = 'Valid product URL is required';
    }
  }

  // Check image
  if (requirements.requireImage && !product.image_url) {
    passed = false;
    reason = 'Product image is required';
  }

  return { passed, warnings, reason };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Simple URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Evaluate staleness (public export with different name to avoid conflict)
 */
function evaluateStaleness(
  content: NonNullable<ProductWithContent['content']>,
  channel: PublishingChannel,
  customThresholdDays?: number
): { passed: boolean; warnings: string[]; reason?: string } {
  return evaluateContentStaleness(content, channel, customThresholdDays);
}
