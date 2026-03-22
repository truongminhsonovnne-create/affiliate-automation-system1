/**
 * Publishing Layer Constants
 *
 * All default values, thresholds, and configuration constants
 * No magic numbers in business logic
 */

import type { PublishingChannel, ChannelPolicy, SchedulingMode } from './types.js';

// ============================================
// Channel Configuration
// ============================================

/**
 * Default priorities per channel
 */
export const CHANNEL_DEFAULT_PRIORITIES: Record<PublishingChannel, number> = {
  tiktok: 10,
  facebook: 5,
  website: 3,
};

/**
 * Batch size defaults
 */
export const BATCH_DEFAULTS = {
  DEFAULT_BATCH_SIZE: 50,
  MAX_BATCH_SIZE: 200,
  MIN_BATCH_SIZE: 1,
} as const;

// ============================================
// Scheduling Configuration
// ============================================

/**
 * Default scheduling modes
 */
export const SCHEDULING_DEFAULTS = {
  DEFAULT_MODE: 'slot_based' as SchedulingMode,
  DEFAULT_DELAY_MINUTES: 30,
  MIN_DELAY_MINUTES: 5,
  MAX_DELAY_MINUTES: 1440, // 24 hours
  DEFAULT_PRIORITY: 5,
  MIN_PRIORITY: 0,
  MAX_PRIORITY: 100,
} as const;

/**
 * Scheduling window configuration
 */
export const SCHEDULING_WINDOWS = {
  TIKTOK: {
    startHour: 8,
    endHour: 22,
    optimalSlots: ['09:00', '12:00', '18:00', '20:00'],
  },
  FACEBOOK: {
    startHour: 7,
    endHour: 23,
    optimalSlots: ['08:00', '10:00', '13:00', '17:00', '19:00'],
  },
  WEBSITE: {
    startHour: 0,
    endHour: 23,
    optimalSlots: [], // Website doesn't need specific slots
  },
} as const;

/**
 * Slot-based scheduling
 */
export const SLOT_CONFIG = {
  SLOT_DURATION_MINUTES: 30,
  MAX_JOBS_PER_SLOT: 10,
  SLOT_LOOKAHEAD_HOURS: 24,
} as const;

// ============================================
// Retry Configuration
// ============================================

/**
 * Retry defaults
 */
export const RETRY_DEFAULTS = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================
// Content Quality Thresholds
// ============================================

/**
 * Content quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  MIN_CONFIDENCE_SCORE: 0.6,
  RECOMMENDED_CONFIDENCE_SCORE: 0.75,
  MIN_SOCIAL_CAPTION_LENGTH: 20,
  RECOMMENDED_SOCIAL_CAPTION_LENGTH: 50,
  MIN_REVIEW_CONTENT_LENGTH: 100,
  RECOMMENDED_REVIEW_CONTENT_LENGTH: 300,
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 200,
} as const;

// ============================================
// Hashtag Configuration
// ============================================

/**
 * Hashtag limits per channel
 */
export const HASHTAG_LIMITS: Record<PublishingChannel, { max: number; recommended: number }> = {
  tiktok: { max: 10, recommended: 5 },
  facebook: { max: 30, recommended: 10 },
  website: { max: 20, recommended: 8 },
};

// ============================================
// Caption/Title Length Thresholds
// ============================================

/**
 * Content length limits per channel
 */
export const CONTENT_LENGTH_LIMITS: Record<PublishingChannel, {
  title: { min: number; max: number };
  caption: { min: number; max: number };
  body?: { min: number; max: number };
}> = {
  tiktok: {
    title: { min: 10, max: 100 },
    caption: { min: 20, max: 2200 },
  },
  facebook: {
    title: { min: 10, max: 150 },
    caption: { min: 20, max: 63206 },
  },
  website: {
    title: { min: 20, max: 100 },
    caption: { min: 50, max: 500 },
    body: { min: 300, max: 10000 },
  },
};

// ============================================
// Channel Content Limits
// ============================================

/**
 * Channel content limits (referenced by policy)
 */
export const CHANNEL_CONTENT_LIMITS: Record<PublishingChannel, {
  titleMaxLength: number;
  captionMaxLength: number;
  hashtagMaxCount: number;
  descriptionMaxLength?: number;
}> = {
  tiktok: {
    titleMaxLength: 100,
    captionMaxLength: 2200,
    hashtagMaxCount: 10,
    descriptionMaxLength: 2200,
  },
  facebook: {
    titleMaxLength: 150,
    captionMaxLength: 63206,
    hashtagMaxCount: 30,
    descriptionMaxLength: 63206,
  },
  website: {
    titleMaxLength: 100,
    captionMaxLength: 500,
    hashtagMaxCount: 20,
    descriptionMaxLength: 10000,
  },
};

// ============================================
// Deduplication Configuration
// ============================================

/**
 * Deduplication configuration
 */
export const DEDUPE_CONFIG = {
  ENABLED: true,
  CHECK_PENDING_JOBS: true,
  CHECK_SCHEDULED_JOBS: true,
  CHECK_PUBLISHED_JOBS: false,
  SKIP_IF_EQUIVALENT_PENDING: true,
  UPDATE_IF_BETTER_PAYLOAD: true,
} as const;

