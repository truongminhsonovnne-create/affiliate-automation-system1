/**
 * Founder Cockpit Constants
 */

export const COCKPIT_WINDOWS = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
} as const;

export const TREND_THRESHOLDS = {
  SIGNIFICANT_UP: 0.15,
  SIGNIFICANT_DOWN: -0.15,
  MODERATE: 0.1,
} as const;

export const HEALTH_THRESHOLDS = {
  HEALTHY_MIN: 0.8,
  WARNING_MIN: 0.6,
  CRITICAL_MIN: 0.4,
} as const;

export const DECISION_QUEUE_LIMITS = {
  MAX_PENDING: 20,
  CRITICAL_DISPLAY: 10,
} as const;

export const BLOCKER_THRESHOLDS = {
  CRITICAL_AGE_DAYS: 1,
  HIGH_AGE_DAYS: 3,
  MEDIUM_AGE_DAYS: 7,
} as const;

export const FOLLOWUP_AGE_THRESHOLDS = {
  STALE_DAYS: 7,
  CRITICAL_STALE_DAYS: 3,
} as const;

export const SNAPSHOT_CADENCE = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export const SECTION_PRIORITY = {
  GROWTH: 1,
  QUALITY: 2,
  COMMERCIAL: 3,
  RELEASE: 4,
  PRODUCT_OPS: 5,
} as const;
