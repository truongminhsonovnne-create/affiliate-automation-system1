/**
 * Post-Launch Review Builder
 * Builds initial post-launch review plans
 */

import {
  FIRST_POST_LAUNCH_REVIEW_HOURS,
  SECOND_POST_LAUNCH_REVIEW_HOURS,
  FIRST_WEEK_REVIEW_FREQUENCY_DAYS,
} from '../constants.js';

export interface PostLaunchReviewPack {
  launchKey: string;
  generatedAt: Date;
  watchWindowStart: Date;
  watchWindowEnd: Date;
  reviews: PostLaunchReview[];
}

export interface PostLaunchReview {
  reviewId: string;
  reviewType: string;
  scheduledAt: Date;
  focusAreas: string[];
  participants: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

/**
 * Build post-launch review pack
 */
export async function buildPostLaunchReviewPack(
  launchKey: string,
  watchWindowStart: Date,
  watchWindowEnd: Date
): Promise<PostLaunchReviewPack> {
  const reviews = buildWatchWindowReviewPack(watchWindowStart, watchWindowEnd);

  return {
    launchKey,
    generatedAt: new Date(),
    watchWindowStart,
    watchWindowEnd,
    reviews,
  };
}

/**
 * Build watch window review pack
 */
export function buildWatchWindowReviewPack(
  windowStart: Date,
  windowEnd: Date
): PostLaunchReview[] {
  const reviews: PostLaunchReview[] = [];

  // Initial stabilization review - 24 hours
  const firstReview = new Date(windowStart.getTime() + FIRST_POST_LAUNCH_REVIEW_HOURS * 60 * 60 * 1000);
  if (firstReview < windowEnd) {
    reviews.push({
      reviewId: generateReviewId(),
      reviewType: 'initial_stabilization',
      scheduledAt: firstReview,
      focusAreas: [
        'error_rates',
        'latency',
        'public_flow',
        'critical_errors',
        'shopee_stability',
        'tiktok_stability',
      ],
      participants: ['ops-team', 'platform-team', 'product-team'],
      status: 'scheduled',
    });
  }

  // Second review - 72 hours
  const secondReview = new Date(windowStart.getTime() + SECOND_POST_LAUNCH_REVIEW_HOURS * 60 * 60 * 1000);
  if (secondReview < windowEnd) {
    reviews.push({
      reviewId: generateReviewId(),
      reviewType: 'stability_assessment',
      scheduledAt: secondReview,
      focusAreas: [
        'trend_analysis',
        'quality_metrics',
        'commercial_performance',
        'user_feedback',
      ],
      participants: ['ops-team', 'commercial-team', 'product-team'],
      status: 'scheduled',
    });
  }

  // Daily reviews during first week
  for (let day = 1; day <= 7; day++) {
    const dailyReview = new Date(windowStart.getTime() + day * 24 * 60 * 60 * 1000);
    if (dailyReview < windowEnd) {
      reviews.push({
        reviewId: generateReviewId(),
        reviewType: 'daily_check',
        scheduledAt: dailyReview,
        focusAreas: [
          'operational_metrics',
          'guardrails',
          'support_tickets',
        ],
        participants: ['ops-team'],
        status: 'scheduled',
      });
    }
  }

  return reviews;
}

/**
 * Build initial stabilization review pack
 */
export function buildInitialStabilizationReviewPack(
  launchKey: string
): PostLaunchReviewPack {
  const now = new Date();
  const watchWindowStart = now;
  const watchWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  return {
    launchKey,
    generatedAt: now,
    watchWindowStart,
    watchWindowEnd,
    reviews: [
      {
        reviewId: generateReviewId(),
        reviewType: 'initial_stabilization',
        scheduledAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        focusAreas: [
          'error_rates',
          'latency',
          'public_flow_health',
          'critical_errors',
        ],
        participants: ['ops-oncall', 'platform-oncall'],
        status: 'scheduled',
      },
    ],
  };
}

function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
