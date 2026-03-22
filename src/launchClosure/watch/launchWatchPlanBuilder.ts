/**
 * Launch Watch Plan Builder
 * Builds post-launch watch plans
 */

import type {
  LaunchWatchPlan,
  LaunchWatchPlanInput,
} from '../types.js';

import {
  DEFAULT_WATCH_WINDOW_HOURS,
  FIRST_POST_LAUNCH_REVIEW_HOURS,
  SECOND_POST_LAUNCH_REVIEW_HOURS,
} from '../constants.js';

export interface WatchPlanBuildInput {
  launchReviewId?: string;
  watchWindowHours?: number;
  includeCriticalSignals?: boolean;
  includeEscalationTriggers?: boolean;
  includeReviewSchedule?: boolean;
}

/**
 * Build launch watch plan
 */
export async function buildLaunchWatchPlan(
  input: WatchPlanBuildInput
): Promise<LaunchWatchPlan> {
  const watchWindowHours = input.watchWindowHours ?? DEFAULT_WATCH_WINDOW_HOURS;
  const now = new Date();

  const watchWindowStart = now;
  const watchWindowEnd = new Date(now.getTime() + watchWindowHours * 60 * 60 * 1000);

  const planPayload: Record<string, unknown> = {};

  // Build critical signals
  if (input.includeCriticalSignals !== false) {
    planPayload.criticalSignals = buildCriticalSignalsWatchSet();
  }

  // Build escalation triggers
  if (input.includeEscalationTriggers !== false) {
    planPayload.escalationTriggers = buildEscalationTriggerSet();
  }

  // Build review schedule
  if (input.includeReviewSchedule !== false) {
    planPayload.reviewSchedule = buildPostLaunchReviewSchedule(watchWindowStart, watchWindowEnd);
  }

  return {
    id: generateWatchPlanId(),
    launchReviewId: input.launchReviewId,
    planStatus: 'draft',
    watchWindowStart,
    watchWindowEnd,
    planPayload,
    createdAt: new Date(),
  };
}

/**
 * Build critical signals watch set
 */
export function buildCriticalSignalsWatchSet(): string[] {
  return [
    'error_rate_threshold_breach',
    'latency_p99_threshold_breach',
    'conversion_rate_drop',
    'revenue_drop',
    'public_flow_failure',
    'shopee_production_issue',
    'tiktok_preview_issue',
    'critical_risk_escalation',
  ];
}

/**
 * Build escalation trigger set
 */
export function buildEscalationTriggerSet(): Array<{
  trigger: string;
  notifyWithinMinutes: number;
  escalateToLevel: string;
}> {
  return [
    {
      trigger: 'critical_error_rate_breach',
      notifyWithinMinutes: 15,
      escalateToLevel: 'director',
    },
    {
      trigger: 'high_error_rate_breach',
      notifyWithinMinutes: 60,
      escalateToLevel: 'manager',
    },
    {
      trigger: 'conversion_drop_critical',
      notifyWithinMinutes: 30,
      escalateToLevel: 'director',
    },
    {
      trigger: 'revenue_drop_critical',
      notifyWithinMinutes: 30,
      escalateToLevel: 'director',
    },
    {
      trigger: 'public_flow_outage',
      notifyWithinMinutes: 15,
      escalateToLevel: 'director',
    },
    {
      trigger: 'shopee_production_issue',
      notifyWithinMinutes: 15,
      escalateToLevel: 'director',
    },
  ];
}

/**
 * Build post-launch review schedule
 */
export function buildPostLaunchReviewSchedule(
  windowStart: Date,
  windowEnd: Date
): Array<{
  reviewAt: Date;
  reviewType: string;
  focusAreas: string[];
}> {
  const schedule: Array<{
    reviewAt: Date;
    reviewType: string;
    focusAreas: string[];
  }> = [];

  // First review - 24 hours
  const firstReview = new Date(windowStart.getTime() + FIRST_POST_LAUNCH_REVIEW_HOURS * 60 * 60 * 1000);
  if (firstReview < windowEnd) {
    schedule.push({
      reviewAt: firstReview,
      reviewType: 'initial_stabilization',
      focusAreas: ['error_rates', 'latency', 'public_flow', 'critical_errors'],
    });
  }

  // Second review - 72 hours
  const secondReview = new Date(windowStart.getTime() + SECOND_POST_LAUNCH_REVIEW_HOURS * 60 * 60 * 1000);
  if (secondReview < windowEnd) {
    schedule.push({
      reviewAt: secondReview,
      reviewType: 'stability_assessment',
      focusAreas: ['trend_analysis', 'quality_metrics', 'commercial_performance'],
    });
  }

  // Daily reviews during first week
  for (let day = 1; day <= 7; day++) {
    const dailyReview = new Date(windowStart.getTime() + day * 24 * 60 * 60 * 1000);
    if (dailyReview < windowEnd) {
      schedule.push({
        reviewAt: dailyReview,
        reviewType: 'daily_check',
        focusAreas: ['operational_metrics', 'guardrails', 'user_feedback'],
      });
    }
  }

  // Weekly reviews after first week
  for (let week = 2; week <= Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (7 * 24 * 60 * 60 * 1000)); week++) {
    const weeklyReview = new Date(windowStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    if (weeklyReview < windowEnd) {
      schedule.push({
        reviewAt: weeklyReview,
        reviewType: 'weekly_review',
        focusAreas: ['trend_analysis', 'platform_comparison', 'strategic_alignment'],
      });
    }
  }

  return schedule;
}

function generateWatchPlanId(): string {
  return `watch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