// ============================================
// Staleness Configuration
// ============================================

/**
 * Stale content thresholds
 */
export const STALENESS_THRESHOLDS = {
  DEFAULT_DAYS: 7,
  TIKTOK_DAYS: 3,
  FACEBOOK_DAYS: 5,
  WEBSITE_DAYS: 14,
} as const;

/**
 * Get staleness threshold for a channel
 */
export function getStalenessThresholdDays(channel: PublishingChannel): number {
  const thresholdMap: Record<PublishingChannel, number> = {
    tiktok: STALENESS_THRESHOLDS.TIKTOK_DAYS,
    facebook: STALENESS_THRESHOLDS.FACEBOOK_DAYS,
    website: STALENESS_THRESHOLDS.WEBSITE_DAYS,
  };
  return thresholdMap[channel] ?? STALENESS_THRESHOLDS.DEFAULT_DAYS;
}

// ============================================
// Logging Configuration
// ============================================

/**
 * Logging configuration
 */
export const LOG_CONFIG = {
  LOG_ELIGIBILITY_DECISIONS: true,
  LOG_PAYLOAD_BUILDS: true,
  LOG_SCHEDULING_DECISIONS: true,
  LOG_PERSISTENCE_OPERATIONS: true,
  LOG_BATCH_PROGRESS: true,
} as const;

// ============================================
// Default Channel Policies
// ============================================

/**
 * Default channel policies
 */
export const DEFAULT_CHANNEL_POLICIES: ChannelPolicy[] = [
  {
    channel: 'tiktok',
    contentLimits: {
      titleMaxLength: 100,
      captionMaxLength: 2200,
      hashtagMaxCount: 10,
    },
    schedulingConstraints: {
      minDelayMinutes: 15,
      maxDelayMinutes: 480,
      allowImmediate: false,
      preferredTimes: ['09:00', '12:00', '18:00', '20:00'],
      timezone: 'Asia/Ho_Chi_Minh',
    },
    contentRequirements: {
      requireProductUrl: true,
      requireImage: false,
      requireSocialCaption: true,
      requireReviewContent: false,
      minConfidenceScore: 0.6,
      minContentLength: 20,
    },
    ctaRules: {
      allowed: true,
      style: 'hashtag',
      maxLength: 100,
    },
    formattingRules: {
      hashtagPrefix: '#',
      addDisclaimer: true,
      disclaimerText: '#affiliate #recommendation',
    },
  },
  {
    channel: 'facebook',
    contentLimits: {
      titleMaxLength: 150,
      captionMaxLength: 63206,
      hashtagMaxCount: 30,
    },
    schedulingConstraints: {
      minDelayMinutes: 10,
      maxDelayMinutes: 720,
      allowImmediate: true,
      preferredTimes: ['08:00', '10:00', '13:00', '17:00', '19:00'],
      timezone: 'Asia/Ho_Chi_Minh',
    },
    contentRequirements: {
      requireProductUrl: true,
      requireImage: false,
      requireSocialCaption: true,
      requireReviewContent: false,
      minConfidenceScore: 0.5,
      minContentLength: 20,
    },
    ctaRules: {
      allowed: true,
      style: 'link',
      maxLength: 200,
    },
    formattingRules: {
      hashtagPrefix: '#',
      addDisclaimer: false,
    },
  },
  {
    channel: 'website',
    contentLimits: {
      titleMaxLength: 100,
      captionMaxLength: 500,
      hashtagMaxCount: 20,
      descriptionMaxLength: 10000,
    },
    schedulingConstraints: {
      minDelayMinutes: 0,
      maxDelayMinutes: 1440,
      allowImmediate: true,
      preferredTimes: [],
      timezone: 'Asia/Ho_Chi_Minh',
    },
    contentRequirements: {
      requireProductUrl: true,
      requireImage: true,
      requireSocialCaption: false,
      requireReviewContent: true,
      minConfidenceScore: 0.6,
      minContentLength: 300,
      requireRewrittenTitle: true,
    },
    ctaRules: {
      allowed: true,
      style: 'link',
      maxLength: 500,
    },
    formattingRules: {
      addDisclaimer: false,
    },
  },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Get default priority for a channel
 */
export function getDefaultPriority(channel: PublishingChannel): number {
  return CHANNEL_DEFAULT_PRIORITIES[channel] ?? SCHEDULING_DEFAULTS.DEFAULT_PRIORITY;
}

/**
 * Get content length limits for a channel
 */
export function getContentLengthLimits(channel: PublishingChannel) {
  return CONTENT_LENGTH_LIMITS[channel] ?? CONTENT_LENGTH_LIMITS.website;
}

/**
 * Get hashtag limits for a channel
 */
export function getHashtagLimits(channel: PublishingChannel) {
  return HASHTAG_LIMITS[channel];
}

/**
 * Get scheduling window for a channel
 */
export function getSchedulingWindow(channel: PublishingChannel) {
  const windowMap: Record<PublishingChannel, typeof SCHEDULING_WINDOWS.TIKTOK> = {
    tiktok: SCHEDULING_WINDOWS.TIKTOK,
    facebook: SCHEDULING_WINDOWS.FACEBOOK,
    website: SCHEDULING_WINDOWS.WEBSITE,
  };
  return windowMap[channel];
}
